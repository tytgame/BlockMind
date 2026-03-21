'use client';

import * as React from 'react';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { BlockList } from '@/components/block/block-list';
import { MobileHeader } from '@/components/chat/mobile-header';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { useBlocksInit } from '@/hooks/use-blocks-init';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useUIStore } from '@/store/ui-store';
import { useBlockStore } from '@/store/block-store';
import { Block } from '@/types/block';

interface ClientChatLayoutProps {
  children: React.ReactNode;
  initialBlocks: Block[];
}

export function ClientChatLayout({ children, initialBlocks }: ClientChatLayoutProps) {
  // 서버에서 받은 블록을 Zustand store에 한 번만 동기 주입 (첫 프레임부터 데이터 존재)
  const initializedRef = React.useRef(false);
  if (!initializedRef.current && initialBlocks.length > 0) {
    useBlockStore.getState().setBlocks(initialBlocks);
    initializedRef.current = true;
  }

  // fallback: 서버 데이터가 비어있으면 클라이언트에서 재시도
  useBlocksInit(initialBlocks.length > 0);

  const {
    isChatSidebarCollapsed,
    isBlockSidebarCollapsed,
    isMobileSidebarOpen,
    isMobileBlockPanelOpen,
    setChatSidebarCollapsed,
    setBlockSidebarCollapsed,
    setMobileSidebarOpen,
    setMobileBlockPanelOpen,
  } = useUIStore();

  // 태블릿(md~lg): 사이드바 항상 접힘
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#1a1d21] dark">
      <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">

        {/* Mobile Header (< md) */}
        <MobileHeader />

        {/* Left Panel: Chat Sidebar — md+: collapse 상태에 따라 72px or 256px */}
        <div
          className={`hidden h-full flex-shrink-0 overflow-hidden border-r border-white/10 transition-[width,min-width] duration-300 ease-out md:flex ${
            isChatSidebarCollapsed ? 'w-[72px] min-w-[72px]' : 'w-[256px] min-w-[256px]'
          }`}
        >
          <ChatSidebar
            collapsed={isChatSidebarCollapsed}
            onToggleCollapse={() => setChatSidebarCollapsed(!isChatSidebarCollapsed)}
          />
        </div>

        {/* Center Panel: Chat Interface */}
        <div className="min-w-0 flex-1 overflow-hidden">
          {children}
        </div>

        {/* Right Panel: Block Context Stack — md+: 태블릿은 72px 고정, 데스크톱은 collapse 상태 */}
        <div
          className={`hidden h-full flex-shrink-0 overflow-hidden border-l border-white/10 transition-[width,min-width] duration-300 ease-out md:flex ${
            !isDesktop || isBlockSidebarCollapsed
              ? 'w-[72px] min-w-[72px]'
              : 'w-[320px] min-w-[320px]'
          }`}
        >
          <BlockList
            collapsed={isBlockSidebarCollapsed}
            onToggleCollapse={
              !isDesktop
                ? () => setMobileBlockPanelOpen(true)
                : () => setBlockSidebarCollapsed(!isBlockSidebarCollapsed)
            }
            forceCollapsed={isDesktop ? undefined : true}
            initialBlocks={initialBlocks}
          />
        </div>
      </div>

      {/* Mobile: 세션 목록 Left Drawer */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 border-white/10 bg-[#1a1d21] p-0 text-white" hideCloseButton>
          <SheetTitle className="sr-only">세션 목록</SheetTitle>
          <SheetDescription className="sr-only">채팅 세션 목록</SheetDescription>
          <ChatSidebar
            collapsed={false}
            onToggleCollapse={() => setMobileSidebarOpen(false)}
            forceCollapsed={false}
          />
        </SheetContent>
      </Sheet>

      {/* Mobile: 블록 패널 Right Drawer */}
      <Sheet open={isMobileBlockPanelOpen} onOpenChange={setMobileBlockPanelOpen}>
        <SheetContent side="right" className="w-80 border-white/10 bg-[#1a1d21] p-0 text-white" hideCloseButton>
          <SheetTitle className="sr-only">블록 패널</SheetTitle>
          <SheetDescription className="sr-only">컨텍스트 블록 패널</SheetDescription>
          <BlockList
            collapsed={false}
            onToggleCollapse={() => setMobileBlockPanelOpen(false)}
            initialBlocks={initialBlocks}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
