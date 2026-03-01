import { buildSystemPrompt } from '@/lib/build-system-prompt';
import { type Block } from '@/types/block';

// 테스트용 블록 생성 헬퍼
function makeBlock(override: Partial<Block> = {}): Block {
  return {
    id: 'test-id',
    type: 'data',
    label: '테스트 블록',
    content: '테스트 내용',
    color: 'bg-blue-500',
    isVisible: true,
    ...override,
  };
}

describe('buildSystemPrompt — 블록 기억 핵심 로직', () => {
  // ──────────────────────────────────────────
  // 기본 동작
  // ──────────────────────────────────────────
  describe('블록이 없을 때', () => {
    it('빈 문자열을 반환한다', () => {
      expect(buildSystemPrompt([])).toBe('');
    });
  });

  describe('블록이 있을 때', () => {
    it('isVisible=true인 블록의 내용이 포함된다 (AI가 기억함)', () => {
      const blocks = [makeBlock({ label: '내 이름', content: '홍길동', isVisible: true })];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('홍길동');
    });

    it('isVisible=false인 블록의 내용이 제외된다 (AI가 기억하지 않음)', () => {
      const blocks = [makeBlock({ label: '내 이름', content: '홍길동', isVisible: false })];
      const result = buildSystemPrompt(blocks);
      expect(result).not.toContain('홍길동');
    });

    it('isVisible=false일 때 빈 문자열을 반환한다', () => {
      const blocks = [makeBlock({ isVisible: false })];
      expect(buildSystemPrompt(blocks)).toBe('');
    });
  });

  // ──────────────────────────────────────────
  // 블록 토글 시나리오
  // ──────────────────────────────────────────
  describe('여러 블록이 섞여 있을 때', () => {
    it('visible 블록만 포함하고 invisible 블록은 제외한다', () => {
      const blocks = [
        makeBlock({ id: '1', label: '이름', content: '홍길동', isVisible: true }),
        makeBlock({ id: '2', label: '나이', content: '30세', isVisible: false }),
        makeBlock({ id: '3', label: '직업', content: '개발자', isVisible: true }),
      ];
      const result = buildSystemPrompt(blocks);

      expect(result).toContain('홍길동');
      expect(result).not.toContain('30세');
      expect(result).toContain('개발자');
    });

    it('모든 블록이 visible이면 전부 포함된다', () => {
      const blocks = [
        makeBlock({ id: '1', content: '내용A', isVisible: true }),
        makeBlock({ id: '2', content: '내용B', isVisible: true }),
      ];
      const result = buildSystemPrompt(blocks);

      expect(result).toContain('내용A');
      expect(result).toContain('내용B');
    });

    it('모든 블록이 invisible이면 빈 문자열을 반환한다', () => {
      const blocks = [
        makeBlock({ id: '1', isVisible: false }),
        makeBlock({ id: '2', isVisible: false }),
      ];
      expect(buildSystemPrompt(blocks)).toBe('');
    });
  });

  // ──────────────────────────────────────────
  // 출력 포맷 검증
  // ──────────────────────────────────────────
  describe('시스템 프롬프트 포맷', () => {
    it('[TYPE - Label] 헤더 형식으로 출력된다', () => {
      const blocks = [makeBlock({ type: 'data', label: '내 정보', content: '홍길동' })];
      const result = buildSystemPrompt(blocks);

      expect(result).toMatch(/^\[DATA - 내 정보\]/);
    });

    it('헤더 다음 줄에 내용이 온다', () => {
      const blocks = [makeBlock({ label: '내 정보', content: '홍길동' })];
      const result = buildSystemPrompt(blocks);

      expect(result).toContain('[DATA - 내 정보]\n홍길동');
    });

    it('여러 블록은 빈 줄(\n\n)로 구분된다', () => {
      const blocks = [
        makeBlock({ id: '1', label: '이름', content: '홍길동', isVisible: true }),
        makeBlock({ id: '2', label: '직업', content: '개발자', isVisible: true }),
      ];
      const result = buildSystemPrompt(blocks);

      expect(result).toContain('[DATA - 이름]\n홍길동\n\n[DATA - 직업]\n개발자');
    });
  });
});
