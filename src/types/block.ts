export type BlockType = 'data' | 'image' | 'file';

export const BLOCK_CATEGORIES = [
  'animal', 'fitness', 'travel', 'coding', 'food', 'music',
  'study', 'health', 'work', 'game', 'finance', 'shopping',
  'home', 'sports', 'entertainment', 'person',
] as const;

export type BlockCategory = typeof BLOCK_CATEGORIES[number];

export interface Block {
  id: string;
  type: BlockType;
  label: string;
  content: string;
  isVisible: boolean;

  // 파일 첨부 (image / file 타입에서 사용)
  fileUrl?: string;       // Supabase Storage path
  fileName?: string;
  fileType?: string;      // MIME type
  fileSize?: number;      // bytes

  // Gemini Files API (PDF 타입만, 48시간 유효)
  geminiFileUri?: string;
  geminiExpiresAt?: string | null; // ISO string

  // data 타입 블록의 LLM 분류 카테고리
  category?: BlockCategory | null;

  // 서버가 GET /api/blocks 응답 시 주입 (DB 저장 안 됨)
  signedUrl?: string;
}

export type BlockState = {
  blocks: Block[];
  // 블록 visibility 변경/삭제 시 갱신되는 타임스탬프 (변경 감지 트리거 역할)
  lastResetAt: number | null;
  // 블록 토글/삭제 시점의 messages.length — 그 이후 메시지만 AI에게 전달
  // React ref 대신 Zustand에 저장해 body()에서 렌더 없이 안전하게 읽음
  pivotIndex: number | null;
  // DB에서 받은 완전한 Block 객체를 그대로 추가 (id는 DB cuid 사용)
  appendBlock: (block: Block) => void;
  addBlock: (block: Omit<Block, 'id' | 'isVisible'>) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  removeBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;
  setBlocks: (blocks: Block[]) => void;
  setPivotIndex: (index: number | null) => void;
};
