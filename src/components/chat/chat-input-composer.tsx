'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowUp, Plus, Settings, Square, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/store/chat-store';
import { FileAttachmentPreview, type AttachedFile } from './file-attachment-preview';
import { cn } from '@/lib/utils';

interface ChatInputComposerProps {
  attachedFiles: AttachedFile[];
  onRemoveFile: (id: string) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onStop: () => void;
  isLoading: boolean;
  apiError: string | null;
  onErrorClose: () => void;
  charLimit?: number;
  limitBanner?: string | null;
  limitError?: string | null;
  isDisabled?: boolean;
  className?: string;
}

export function ChatInputComposer({
  attachedFiles,
  onRemoveFile,
  onFileInputChange,
  onPaste,
  onSubmit,
  onStop,
  isLoading,
  apiError,
  onErrorClose,
  charLimit,
  limitBanner,
  limitError,
  isDisabled,
  className,
}: ChatInputComposerProps) {
  const t = useTranslations('chatInterface');
  const { input, setInput } = useChatStore();
  const charCount = input.length;
  const isCharWarn = charLimit !== undefined && charCount >= Math.floor(charLimit * 0.9);
  const isCharOver = charLimit !== undefined && charCount > charLimit;

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  const handleInternalSubmit = (e: React.FormEvent) => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    onSubmit(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInternalSubmit(e as unknown as React.FormEvent);
    }
  };

  const isFullyDisabled = isLoading || isDisabled;

  return (
    <div className={className}>
      {/* 제한 경고 배너 (노란색, 비해제) */}
      {limitBanner && !limitError && (
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2.5 mb-3">
          <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-300">{limitBanner}</p>
        </div>
      )}

      {/* 제한 초과 배너 (빨간색, 비해제) */}
      {limitError && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{limitError}</p>
        </div>
      )}

      {/* API 에러 배너 (해제 가능) */}
      {apiError && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3">
          <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300 flex-1">{apiError}</p>
          <button
            type="button"
            onClick={onErrorClose}
            className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleInternalSubmit} className={cn('relative')}>
        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          multiple
          className="hidden"
          onChange={onFileInputChange}
        />

        <div className="bg-[#1a1d21] rounded-2xl border border-white/10 px-4 pt-4 pb-3">
          {/* 첨부 파일 미리보기 */}
          <FileAttachmentPreview files={attachedFiles} onRemove={onRemoveFile} />

          {/* 텍스트 입력 */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={t('placeholder')}
            rows={1}
            disabled={isFullyDisabled}
            className="w-full bg-transparent text-white placeholder:text-gray-500 resize-none outline-none text-sm leading-relaxed mb-3 max-h-48 overflow-y-auto disabled:opacity-60"
          />

          {/* 하단 아이콘 행 */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
              onClick={() => fileInputRef.current?.click()}
              disabled={isFullyDisabled}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {/* 글자 수 카운터 */}
              {charLimit !== undefined && (isCharWarn || isCharOver) && (
                <span className={cn(
                  'text-xs tabular-nums',
                  isCharOver ? 'text-red-400' : isCharWarn ? 'text-yellow-400' : 'text-gray-500'
                )}>
                  {charCount} / {charLimit}
                </span>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Settings className="h-4 w-4" />
              </Button>
              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  onClick={onStop}
                  className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-full"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || isDisabled || isCharOver}
                  className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white rounded-full disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
