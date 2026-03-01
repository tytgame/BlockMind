// ESM-only 패키지를 CommonJS Jest 환경에서 사용하기 위한 모킹
jest.mock('uuid', () => ({
  v4: (() => {
    let counter = 0;
    return () => `mock-uuid-${++counter}`;
  })(),
}));

jest.mock('@dnd-kit/sortable', () => ({
  arrayMove: <T>(arr: T[], from: number, to: number): T[] => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },
}));

import { useBlockStore } from '@/store/block-store';
import { buildSystemPrompt } from '@/lib/build-system-prompt';

// 각 테스트 전에 스토어를 초기 상태로 리셋
beforeEach(() => {
  useBlockStore.setState({ blocks: [], lastResetAt: null, pivotIndex: null });
});

describe('block-store — 블록 상태 관리', () => {
  // ──────────────────────────────────────────
  // addBlock
  // ──────────────────────────────────────────
  describe('addBlock', () => {
    it('블록을 추가하면 isVisible=true로 생성된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });

      const { blocks } = useBlockStore.getState();
      expect(blocks).toHaveLength(1);
      expect(blocks[0].isVisible).toBe(true);
    });

    it('블록을 추가하면 id가 자동 생성된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });

      const { blocks } = useBlockStore.getState();
      expect(blocks[0].id).toBeTruthy();
      expect(typeof blocks[0].id).toBe('string');
    });

    it('여러 블록을 추가하면 순서대로 쌓인다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      useBlockStore.getState().addBlock({ type: 'data', label: '직업', content: '개발자' });

      const { blocks } = useBlockStore.getState();
      expect(blocks).toHaveLength(2);
      expect(blocks[0].label).toBe('이름');
      expect(blocks[1].label).toBe('직업');
    });
  });

  // ──────────────────────────────────────────
  // visibility 토글 — 기억/망각 핵심 동작
  // ──────────────────────────────────────────
  describe('visibility 토글 (기억 ON/OFF)', () => {
    it('isVisible을 false로 바꾸면 AI가 해당 블록을 기억하지 않는다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '비밀', content: '비밀내용' });
      const { blocks } = useBlockStore.getState();
      const blockId = blocks[0].id;

      // 비활성화
      useBlockStore.getState().updateBlock(blockId, { isVisible: false });

      const systemPrompt = buildSystemPrompt(useBlockStore.getState().blocks);
      expect(systemPrompt).not.toContain('비밀내용');
    });

    it('isVisible을 다시 true로 바꾸면 AI가 다시 기억한다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '비밀', content: '비밀내용' });
      const blockId = useBlockStore.getState().blocks[0].id;

      // 비활성화 후 재활성화
      useBlockStore.getState().updateBlock(blockId, { isVisible: false });
      useBlockStore.getState().updateBlock(blockId, { isVisible: true });

      const systemPrompt = buildSystemPrompt(useBlockStore.getState().blocks);
      expect(systemPrompt).toContain('비밀내용');
    });

    it('블록 A는 켜고 블록 B는 끄면, A만 시스템 프롬프트에 포함된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: 'A', content: 'A내용' });
      useBlockStore.getState().addBlock({ type: 'data', label: 'B', content: 'B내용' });
      const { blocks } = useBlockStore.getState();

      useBlockStore.getState().updateBlock(blocks[1].id, { isVisible: false });

      const systemPrompt = buildSystemPrompt(useBlockStore.getState().blocks);
      expect(systemPrompt).toContain('A내용');
      expect(systemPrompt).not.toContain('B내용');
    });
  });

  // ──────────────────────────────────────────
  // removeBlock
  // ──────────────────────────────────────────
  describe('removeBlock', () => {
    it('삭제된 블록은 시스템 프롬프트에서 사라진다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '삭제될 것', content: '삭제내용' });
      const blockId = useBlockStore.getState().blocks[0].id;

      useBlockStore.getState().removeBlock(blockId);

      const { blocks } = useBlockStore.getState();
      expect(blocks).toHaveLength(0);
      expect(buildSystemPrompt(blocks)).toBe('');
    });

    it('다른 블록은 그대로 유지된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: 'A', content: 'A내용' });
      useBlockStore.getState().addBlock({ type: 'data', label: 'B', content: 'B내용' });
      const { blocks } = useBlockStore.getState();

      useBlockStore.getState().removeBlock(blocks[0].id);

      const remaining = useBlockStore.getState().blocks;
      expect(remaining).toHaveLength(1);
      expect(remaining[0].label).toBe('B');
    });
  });

  // ──────────────────────────────────────────
  // reorderBlocks
  // ──────────────────────────────────────────
  describe('reorderBlocks', () => {
    it('순서를 바꿔도 두 블록 모두 시스템 프롬프트에 포함된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: 'A', content: 'A내용' });
      useBlockStore.getState().addBlock({ type: 'data', label: 'B', content: 'B내용' });
      const { blocks } = useBlockStore.getState();

      useBlockStore.getState().reorderBlocks(blocks[0].id, blocks[1].id);

      const systemPrompt = buildSystemPrompt(useBlockStore.getState().blocks);
      expect(systemPrompt).toContain('A내용');
      expect(systemPrompt).toContain('B내용');
    });

    it('순서를 바꾸면 블록 순서가 실제로 바뀐다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: 'A', content: 'A내용' });
      useBlockStore.getState().addBlock({ type: 'data', label: 'B', content: 'B내용' });
      const { blocks } = useBlockStore.getState();

      useBlockStore.getState().reorderBlocks(blocks[0].id, blocks[1].id);

      const reordered = useBlockStore.getState().blocks;
      expect(reordered[0].label).toBe('B');
      expect(reordered[1].label).toBe('A');
    });
  });

  // ──────────────────────────────────────────
  // lastResetAt — 메시지 슬라이싱 트리거
  // ──────────────────────────────────────────
  describe('lastResetAt (메모리 리셋 타임스탬프)', () => {
    it('초기값은 null이다', () => {
      expect(useBlockStore.getState().lastResetAt).toBeNull();
    });

    it('addBlock은 lastResetAt을 변경하지 않는다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      expect(useBlockStore.getState().lastResetAt).toBeNull();
    });

    it('visible→invisible 토글 시 lastResetAt이 갱신된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      const blockId = useBlockStore.getState().blocks[0].id;

      const before = Date.now();
      useBlockStore.getState().updateBlock(blockId, { isVisible: false });
      const after = Date.now();

      const { lastResetAt } = useBlockStore.getState();
      expect(lastResetAt).not.toBeNull();
      expect(lastResetAt).toBeGreaterThanOrEqual(before);
      expect(lastResetAt).toBeLessThanOrEqual(after);
    });

    it('invisible→visible 재활성화 시에도 lastResetAt이 갱신된다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      const blockId = useBlockStore.getState().blocks[0].id;

      useBlockStore.getState().updateBlock(blockId, { isVisible: false });
      const resetAfterHide = useBlockStore.getState().lastResetAt;

      // 약간의 시간 차이를 두기 위해 다음 ms를 보장
      const before = Date.now();
      useBlockStore.getState().updateBlock(blockId, { isVisible: true });
      const after = Date.now();

      const { lastResetAt } = useBlockStore.getState();
      expect(lastResetAt).toBeGreaterThanOrEqual(before);
      expect(lastResetAt).toBeLessThanOrEqual(after);
      // 두 번째 토글이 첫 번째와 같거나 이후여야 한다
      expect(lastResetAt).toBeGreaterThanOrEqual(resetAfterHide!);
    });

    it('레이블/내용 수정은 lastResetAt을 변경하지 않는다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      const blockId = useBlockStore.getState().blocks[0].id;

      useBlockStore.getState().updateBlock(blockId, { label: '새 이름', content: '김철수' });

      expect(useBlockStore.getState().lastResetAt).toBeNull();
    });

    it('removeBlock은 lastResetAt을 갱신한다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: '이름', content: '홍길동' });
      const blockId = useBlockStore.getState().blocks[0].id;

      const before = Date.now();
      useBlockStore.getState().removeBlock(blockId);
      const after = Date.now();

      const { lastResetAt } = useBlockStore.getState();
      expect(lastResetAt).not.toBeNull();
      expect(lastResetAt).toBeGreaterThanOrEqual(before);
      expect(lastResetAt).toBeLessThanOrEqual(after);
    });

    it('reorderBlocks는 lastResetAt을 변경하지 않는다', () => {
      useBlockStore.getState().addBlock({ type: 'data', label: 'A', content: 'A내용' });
      useBlockStore.getState().addBlock({ type: 'data', label: 'B', content: 'B내용' });
      const { blocks } = useBlockStore.getState();

      useBlockStore.getState().reorderBlocks(blocks[0].id, blocks[1].id);

      expect(useBlockStore.getState().lastResetAt).toBeNull();
    });
  });

  // ──────────────────────────────────────────
  // setPivotIndex — 메시지 슬라이싱 기준점
  // ──────────────────────────────────────────
  describe('setPivotIndex', () => {
    it('초기값은 null이다', () => {
      expect(useBlockStore.getState().pivotIndex).toBeNull();
    });

    it('setPivotIndex로 값을 설정할 수 있다', () => {
      useBlockStore.getState().setPivotIndex(4);
      expect(useBlockStore.getState().pivotIndex).toBe(4);
    });

    it('setPivotIndex(0)도 유효한 값이다 (모든 메시지 포함)', () => {
      useBlockStore.getState().setPivotIndex(0);
      expect(useBlockStore.getState().pivotIndex).toBe(0);
    });

    it('setPivotIndex(null)로 리셋할 수 있다', () => {
      useBlockStore.getState().setPivotIndex(4);
      useBlockStore.getState().setPivotIndex(null);
      expect(useBlockStore.getState().pivotIndex).toBeNull();
    });
  });
});
