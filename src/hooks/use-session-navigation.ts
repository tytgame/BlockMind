'use client';

import { useRouter } from '@/i18n/navigation';
import { useChatStore, RestoredMessage } from '@/store/chat-store';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';

export function useSessionNavigation() {
  const router = useRouter();
  const { setSessionId, setPendingMessages, clearPendingMessages, newMountKey, setMessageFiles, setScrollToMessageId } =
    useChatStore();

  const navigateToSession = async (sessionId: string, scrollToMessageId?: string | null) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: Array<{ id: string; role: string; content: string; clientId?: string | null; files?: SentFileInfo[] | null }>;
      };
      const converted: RestoredMessage[] = data.messages
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
      setPendingMessages(converted);
    } catch {
      clearPendingMessages();
    }

    if (scrollToMessageId) {
      setScrollToMessageId(scrollToMessageId);
    }

    setSessionId(sessionId);
    newMountKey();
    router.push('/chat');
  };

  return { navigateToSession };
}
