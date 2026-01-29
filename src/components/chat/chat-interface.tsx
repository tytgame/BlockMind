'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';
import {
  Send,
  Loader2,
  Share,
  Download,
  Plus,
  Image as ImageIcon,
  Mic,
} from 'lucide-react';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';
import { cn } from '@/lib/utils';

export function ChatInterface() {
  const { data: session } = useSession();
  const { blocks } = useBlockStore();
  const { input, setInput, resetInput } = useChatStore();
  const [apiMode, setApiMode] = React.useState<'v2.1' | 'v3.0'>('v2.1');

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

  // useChat 훅 사용
  const { messages, sendMessage, status } = useChat({
    transport,
    onToolCall: async ({ toolCall }) => {
      if (toolCall.toolName === 'createBlock') {
        const tc = toolCall as ToolCall<
          string,
          { type: string; label: string; content: string }
        >;
        const { type, label, content } = tc.input;

        const { addBlock } = useBlockStore.getState();
        addBlock({
          type: type as 'persona' | 'rule' | 'data' | 'output',
          label,
          content,
        });
      }
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

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

  return (
    <div className="flex flex-col h-full bg-[#252830]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg text-white">New Chat</h2>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Active Session
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Version Toggle */}
          <div className="flex items-center bg-[#1a1d21] rounded-lg p-1">
            <button
              onClick={() => setApiMode('v2.1')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                apiMode === 'v2.1'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              BlockMind v2.1
            </button>
            <button
              onClick={() => setApiMode('v3.0')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                apiMode === 'v3.0'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              BlockMind v3.0
            </button>
          </div>

          {/* Action Icons */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Share className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-6" viewportRef={scrollRef}>
        <div className="py-6 space-y-6 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-20">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-2xl">B</span>
              </div>
              <p className="text-lg font-medium text-white mb-2">
                How can I help you today?
              </p>
              <p className="text-sm">Start chatting to build your context!</p>
            </div>
          )}

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

                    <div
                      className={cn(
                        'rounded-2xl px-4 py-3 text-sm',
                        isUser
                          ? 'bg-blue-600 text-white rounded-tr-md'
                          : 'bg-[#1a1d21] text-gray-100 rounded-tl-md'
                      )}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {textContent}
                      </p>
                    </div>

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
      </ScrollArea>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-white/10">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative">
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

          {/* Disclaimer */}
          <p className="text-xs text-gray-500 text-center mt-3">
            BlockMind may display inaccurate info, including about people, so
            double-check its responses.
          </p>
        </div>
      </div>
    </div>
  );
}
