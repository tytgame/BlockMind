'use client';

import * as React from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { BlockList } from '@/components/block/block-list';
import { useBlocksInit } from '@/hooks/use-blocks-init';
import { useUIStore } from '@/store/ui-store';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  useBlocksInit();

  const {
    isChatSidebarCollapsed,
    isBlockSidebarCollapsed,
    setChatSidebarCollapsed,
    setBlockSidebarCollapsed,
  } = useUIStore();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1a1d21] dark">
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

        {/* Center Panel: Chat Interface (children) */}
        <div className="flex-1 min-w-[400px] h-full">
          {children}
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
    </div>
  );
}
