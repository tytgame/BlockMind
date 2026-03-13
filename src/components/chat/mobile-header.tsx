'use client';

import { Blocks, Menu } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { Link } from '@/i18n/navigation';

export function MobileHeader() {
  const setMobileSidebarOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const setMobileBlockPanelOpen = useUIStore((s) => s.setMobileBlockPanelOpen);

  return (
    <div className="flex md:hidden h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#1a1d21] px-4">
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
        aria-label="세션 목록 열기"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/" className="font-sora text-sm text-white hover:opacity-80 transition-opacity">
        <span className="font-bold">Block</span>
        <span className="font-normal">Mind</span>
      </Link>

      <button
        onClick={() => setMobileBlockPanelOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white"
        aria-label="블록 패널 열기"
      >
        <Blocks className="h-5 w-5" />
      </button>
    </div>
  );
}
