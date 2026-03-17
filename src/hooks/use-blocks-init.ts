'use client';

import { useEffect } from 'react';
import { useBlockStore } from '@/store/block-store';
import { Block } from '@/types/block';

/**
 * 앱 마운트 시 DB에서 블록을 불러와 Zustand store를 초기화한다.
 * @param skip - true이면 서버에서 이미 데이터를 주입받았으므로 fetch 건너뜀.
 *               서버 데이터가 비어있을 때(미인증/에러)만 클라이언트 fallback으로 동작.
 */
export function useBlocksInit(skip = false) {
  const setBlocks = useBlockStore((state) => state.setBlocks);

  useEffect(() => {
    if (skip) return;

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
  }, [setBlocks, skip]);
}
