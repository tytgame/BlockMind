export type BlockType = 'persona' | 'rule' | 'data' | 'output';

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  color?: string;
  isVisible: boolean;
}

export type BlockState = {
  blocks: Block[];
  addBlock: (block: Omit<Block, 'id' | 'isVisible'>) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  setBlocks: (blocks: Block[]) => void;
};
