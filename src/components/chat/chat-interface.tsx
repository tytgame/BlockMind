'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import {
  Send,
  Loader2,
  Plus,
  Image as ImageIcon,
  Mic,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import { MessageContent } from './message-content';
import { cn } from '@/lib/utils';

type ExtractedBlock = {
  label: string;
  content: string;
};

type ExtractBlocksResponse = {
  blocks?: ExtractedBlock[];
};

const MAX_BLOCKS_PER_CYCLE = 1;

export function ChatInterface() {
  const { data: session } = useSession();
  const { blocks } = useBlockStore();
  const { input, setInput, resetInput } = useChatStore();
  const [apiError, setApiError] = React.useState<string | null>(null);

  // 시스템 프롬프트 구성: 활성화된 블록들의 내용을 합칩니다.
  const systemPrompt = React.useMemo(() => {
    return blocks
      .filter((b) => b.isVisible)
      .map((b) => `[${b.type.toUpperCase()} - ${b.label}]\n${b.content}`)
      .join('\n\n');
  }, [blocks]);

  // HTTP Transport 생성 (타입 안전하게)
  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          systemPrompt,
        },
      }),
    [systemPrompt]
  );

  const applyExtractedBlocks = React.useCallback((extractedBlocks: ExtractedBlock[]) => {
    const { blocks: currentBlocks, addBlock } = useBlockStore.getState();

    const existingKeys = new Set(
      currentBlocks.map(
        (block) =>
          `${block.label.trim().toLowerCase()}::${block.content.trim().toLowerCase()}`
      )
    );

    let addedCount = 0;
    for (const block of extractedBlocks) {
      if (addedCount >= MAX_BLOCKS_PER_CYCLE) break;

      const label = block.label.trim();
      const content = block.content.trim();

      if (!label || !content) continue;

      const blockKey = `${label.toLowerCase()}::${content.toLowerCase()}`;

      if (existingKeys.has(blockKey)) continue;

      addBlock({ type: 'data', label, content });
      existingKeys.add(blockKey);
      addedCount += 1;
    }
  }, []);

  // useChat 훅 사용
  const { messages, sendMessage, status } = useChat({
    transport,
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
        setApiError(
          'API 사용량 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
        );
      } else {
        setApiError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    },
    onFinish: ({ message, messages: allMessages }) => {
      if (message.role !== 'assistant') return;

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

      const { blocks: currentBlocks } = useBlockStore.getState();
      const existingBlocks = currentBlocks.map((block) => ({
        label: block.label,
        content: block.content,
      }));

      void (async () => {
        try {
          const response = await fetch('/api/blocks/extract', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userMessage,
              assistantMessage,
              existingBlocks,
            }),
          });

          if (!response.ok) return;

          const data = (await response.json()) as ExtractBlocksResponse;

          if (!data.blocks || data.blocks.length === 0) return;

          applyExtractedBlocks(data.blocks.slice(0, MAX_BLOCKS_PER_CYCLE));
        } catch {
          // Silent fail: memory extraction should not affect chat UX.
        }
      })();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setApiError(null);
    const userMessage = input;
    resetInput();

    await sendMessage({
      text: userMessage,
    });
  };

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // 시간 포맷팅
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

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
      <div className="flex items-center gap-2 bg-[#1a1d21] rounded-xl border border-white/10 px-4 py-2">
        {/* Left Icons */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Input */}
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Message BlockMind..."
          className="flex-1 border-0 bg-transparent text-white placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
        />

        {/* Send Button */}
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !input?.trim()}
          className="h-9 w-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );

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
                    {/* Date separator - only show for first message or new day */}
                    {index === 0 && (
                      <div className="flex justify-center mb-6">
                        <span className="text-xs text-gray-500 bg-[#1a1d21] px-3 py-1 rounded-full">
                          Today, {formatTime(messageTime)}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        'flex gap-3',
                        isUser ? 'flex-row-reverse' : 'flex-row'
                      )}
                    >
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
                      <div
                        className={cn('flex flex-col max-w-[75%]', isUser && 'items-end')}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">
                              BlockMind
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(messageTime)}
                            </span>
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
                          <span className="text-xs text-gray-500 mt-1">You</span>
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
                      <span className="text-sm text-gray-400">Thinking...</span>
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
              <p className="text-xs text-gray-500 text-center mt-3">
                BlockMind may display inaccurate info, including about people, so
                double-check its responses.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 px-6">
          <div className="h-full max-w-3xl mx-auto flex flex-col items-center justify-center pb-16">
            <div className="text-center text-gray-400 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">B</span>
              </div>
              <p className="text-4xl font-medium text-white mb-3">
                How can I help you today?
              </p>
              <p className="text-base">Start chatting to build your context!</p>
            </div>

            <div className="w-full">
              {renderErrorBanner()}
              {renderInputComposer()}
              <p className="text-xs text-gray-500 text-center mt-3">
                BlockMind may display inaccurate info, including about people, so
                double-check its responses.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
