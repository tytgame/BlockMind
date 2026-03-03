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
  // 파일 블록 타입 (image / file)
  // ──────────────────────────────────────────
  describe('image 블록 포맷', () => {
    it('[IMAGE - label] 헤더와 Description으로 출력된다', () => {
      const blocks = [makeBlock({ type: 'image', label: '고양이 사진', content: '귀여운 고양이' })];
      const result = buildSystemPrompt(blocks);
      expect(result).toBe('[IMAGE - 고양이 사진]\nDescription: 귀여운 고양이');
    });

    it('isVisible=false인 image 블록은 제외된다', () => {
      const blocks = [makeBlock({ type: 'image', label: '사진', content: '이미지 설명', isVisible: false })];
      expect(buildSystemPrompt(blocks)).toBe('');
    });
  });

  describe('file 블록 포맷 — PDF', () => {
    const PDF_MIME = 'application/pdf';

    it('만료되지 않은 PDF는 Status: Active로 출력된다', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const blocks = [makeBlock({
        type: 'file', label: '계약서', content: '계약 요약',
        fileType: PDF_MIME, geminiExpiresAt: futureDate,
      })];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('[DOCUMENT - 계약서]');
      expect(result).toContain('Summary: 계약 요약');
      expect(result).toContain('Status: Active');
    });

    it('만료된 PDF (과거 날짜)는 Status: Memory expired로 출력된다', () => {
      const pastDate = new Date(Date.now() - 1000).toISOString();
      const blocks = [makeBlock({
        type: 'file', label: '보고서', content: '분기 실적',
        fileType: PDF_MIME, geminiExpiresAt: pastDate,
      })];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('Status: Memory expired (text summary only)');
    });

    it('geminiExpiresAt이 null이면 만료된 것으로 간주한다', () => {
      const blocks = [makeBlock({
        type: 'file', label: '문서', content: '내용',
        fileType: PDF_MIME, geminiExpiresAt: null,
      })];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('Status: Memory expired (text summary only)');
    });

    it('geminiExpiresAt이 undefined이면 만료된 것으로 간주한다', () => {
      const blocks = [makeBlock({
        type: 'file', label: '문서', content: '내용',
        fileType: PDF_MIME,
      })];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('Status: Memory expired (text summary only)');
    });
  });

  describe('file 블록 포맷 — docx', () => {
    const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    it('docx 블록은 [DOCUMENT - label] + Content 형식으로 출력된다', () => {
      const blocks = [makeBlock({
        type: 'file', label: '회의록', content: '주요 결정사항',
        fileType: DOCX_MIME,
      })];
      const result = buildSystemPrompt(blocks);
      expect(result).toBe('[DOCUMENT - 회의록]\nContent: 주요 결정사항');
    });

    it('docx 블록에는 Status 필드가 없다', () => {
      const blocks = [makeBlock({ type: 'file', label: '회의록', content: '내용', fileType: DOCX_MIME })];
      const result = buildSystemPrompt(blocks);
      expect(result).not.toContain('Status:');
    });
  });

  describe('혼합 블록 타입', () => {
    it('data + image + file 블록이 함께 있으면 모두 올바른 형식으로 출력된다', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const blocks = [
        makeBlock({ id: '1', type: 'data', label: '이름', content: '홍길동' }),
        makeBlock({ id: '2', type: 'image', label: '프로필', content: '본인 사진' }),
        makeBlock({ id: '3', type: 'file', label: 'PDF', content: 'PDF 요약', fileType: 'application/pdf', geminiExpiresAt: futureDate }),
      ];
      const result = buildSystemPrompt(blocks);
      expect(result).toContain('[DATA - 이름]\n홍길동');
      expect(result).toContain('[IMAGE - 프로필]\nDescription: 본인 사진');
      expect(result).toContain('[DOCUMENT - PDF]\nSummary: PDF 요약\nStatus: Active');
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
