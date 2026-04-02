'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { useSession } from 'next-auth/react';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { buildSystemPrompt } from '@/lib/build-system-prompt';
import { useDailyLimit } from '@/hooks/use-daily-limit';
import { LIMITS } from '@/lib/limits';
import { useFileAttachment, DOCX_MIME, type PendingFileMeta } from '@/hooks/use-file-attachment';
import { useFilePreview } from '@/hooks/use-file-preview';
import { useChatSession } from '@/hooks/use-chat-session';
import { FilePreviewModal } from './file-preview-modal';
import { ChatMessageList } from './chat-message-list';
import { AlertTriangle } from 'lucide-react';
import { ChatInputComposer } from './chat-input-composer';

interface ChatInterfaceProps {
  sessionId: string | null;
}

export function ChatInterface({ sessionId: initialSessionId }: ChatInterfaceProps) {
  const locale = useLocale();
  const router = useRouter();
  // 세션 ID는 ref로 관리 — 렌더링 없이 onFinish 클로저에서 읽기/쓰기
  const sessionIdRef = React.useRef<string | null>(initialSessionId);
  // stop() 호출 시 onFinish에서 DB 저장/블록 추출을 스킵하기 위한 플래그
  const isStoppedRef = React.useRef(false);

  const { data: session } = useSession();
  const { input, resetInput, pendingMessages, clearPendingMessages, scrollToMessageId } = useChatStore();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [cooldownActive, setCooldownActive] = React.useState(false);
  const t = useTranslations('chatInterface');
  const tFile = useTranslations('fileUpload');
  const tLimits = useTranslations('limits');
  const dailyLimit = useDailyLimit();

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
          const fileMeta = pendingFileMetaRef.current;
          return {
            systemPrompt: buildSystemPrompt(blocks),
            pivotIndex,
            fileMetadata: fileMeta
              ? { fileName: fileMeta.fileName, fileType: fileMeta.fileType }
              : undefined,
          };
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const errorSaveFailed = t('errorSaveFailed');
  const { handleFinish } = useChatSession({
    sessionIdRef,
    locale,
    router,
    onError: setApiError,
    errorSaveFailed,
  });

  // 세션 복원
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialMessages = pendingMessages.length > 0 ? (pendingMessages as any[]) : undefined;
  React.useEffect(() => {
    if (pendingMessages.length > 0) clearPendingMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── useChat ──────────────────────────────────────────────

  const { messages, sendMessage, status, stop } = useChat({
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

      // 사용자가 중단한 경우 DB 저장/블록 추출 스킵
      if (isStoppedRef.current) {
        isStoppedRef.current = false;
        return;
      }

      setCooldownActive(true);
      setTimeout(() => setCooldownActive(false), LIMITS.MESSAGE_COOLDOWN_MS);

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

      // tool part에서 추출된 블록 수집 (saveMemoryBlock tool use)
      // AI SDK는 tool part type을 "tool-{toolName}" 형식으로 생성함
      type ExtractedBlock = { label: string; content: string; attachFile?: boolean; category?: string };
      const extractedBlocks: ExtractedBlock[] = [];
      for (const part of message.parts) {
        if (
          part.type === 'tool-saveMemoryBlock' &&
          'input' in part &&
          part.input != null
        ) {
          extractedBlocks.push(part.input as ExtractedBlock);
        }
      }

      void handleFinish({ userMessage, assistantMessage, userMessageId, fileMeta, filesForDb, extractedBlocks });
    },
  });

  const handleStop = () => {
    isStoppedRef.current = true;
    stop();
  };

  const isLoading = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;

  // ── 제한 계산 ──────────────────────────────────────────────
  const userMessageCount = messages.filter((m) => m.role === 'user').length;
  const isSessionMaxReached = userMessageCount >= LIMITS.SESSION_MAX_MESSAGES;
  const isSessionWarnReached = userMessageCount >= LIMITS.SESSION_WARN_MESSAGES;

  const limitError: string | null = isSessionMaxReached
    ? tLimits('sessionMax')
    : dailyLimit.isMaxReached
      ? tLimits('dailyMax')
      : null;

  const limitBanner: string | null = !limitError && isSessionWarnReached
    ? tLimits('sessionWarn')
    : !limitError && dailyLimit.isWarnReached
      ? tLimits('dailyWarn', { remaining: dailyLimit.remaining })
      : null;

  const isInputDisabled = cooldownActive || isSessionMaxReached || dailyLimit.isMaxReached;

  // lastResetAt 변경 시 pivotIndex 갱신
  const lastResetAt = useBlockStore((state) => state.lastResetAt);
  React.useEffect(() => {
    if (lastResetAt === null) return;
    useBlockStore.getState().setPivotIndex(messages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResetAt]);

  // 출처 이동 후 특정 메시지로 스크롤
  React.useEffect(() => {
    if (!scrollToMessageId) return;
    const el = document.querySelector(`[data-message-id="${scrollToMessageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      useChatStore.getState().setScrollToMessageId(null);
    }
  }, [scrollToMessageId, messages]);

  const { previewFile, previewOpen, messageFilesMap, openPreview, closePreview, pendingSentFilesRef } =
    useFilePreview(messages);

  // ── 전송 ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    isStoppedRef.current = false;

    const trimmedInput = input.trim();
    const readyFiles = attachedFiles.filter((f) => f.status === 'ready');
    const hasUploadingFiles = attachedFiles.some((f) => f.status === 'uploading');

    if ((!trimmedInput && readyFiles.length === 0) || isLoading || isInputDisabled) return;
    if (hasUploadingFiles) { setApiError(tFile('uploading')); return; }
    if (input.length > LIMITS.MESSAGE_MAX_CHARS) return;

    dailyLimit.increment();
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

  const baseInputComposer = (
    <ChatInputComposer
      attachedFiles={attachedFiles}
      onRemoveFile={removeFile}
      onFileInputChange={handleFileInputChange}
      onPaste={handlePaste}
      onSubmit={handleSubmit}
      onStop={handleStop}
      isLoading={isLoading}
      apiError={apiError}
      onErrorClose={() => setApiError(null)}
      charLimit={LIMITS.MESSAGE_MAX_CHARS}
      isDisabled={isInputDisabled}
    />
  );

  // 인사말 화면용 — 제한 배너 포함
  const inputComposerWithBanners = (
    <ChatInputComposer
      attachedFiles={attachedFiles}
      onRemoveFile={removeFile}
      onFileInputChange={handleFileInputChange}
      onPaste={handlePaste}
      onSubmit={handleSubmit}
      onStop={handleStop}
      isLoading={isLoading}
      apiError={apiError}
      onErrorClose={() => setApiError(null)}
      charLimit={LIMITS.MESSAGE_MAX_CHARS}
      limitBanner={limitBanner}
      limitError={limitError}
      isDisabled={isInputDisabled}
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
          {/* 제한 배너 — border-t 위에 독립적으로 표시 */}
          {(limitError ?? limitBanner) && (
            <div className="px-6 pt-4 pb-6">
              <div className="max-w-3xl mx-auto">
                {limitError ? (
                  <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">{limitError}</p>
                  </div>
                ) : limitBanner ? (
                  <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-300">{limitBanner}</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}
          <div className="px-3 py-4 sm:px-6 border-t border-white/10 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="max-w-3xl mx-auto">
              {baseInputComposer}
              <p className="text-xs text-gray-500 text-center mt-3">{t('disclaimer')}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 px-3 sm:px-6">
          <div className="h-full max-w-3xl mx-auto flex flex-col items-center justify-center pb-16">
            <div className="text-center text-gray-400 mb-8">
              <p className="text-4xl font-medium text-white mb-3">{t('greeting')}</p>
              <p className="text-base">{t('greetingSubtitle')}</p>
            </div>
            <div className="w-full">
              {inputComposerWithBanners}
              <p className="text-xs text-gray-500 text-center mt-3">{t('disclaimer')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
