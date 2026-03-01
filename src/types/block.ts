export type BlockType = 'data';

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  color: string;
  isVisible: boolean;
}

export type BlockState = {
  blocks: Block[];
  // 블록 visibility 변경/삭제 시 갱신되는 타임스탬프 (변경 감지 트리거 역할)
  lastResetAt: number | null;
  // 블록 토글/삭제 시점의 messages.length — 그 이후 메시지만 AI에게 전달
  // React ref 대신 Zustand에 저장해 body()에서 렌더 없이 안전하게 읽음
  pivotIndex: number | null;
  addBlock: (block: Omit<Block, 'id' | 'isVisible' | 'color'>) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  setBlocks: (blocks: Block[]) => void;
  setPivotIndex: (index: number | null) => void;
};
