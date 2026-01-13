'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, isTextUIPart } from 'ai';
import type { ToolCall } from '@ai-sdk/provider-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useBlockStore } from '@/store/block-store';
import { useChatStore } from '@/store/chat-store';

export function ChatInterface() {
  const { blocks } = useBlockStore();
  const { input, setInput, resetInput } = useChatStore();
  
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
        // ToolCall의 input 속성 사용 (args 아님)
        const tc = toolCall as ToolCall<string, { type: string; label: string; content: string }>;
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
    resetInput(); // 입력창 즉시 초기화
    
    // sendMessage는 { text: string } 형태를 받습니다 (AbstractChat 타입 정의에 따름)
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

  return (
    <div className="flex flex-col h-full bg-background border-r">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-lg">AI Chat</h2>
        {/* API Key 설정 버튼 등이 들어갈 수 있음 */}
      </div>

      <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <p>Say hello to start building context!</p>
            </div>
          )}
          {messages.map((m) => {
            // UIMessage의 parts 배열에서 텍스트만 추출
            const textContent = m.parts
              .filter(isTextUIPart)
              .map((part) => part.text)
              .join('');

            return (
              <div
                key={m.id}
                className={`flex gap-3 ${
                  m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] text-sm ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {textContent}
                  {/* 툴 호출은 onToolCall에서 자동 처리됨 */}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input?.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
