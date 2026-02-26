'use client';

import * as React from 'react';
import { ChatInterface } from '@/components/chat/chat-interface';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { BlockList } from '@/components/block/block-list';

export default function ChatPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isBlockSidebarCollapsed, setIsBlockSidebarCollapsed] =
    React.useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel: Chat Sidebar */}
      <div
        className={`h-full flex-shrink-0 border-r border-white/10 transition-[width,min-width] duration-300 ease-out ${
          isSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-64 min-w-[256px]'
        }`}
      >
        <ChatSidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </div>

      {/* Center Panel: Chat Interface */}
      <div className="flex-1 min-w-[400px] h-full">
        <ChatInterface />
      </div>

      {/* Right Panel: Block Context Stack */}
      <div
        className={`h-full flex-shrink-0 border-l border-white/10 transition-[width,min-width] duration-300 ease-out ${
          isBlockSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-80 min-w-[320px]'
        }`}
      >
        <BlockList
          collapsed={isBlockSidebarCollapsed}
          onToggleCollapse={() => setIsBlockSidebarCollapsed((prev) => !prev)}
        />
      </div>
    </div>
  );
}
