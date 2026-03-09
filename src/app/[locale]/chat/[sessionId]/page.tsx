'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/store/chat-store';
import { ChatInterface } from '@/components/chat/chat-interface';
import { Spinner } from '@/components/ui/spinner';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';

export default function SessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const { pendingMessages, setPendingMessages, setMessageFiles } = useChatStore.getState();

    // 사이드바에서 미리 fetch해 둔 pendingMessages가 있으면 바로 렌더링
    if (pendingMessages.length > 0) {
      setReady(true);
      return;
    }

    // 없으면 (새로고침, 직접 URL 접근, 블록 출처 이동 등) → DB에서 fetch
    void (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          // 존재하지 않거나 다른 계정 세션 → /chat으로 리다이렉트
          window.location.href = '/chat';
          return;
        }
        const data = (await res.json()) as {
          messages: Array<{ id: string; role: string; content: string; clientId?: string | null; files?: SentFileInfo[] | null }>;
        };
        const converted = data.messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({
            id: m.clientId ?? m.id,
            role: m.role as 'user' | 'assistant',
            parts: [{ type: 'text' as const, text: m.content }],
          }));
        for (const m of data.messages) {
          if (m.role === 'user' && m.files && m.files.length > 0) {
            setMessageFiles(m.clientId ?? m.id, m.files);
          }
        }
        if (converted.length > 0) setPendingMessages(converted);
      } catch { /* 복원 실패 시 빈 채팅 유지 */ }
      finally { setReady(true); }
    })();
  }, [sessionId]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="md" />
      </div>
    );
  }

  return <ChatInterface key={sessionId} sessionId={sessionId} />;
}
