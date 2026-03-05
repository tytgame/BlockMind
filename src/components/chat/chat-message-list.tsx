'use client';

import * as React from 'react';
import { isTextUIPart } from 'ai';
import type { UIMessage } from 'ai';
import type { Session } from 'next-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileText, FileType, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { MessageContent } from './message-content';
import { type SentFileInfo } from './file-preview-modal';
import { cn } from '@/lib/utils';

interface ChatMessageListProps {
  messages: UIMessage[];
  isLoading: boolean;
  messageFilesMap: Record<string, SentFileInfo[]>;
  onFileClick: (file: SentFileInfo) => void;
  session: Session | null;
}

export function ChatMessageList({
  messages,
  isLoading,
  messageFilesMap,
  onFileClick,
  session,
}: ChatMessageListProps) {
  const t = useTranslations('chatInterface');
  const locale = useLocale();

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

  return (
    <div ref={scrollRef} className="flex-1 px-6 overflow-y-auto">
      <div className="py-6 space-y-6 max-w-3xl mx-auto">
        {messages.map((m, index) => {
          const textContent = m.parts
            .filter(isTextUIPart)
            .map((part) => part.text)
            .join('');

          const isUser = m.role === 'user';
          const messageTime = new Date();
          const msgFiles: SentFileInfo[] = messageFilesMap[m.id] ?? [];

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
                {/* Avatar — user only */}
                {isUser && (
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={session?.user?.image || ''} />
                    <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white">
                      {session?.user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Message Content */}
                <div className={cn('flex flex-col', isUser ? 'max-w-[75%] items-end' : 'w-full')}>

                  {/* 첨부 파일 카드 (유저 메시지 전용) */}
                  {isUser && msgFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end mb-2">
                      {msgFiles.map((fileInfo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onFileClick(fileInfo)}
                          className="flex items-center gap-2 rounded-xl bg-[#1a1d21] border border-white/10 px-3 py-2 text-left hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {fileInfo.fileType.startsWith('image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={fileInfo.base64 ?? `/api/files/download?path=${encodeURIComponent(fileInfo.storagePath)}`}
                              alt={fileInfo.fileName}
                              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : fileInfo.fileType === 'application/pdf' ? (
                            <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-5 w-5 text-red-400" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <FileType className="h-5 w-5 text-blue-400" />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0 max-w-32">
                            <span className="text-xs font-medium text-white truncate">
                              {fileInfo.fileName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {fileInfo.fileType === 'application/pdf'
                                ? 'PDF'
                                : fileInfo.fileType.startsWith('image/')
                                ? 'Image'
                                : 'Document'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 메시지 버블 */}
                  {isUser ? (
                    textContent.trim() ? (
                      <div className="rounded-2xl rounded-tr-md bg-blue-600 px-4 py-3 text-white">
                        <MessageContent content={textContent} isUser={true} />
                      </div>
                    ) : null
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

        {/* 스트리밍 로딩 인디케이터 */}
        {isLoading && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span className="text-sm text-gray-400">{t('thinking')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
