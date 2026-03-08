import { create } from 'zustand';
import { BlockState } from '@/types/block';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

export const useBlockStore = create<BlockState>((set) => ({
  blocks: [],
  lastResetAt: null,
  pivotIndex: null,
  appendBlock: (block) =>
    set((state) => ({ blocks: [...state.blocks, block] })),
  addBlock: (blockData) =>
    set((state) => ({
      blocks: [
        ...state.blocks,
        {
          ...blockData,
          id: uuidv4(),
          isVisible: true,
        },
      ],
    })),
  updateBlock: (id, updates) =>
    set((state) => {
      // isVisible 변경 시에만 lastResetAt 갱신 (레이블/내용 수정은 리셋 불필요)
      const target = state.blocks.find((b) => b.id === id);
      const isVisibilityChange =
        updates.isVisible !== undefined && target?.isVisible !== updates.isVisible;

      return {
        blocks: state.blocks.map((block) =>
          block.id === id ? { ...block, ...updates } : block
        ),
        ...(isVisibilityChange ? { lastResetAt: Date.now() } : {}),
      };
    }),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
      // 블록 삭제 시 항상 리셋 (삭제된 블록 관련 대화도 AI가 더 이상 보면 안 됨)
      lastResetAt: Date.now(),
    })),
  removeBlocksBySession: (sessionId) =>
    set((state) => {
      const remaining = state.blocks.filter((b) => b.sourceSessionId !== sessionId);
      const hadVisibleRemoved = state.blocks.some(
        (b) => b.sourceSessionId === sessionId && b.isVisible
      );
      return {
        blocks: remaining,
        ...(hadVisibleRemoved ? { lastResetAt: Date.now() } : {}),
      };
    }),
  reorderBlocks: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === overId);
      return {
        blocks: arrayMove(state.blocks, oldIndex, newIndex),
      };
    }),
  setBlocks: (blocks) => set({ blocks }),
  setPivotIndex: (index) => set({ pivotIndex: index }),
}));
