'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, User, Bot, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBlockStore } from '@/store/block-store';

export function ChatInterface() {
  const { blocks } = useBlockStore();
  
  // 시스템 프롬프트 구성: 활성화된 블록들의 내용을 합칩니다.
  const systemPrompt = React.useMemo(() => {
    return blocks
      .filter((b) => b.isVisible)
      .map((b) => `[${b.type.toUpperCase()} - ${b.label}]\n${b.content}`)
      .join('\n\n');
  }, [blocks]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, addToolResult } = useChat({
    api: '/api/chat',
    body: {
      systemPrompt, 
    },
    maxSteps: 5, // Enable multi-step for tool calls
    onToolCall: async ({ toolCall }) => {
        if (toolCall.toolName === 'createBlock') {
          const { type, label, content } = toolCall.args as any;
           // Directly update the store
           const { addBlock } = useBlockStore.getState();
           addBlock({ type, label, content });
           return 'Block created successfully.';
        }
    },
  });

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
          {messages.map((m) => (
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
                {m.content}
                {/* 툴 호출 결과가 있을 경우 렌더링 할 수도 있음 */}
              </div>
            </div>
          ))}
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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(e);
          }}
          className="flex gap-2"
        >
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
