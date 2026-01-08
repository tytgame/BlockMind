import { create } from 'zustand';
import { Block, BlockState } from '@/types/block';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuidv4 } from 'uuid';

export const useBlockStore = create<BlockState>((set) => ({
  blocks: [],
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
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id ? { ...block, ...updates } : block
      ),
    })),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((block) => block.id !== id),
    })),
  reorderBlocks: (activeId, overId) =>
    set((state) => {
      const oldIndex = state.blocks.findIndex((b) => b.id === activeId);
      const newIndex = state.blocks.findIndex((b) => b.id === overId);
      return {
        blocks: arrayMove(state.blocks, oldIndex, newIndex),
      };
    }),
  setBlocks: (blocks) => set({ blocks }),
}));
