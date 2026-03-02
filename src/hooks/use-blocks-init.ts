'use client';

import { useEffect } from 'react';
import { useBlockStore } from '@/store/block-store';
import { Block } from '@/types/block';

/**
 * 앱 마운트 시 DB에서 블록을 불러와 Zustand store를 초기화한다.
 * 채팅 페이지 최상단에서 한 번만 호출한다.
 */
export function useBlocksInit() {
  const setBlocks = useBlockStore((state) => state.setBlocks);

  useEffect(() => {
    async function loadBlocks() {
      try {
        const res = await fetch('/api/blocks');
        if (!res.ok) return;
        const blocks = (await res.json()) as Block[];
        setBlocks(blocks);
      } catch {
        // 네트워크 오류 시 로컬 상태 유지 (빈 배열)
      }
    }

    void loadBlocks();
  }, [setBlocks]);
}
