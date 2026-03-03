'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import {
  Loader2,
  Plus,
  Settings,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useBlockStore, BLOCK_COLORS } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import { Block } from '@/types/block';
import { MessageContent } from './message-content';
import { FileAttachmentPreview, type AttachedFile } from './file-attachment-preview';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { buildSystemPrompt } from '@/lib/build-system-prompt';
import { compressImage, fileToBase64 } from '@/lib/compress-image';
import {
  uploadImage,
  uploadPdf,
  uploadDocx,
  FILE_LIMITS,
  ACCEPTED_IMAGE_TYPES,
} from '@/lib/file-upload';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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
};

type ExtractBlocksResponse = {
  blocks?: ExtractedBlock[];
};

type PendingFileMeta = {
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  geminiFileUri?: string;
  geminiExpiresAt?: string;
};

const MAX_BLOCKS_PER_CYCLE = 1;

export function ChatInterface() {
  const { data: session } = useSession();
  const { input, setInput, resetInput, setSessionId, pendingMessages, clearPendingMessages } = useChatStore();
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([]);
  const t = useTranslations('chatInterface');
  const tFile = useTranslations('fileUpload');
  const locale = useLocale();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 파일 메타데이터를 onFinish까지 유지하기 위한 ref (handleSubmit 시 캡처)
  const pendingFileMetaRef = React.useRef<PendingFileMeta | undefined>(undefined);

  // attachedFiles를 ref로 미러링 (addFile의 비동기 클로저에서 최신값 읽기 위해)
  const attachedFilesRef = React.useRef<AttachedFile[]>([]);
  React.useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  // lastResetAt이 바뀐 직후 렌더의 messages.length를 pivotIndex로 저장
  const lastResetAt = useBlockStore((state) => state.lastResetAt);
  React.useEffect(() => {
    if (lastResetAt === null) return;
    useBlockStore.getState().setPivotIndex(messages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResetAt]);

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

  // ── 파일 처리 ──────────────────────────────────────────────

  const addFile = React.useCallback(async (file: File) => {
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isPdf = file.type === 'application/pdf';
    const isDocx = file.type === DOCX_MIME;

    if (!isImage && !isPdf && !isDocx) {
      setApiError(tFile('errorType'));
      return;
    }
    if (isImage && file.size > FILE_LIMITS.image) { setApiError(tFile('errorSizeImage')); return; }
    if (isPdf && file.size > FILE_LIMITS.pdf) { setApiError(tFile('errorSizePdf')); return; }
    if (isDocx && file.size > FILE_LIMITS.docx) { setApiError(tFile('errorSizeDocx')); return; }

    // PDF는 1개 제한
    if (isPdf && attachedFilesRef.current.some(f => f.file.type === 'application/pdf')) {
      setApiError(tFile('errorPdfLimit'));
      return;
    }

    const id = crypto.randomUUID();
    const preview = isImage ? URL.createObjectURL(file) : '';
    setAttachedFiles(prev => [...prev, { id, file, preview, storagePath: '', status: 'uploading' }]);

    try {
      if (isImage) {
        const compressed = await compressImage(file);
        const base64 = await fileToBase64(compressed);
        const result = await uploadImage(compressed, base64);
        setAttachedFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'ready', storagePath: result.storagePath, base64: result.base64 } : f
        ));
      } else if (isPdf) {
        const result = await uploadPdf(file);
        setAttachedFiles(prev => prev.map(f =>
          f.id === id ? {
            ...f, status: 'ready', storagePath: result.storagePath,
            geminiFileUri: result.geminiFileUri,
            geminiExpiresAt: result.geminiExpiresAt ?? undefined,
          } : f
        ));
      } else {
        const result = await uploadDocx(file);
        setAttachedFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'ready', storagePath: result.storagePath, extractedText: result.extractedText } : f
        ));
      }
    } catch {
      setAttachedFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'error' } : f
      ));
      setApiError(tFile('uploadError'));
    }
  }, [tFile]);

  const handleFileInputChange = React.useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) {
      await addFile(file);
    }
    e.target.value = '';
  }, [addFile]);

  const handlePaste = React.useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          await addFile(file);
        }
      }
    }
  }, [addFile]);

  // ── 블록 생성 ──────────────────────────────────────────────

  const applyExtractedBlocks = React.useCallback(async (extractedBlocks: ExtractedBlock[]) => {
    const { blocks: currentBlocks, appendBlock } = useBlockStore.getState();

    const existingKeys = new Set(
      currentBlocks.map(b => `${b.label.trim().toLowerCase()}::${b.content.trim().toLowerCase()}`)
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
      const color = BLOCK_COLORS[blocks.length % BLOCK_COLORS.length];
      const order = blocks.length;

      try {
        const blockData: Record<string, unknown> = {
          type: extracted.type ?? 'data',
          label, content, color, order,
        };
        if (extracted.fileUrl) blockData.fileUrl = extracted.fileUrl;
        if (extracted.fileName) blockData.fileName = extracted.fileName;
        if (extracted.fileType) blockData.fileType = extracted.fileType;
        if (extracted.fileSize !== undefined) blockData.fileSize = extracted.fileSize;
        if (extracted.geminiFileUri) blockData.geminiFileUri = extracted.geminiFileUri;
        if (extracted.geminiExpiresAt !== undefined) blockData.geminiExpiresAt = extracted.geminiExpiresAt;

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

  // ── 세션 복원 ──────────────────────────────────────────────

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

      // 파일 메타데이터 캡처 후 ref 초기화
      const fileMeta = pendingFileMetaRef.current;
      pendingFileMetaRef.current = undefined;

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
        ? latestUserMessage.parts
            .filter(isTextUIPart)
            .map((part) => part.text)
            .join('')
            .trim()
        : '';

      if (!userMessage) return;

      void (async () => {
        // ── 1. 세션 생성 또는 기존 세션 id 사용 ──
        let currentSessionId = useChatStore.getState().sessionId;
        if (!currentSessionId) {
          try {
            const title = userMessage.slice(0, 40);
            const res = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title }),
            });
            if (res.ok) {
              const created = (await res.json()) as { id: string };
              currentSessionId = created.id;
              setSessionId(currentSessionId);
            }
          } catch {
            // 세션 생성 실패해도 채팅 UX에 영향 없음
          }
        }

        // ── 2. 메시지 저장 ──
        if (currentSessionId) {
          try {
            await fetch(`/api/sessions/${currentSessionId}/messages`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userMessage, assistantMessage }),
            });
          } catch {
            // 메시지 저장 실패해도 채팅 UX에 영향 없음
          }
        }

        // ── 3. 블록 자동 추출 ──
        const { blocks: currentBlocks } = useBlockStore.getState();
        const existingBlocks = currentBlocks.map((block) => ({
          label: block.label,
          content: block.content,
        }));

        try {
          const response = await fetch('/api/blocks/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userMessage,
              assistantMessage,
              existingBlocks,
              ...(fileMeta ? { fileMetadata: fileMeta } : {}),
            }),
          });

          if (!response.ok) return;

          const data = (await response.json()) as ExtractBlocksResponse;
          if (!data.blocks || data.blocks.length === 0) return;

          await applyExtractedBlocks(data.blocks.slice(0, MAX_BLOCKS_PER_CYCLE));
        } catch {
          // Silent fail: memory extraction should not affect chat UX.
        }
      })();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;

  // ── 입력 핸들러 ──────────────────────────────────────────

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedInput = input.trim();
    const readyFiles = attachedFiles.filter(f => f.status === 'ready');
    const hasUploadingFiles = attachedFiles.some(f => f.status === 'uploading');

    if ((!trimmedInput && readyFiles.length === 0) || isLoading) return;
    if (hasUploadingFiles) {
      // 업로드 완료 전 전송 방지 (에러 배너 표시)
      setApiError(tFile('uploading'));
      return;
    }

    setApiError(null);
    resetInput();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // 파일 메타데이터 캡처 (PDF/docx 우선, 없으면 이미지)
    const mainFile =
      readyFiles.find(f => f.file.type === 'application/pdf' || f.file.type === DOCX_MIME)
      ?? readyFiles[0];

    if (mainFile) {
      pendingFileMetaRef.current = {
        storagePath: mainFile.storagePath,
        fileName: mainFile.file.name,
        fileType: mainFile.file.type,
        fileSize: mainFile.file.size,
        ...(mainFile.geminiFileUri ? { geminiFileUri: mainFile.geminiFileUri } : {}),
        ...(mainFile.geminiExpiresAt ? { geminiExpiresAt: mainFile.geminiExpiresAt } : {}),
      };
    }

    // 첨부 파일 파트 구성
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

    // 미리보기 URL 해제
    attachedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setAttachedFiles([]);

    const docxPrefix = docxTexts.length > 0 ? `${docxTexts.join('\n\n')}\n\n` : '';
    const textContent = `${docxPrefix}${trimmedInput}`;

    if (fileParts.length > 0) {
      await sendMessage({
        parts: [
          ...fileParts,
          { type: 'text', text: textContent },
        ],
      });
    } else {
      await sendMessage({ text: textContent });
    }
  };

  // ── 스크롤 ──────────────────────────────────────────────

  const scrollRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: locale === 'en',
    });

  // ── 렌더 헬퍼 ──────────────────────────────────────────

  const renderErrorBanner = () =>
    apiError ? (
      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
        <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-red-300 flex-1">{apiError}</p>
        <button
          onClick={() => setApiError(null)}
          className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : null;

  const renderInputComposer = (inputClassName?: string) => (
    <form onSubmit={handleSubmit} className={cn('relative', inputClassName)}>
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="bg-[#1a1d21] rounded-2xl border border-white/10 px-4 pt-4 pb-3">
        {/* 첨부 파일 미리보기 */}
        <FileAttachmentPreview
          files={attachedFiles}
          onRemove={(id) => {
            setAttachedFiles(prev => {
              const removed = prev.find(f => f.id === id);
              if (removed?.preview) URL.revokeObjectURL(removed.preview);
              return prev.filter(f => f.id !== id);
            });
          }}
        />

        {/* 텍스트 입력 영역 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={t('placeholder')}
          rows={1}
          className="w-full bg-transparent text-white placeholder:text-gray-500 resize-none outline-none text-sm leading-relaxed mb-3 max-h-48 overflow-y-auto"
        />

        {/* 하단 아이콘 행 */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );

  // ── JSX ──────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#252830]">
      {hasMessages ? (
        <>
          {/* Messages Area */}
          <div ref={scrollRef} className="flex-1 px-6 overflow-y-auto">
            <div className="py-6 space-y-6 max-w-3xl mx-auto">
              {messages.map((m, index) => {
                const textContent = m.parts
                  .filter(isTextUIPart)
                  .map((part) => part.text)
                  .join('');

                const isUser = m.role === 'user';
                const messageTime = new Date();

                return (
                  <div key={m.id}>
                    {index === 0 && (
                      <div className="flex justify-center mb-6">
                        <span className="text-xs text-gray-500 bg-[#1a1d21] px-3 py-1 rounded-full">
                          {t('today')}, {formatTime(messageTime)}
                        </span>
                      </div>
                    )}

                    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
                      {/* Avatar */}
                      {isUser ? (
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={session?.user?.image || ''} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white">
                            {session?.user?.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">B</span>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className={cn('flex flex-col max-w-[75%]', isUser && 'items-end')}>
                        {!isUser && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">BlockMind</span>
                            <span className="text-xs text-gray-500">{formatTime(messageTime)}</span>
                          </div>
                        )}

                        {isUser ? (
                          <div className="rounded-2xl rounded-tr-md bg-blue-600 px-4 py-3 text-white">
                            <MessageContent content={textContent} isUser={true} />
                          </div>
                        ) : (
                          <div className="py-1">
                            <MessageContent content={textContent} isUser={false} />
                          </div>
                        )}

                        {isUser && (
                          <span className="text-xs text-gray-500 mt-1">{t('you')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">BlockMind</span>
                    </div>
                    <div className="bg-[#1a1d21] rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-sm text-gray-400">{t('thinking')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Input Area - Docked Bottom */}
          <div className="px-6 py-4 border-t border-white/10">
            <div className="max-w-3xl mx-auto">
              {renderErrorBanner()}
              {renderInputComposer()}
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
              {renderErrorBanner()}
              {renderInputComposer()}
              <p className="text-xs text-gray-500 text-center mt-3">{t('disclaimer')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
