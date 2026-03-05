'use client';

import * as React from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { BlockList } from '@/components/block/block-list';
import { useBlocksInit } from '@/hooks/use-blocks-init';
import { useChatStore } from '@/store/chat-store';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';
import { useUIStore } from '@/store/ui-store';
import { Spinner } from '@/components/ui/spinner';

export default function ChatPage() {
  useBlocksInit();
  const mountKey = useChatStore((state) => state.mountKey);

  // 'loading'   : useEffect 실행 전 (SSR → hydration 구간) → 스피너
  // 'restoring' : sessionId 있음, DB fetch 중 → 스피너
  // 'ready'     : 완료 → ChatInterface 렌더링
  const [chatState, setChatState] = React.useState<'loading' | 'restoring' | 'ready'>('loading');

  // 페이지 리마운트 시 (새로고침, 홈→채팅 복귀 등) 활성 세션 메시지 자동 복원
  React.useEffect(() => {
    const { sessionId, pendingMessages, setPendingMessages, newMountKey, setMessageFiles } = useChatStore.getState();
    if (!sessionId || pendingMessages.length > 0) {
      setChatState('ready');
      return;
    }
    setChatState('restoring');
    void (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) { setChatState('ready'); return; }
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

        // 첨부 파일 메타 복원 (messageFilesMap에 주입)
        for (const m of data.messages) {
          if (m.role === 'user' && m.files && m.files.length > 0) {
            const messageId = m.clientId ?? m.id;
            setMessageFiles(messageId, m.files);
          }
        }

        if (converted.length > 0) {
          setPendingMessages(converted);
          newMountKey();
        }
      } catch { /* 복원 실패 시 빈 채팅 유지 */ }
      finally { setChatState('ready'); }
    })();
  }, []);
  const {
    isChatSidebarCollapsed,
    isBlockSidebarCollapsed,
    setChatSidebarCollapsed,
    setBlockSidebarCollapsed,
  } = useUIStore();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel: Chat Sidebar */}
      <div
        className={`h-full flex-shrink-0 border-r border-white/10 transition-[width,min-width] duration-300 ease-out ${
          isChatSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-64 min-w-[256px]'
        }`}
      >
        <ChatSidebar
          collapsed={isChatSidebarCollapsed}
          onToggleCollapse={() => setChatSidebarCollapsed(!isChatSidebarCollapsed)}
        />
      </div>

      {/* Center Panel: Chat Interface */}
      {/* loading/restoring 중 스피너 → ChatInterface는 ready 이후에만 렌더링 */}
      <div className="flex-1 min-w-[400px] h-full">
        {chatState !== 'ready' ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="md" />
          </div>
        ) : (
          <ChatInterface key={mountKey} />
        )}
      </div>

      {/* Right Panel: Block Context Stack */}
      <div
        className={`h-full flex-shrink-0 border-l border-white/10 transition-[width,min-width] duration-300 ease-out ${
          isBlockSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-80 min-w-[320px]'
        }`}
      >
        <BlockList
          collapsed={isBlockSidebarCollapsed}
          onToggleCollapse={() => setBlockSidebarCollapsed(!isBlockSidebarCollapsed)}
        />
      </div>
    </div>
  );
}
