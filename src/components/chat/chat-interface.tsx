'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { useSession } from 'next-auth/react';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import { Block } from '@/types/block';
import { useTranslations } from 'next-intl';
import { buildSystemPrompt } from '@/lib/build-system-prompt';
import { useFileAttachment, DOCX_MIME, type PendingFileMeta } from '@/hooks/use-file-attachment';
import { useFilePreview } from '@/hooks/use-file-preview';
import { FilePreviewModal } from './file-preview-modal';
import { ChatMessageList } from './chat-message-list';
import { ChatInputComposer } from './chat-input-composer';

type ExtractedBlock = {
  label: string;
  content: string;
  type?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  geminiFileUri?: string;
  geminiExpiresAt?: string | null;
  category?: string;
};

type ExtractBlocksResponse = {
  blocks?: ExtractedBlock[];
};

const MAX_BLOCKS_PER_CYCLE = 1;

export function ChatInterface() {
  const { data: session } = useSession();
  const { input, resetInput, setSessionId, pendingMessages, clearPendingMessages } = useChatStore();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const t = useTranslations('chatInterface');
  const tFile = useTranslations('fileUpload');

  const {
    attachedFiles,
    handleFileInputChange,
    handlePaste,
    removeFile,
    clearFiles,
    pendingFileMetaRef,
  } = useFileAttachment({ onError: setApiError });

  // DB 저장용 파일 메타 ref (pendingSentFilesRef는 useEffect에서 먼저 소비되므로 별도 관리)
  const pendingFilesForDbRef = React.useRef<Array<{ fileName: string; fileType: string; storagePath: string }> | undefined>(undefined);

  // Transport는 한 번만 생성
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: () => {
          const { blocks, pivotIndex } = useBlockStore.getState();
          return { systemPrompt: buildSystemPrompt(blocks), pivotIndex };
        },
      }),
    []
  );

  // 블록 자동 추출
  const applyExtractedBlocks = React.useCallback(async (extractedBlocks: ExtractedBlock[], sourceSessionId: string | null) => {
    const { blocks: currentBlocks, appendBlock } = useBlockStore.getState();

    const existingKeys = new Set(
      currentBlocks.map((b) => `${b.label.trim().toLowerCase()}::${b.content.trim().toLowerCase()}`)
    );

    let addedCount = 0;
    for (const extracted of extractedBlocks) {
      if (addedCount >= MAX_BLOCKS_PER_CYCLE) break;

      const label = extracted.label.trim();
      const content = extracted.content.trim();
      if (!label || !content) continue;

      const blockKey = `${label.toLowerCase()}::${content.toLowerCase()}`;
      if (existingKeys.has(blockKey)) continue;

      const { blocks } = useBlockStore.getState();
      const order = blocks.length;

      try {
        const blockData: Record<string, unknown> = {
          type: extracted.type ?? 'data',
          label, content, order,
        };
        if (extracted.fileUrl) blockData.fileUrl = extracted.fileUrl;
        if (extracted.fileName) blockData.fileName = extracted.fileName;
        if (extracted.fileType) blockData.fileType = extracted.fileType;
        if (extracted.fileSize !== undefined) blockData.fileSize = extracted.fileSize;
        if (extracted.geminiFileUri) blockData.geminiFileUri = extracted.geminiFileUri;
        if (extracted.geminiExpiresAt !== undefined) blockData.geminiExpiresAt = extracted.geminiExpiresAt;
        if (sourceSessionId) blockData.sourceSessionId = sourceSessionId;
        if (extracted.category) blockData.category = extracted.category;

        const res = await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(blockData),
        });
        if (!res.ok) continue;
        const dbBlock = (await res.json()) as Block;
        appendBlock(dbBlock);
        existingKeys.add(blockKey);
        addedCount += 1;
      } catch {
        // 블록 생성 실패는 채팅 UX에 영향 주지 않음
      }
    }
  }, []);

  // 세션 복원
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialMessages = pendingMessages.length > 0 ? (pendingMessages as any[]) : undefined;
  React.useEffect(() => {
    if (pendingMessages.length > 0) clearPendingMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── useChat ──────────────────────────────────────────────

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages,
    onError: (error) => {
      let errorCode: string | null = null;
      try {
        const parsed = JSON.parse(error.message) as { error?: string };
        errorCode = parsed.error ?? null;
      } catch {
        // JSON이 아닌 경우 raw message 사용
      }
      if (
        errorCode === 'QUOTA_EXCEEDED' ||
        error.message.includes('429') ||
        error.message.toLowerCase().includes('quota')
      ) {
        setApiError(t('errorQuota'));
      } else {
        setApiError(t('errorGeneral'));
      }
    },
    onFinish: ({ message, messages: allMessages }) => {
      if (message.role !== 'assistant') return;

      const fileMeta = pendingFileMetaRef.current;
      pendingFileMetaRef.current = undefined;
      const filesForDb = pendingFilesForDbRef.current;
      pendingFilesForDbRef.current = undefined;

      const assistantMessage = message.parts
        .filter(isTextUIPart)
        .map((part) => part.text)
        .join('')
        .trim();

      if (!assistantMessage) return;

      const latestUserMessage = [...allMessages]
        .reverse()
        .find((chatMessage) => chatMessage.role === 'user');

      const userMessage = latestUserMessage
        ? latestUserMessage.parts.filter(isTextUIPart).map((part) => part.text).join('').trim()
        : '';
      // AI SDK가 클라이언트에서 생성한 user 메시지 ID → DB에 clientId로 저장
      const userMessageId = latestUserMessage?.id;

      if (!userMessage) return;

      void (async () => {
        // 1. 세션 생성 또는 기존 세션 id 사용
        let currentSessionId = useChatStore.getState().sessionId;
        if (!currentSessionId) {
          try {
            const res = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: userMessage.slice(0, 40) }),
            });
            if (res.ok) {
              const created = (await res.json()) as { id: string };
              currentSessionId = created.id;
              setSessionId(currentSessionId);
            }
          } catch { /* 세션 생성 실패 무시 */ }
        }

        // 2. 메시지 저장
        if (currentSessionId) {
          try {
            await fetch(`/api/sessions/${currentSessionId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userMessage, assistantMessage, userMessageId, userMessageFiles: filesForDb }),
            });
          } catch { /* 메시지 저장 실패 무시 */ }
        }

        // 3. 블록 자동 추출
        const { blocks: currentBlocks } = useBlockStore.getState();
        try {
          const response = await fetch('/api/blocks/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage,
              assistantMessage,
              existingBlocks: currentBlocks.map((b) => ({ label: b.label, content: b.content })),
              ...(fileMeta ? { fileMetadata: fileMeta } : {}),
            }),
          });
          if (!response.ok) return;
          const data = (await response.json()) as ExtractBlocksResponse;
          if (!data.blocks?.length) return;
          await applyExtractedBlocks(data.blocks.slice(0, MAX_BLOCKS_PER_CYCLE), currentSessionId ?? null);
        } catch { /* 블록 추출 실패 무시 */ }
      })();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;

  // lastResetAt 변경 시 pivotIndex 갱신
  const lastResetAt = useBlockStore((state) => state.lastResetAt);
  React.useEffect(() => {
    if (lastResetAt === null) return;
    useBlockStore.getState().setPivotIndex(messages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResetAt]);

  const { previewFile, previewOpen, messageFilesMap, openPreview, closePreview, pendingSentFilesRef } =
    useFilePreview(messages);

  // ── 전송 ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    const readyFiles = attachedFiles.filter((f) => f.status === 'ready');
    const hasUploadingFiles = attachedFiles.some((f) => f.status === 'uploading');

    if ((!trimmedInput && readyFiles.length === 0) || isLoading) return;
    if (hasUploadingFiles) { setApiError(tFile('uploading')); return; }

    setApiError(null);
    resetInput();

    // 블록 추출용 파일 메타 캡처 (PDF/docx 우선)
    const mainFile =
      readyFiles.find((f) => f.file.type === 'application/pdf' || f.file.type === DOCX_MIME) ??
      readyFiles[0];

    if (mainFile) {
      pendingFileMetaRef.current = {
        storagePath: mainFile.storagePath,
        fileName: mainFile.file.name,
        fileType: mainFile.file.type,
        fileSize: mainFile.file.size,
        ...(mainFile.geminiFileUri ? { geminiFileUri: mainFile.geminiFileUri } : {}),
        ...(mainFile.geminiExpiresAt ? { geminiExpiresAt: mainFile.geminiExpiresAt } : {}),
      } satisfies PendingFileMeta;
    }

    // 메시지 파일 미리보기 매핑용 캡처
    if (readyFiles.length > 0) {
      const fileMetas = readyFiles.map((f) => ({
        fileName: f.file.name,
        fileType: f.file.type,
        storagePath: f.storagePath,
        base64: f.base64,
      }));
      pendingSentFilesRef.current = fileMetas;
      // DB 저장용 (base64 제외)
      pendingFilesForDbRef.current = fileMetas.map(({ fileName, fileType, storagePath }) => ({
        fileName,
        fileType,
        storagePath,
      }));
    }

    // 파일 파트 구성
    const fileParts: Array<{ type: 'file'; url: string; mediaType: string }> = [];
    const docxTexts: string[] = [];

    for (const f of readyFiles) {
      if (f.base64) {
        fileParts.push({ type: 'file', url: f.base64, mediaType: f.file.type });
      } else if (f.geminiFileUri) {
        fileParts.push({ type: 'file', url: f.geminiFileUri, mediaType: f.file.type });
      } else if (f.extractedText) {
        docxTexts.push(`[첨부 문서: ${f.file.name}]\n${f.extractedText}`);
      }
    }

    clearFiles();

    const docxPrefix = docxTexts.length > 0 ? `${docxTexts.join('\n\n')}\n\n` : '';
    const textContent = `${docxPrefix}${trimmedInput}`;

    if (fileParts.length > 0) {
      await sendMessage({ parts: [...fileParts, { type: 'text', text: textContent }] });
    } else {
      await sendMessage({ text: textContent });
    }
  };

  // ── JSX ──────────────────────────────────────────────────

  const inputComposer = (
    <ChatInputComposer
      attachedFiles={attachedFiles}
      onRemoveFile={removeFile}
      onFileInputChange={handleFileInputChange}
      onPaste={handlePaste}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      apiError={apiError}
      onErrorClose={() => setApiError(null)}
    />
  );

  return (
    <div className="flex flex-col h-full bg-[#252830]">
      <FilePreviewModal
        file={previewFile}
        open={previewOpen}
        onOpenChange={(open) => { if (!open) closePreview(); }}
      />

      {hasMessages ? (
        <>
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            messageFilesMap={messageFilesMap}
            onFileClick={openPreview}
            session={session}
          />
          <div className="px-6 py-4 border-t border-white/10">
            <div className="max-w-3xl mx-auto">
              {inputComposer}
              <p className="text-xs text-gray-500 text-center mt-3">{t('disclaimer')}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 px-6">
          <div className="h-full max-w-3xl mx-auto flex flex-col items-center justify-center pb-16">
            <div className="text-center text-gray-400 mb-8">
              <p className="text-4xl font-medium text-white mb-3">{t('greeting')}</p>
              <p className="text-base">{t('greetingSubtitle')}</p>
            </div>
            <div className="w-full">
              {inputComposer}
              <p className="text-xs text-gray-500 text-center mt-3">{t('disclaimer')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
