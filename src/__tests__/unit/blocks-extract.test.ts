/**
 * @jest-environment node
 *
 * POST /api/blocks/extract
 * - 요청 유효성 검사
 * - category 필드 포함/미포함 동작
 * - attachFile 블록 처리 (category 미포함)
 * - LLM 오류 처리
 */

// ── 모킹 ──────────────────────────────────────────────────────────────────

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn().mockReturnValue('mocked-model'),
}));

const mockGenerateObject = jest.fn();
jest.mock('ai', () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

import { POST } from '@/app/api/blocks/extract/route';

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request('http://localhost/api/blocks/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/** LLM이 반환할 블록 목록을 모킹 */
function mockLLMBlocks(blocks: object[]) {
  mockGenerateObject.mockResolvedValueOnce({ object: { blocks } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('POST /api/blocks/extract', () => {

  // ── 요청 유효성 검사 ──────────────────────────────────────────────────

  describe('요청 유효성 검사', () => {
    it('userMessage가 없으면 400 반환', async () => {
      const res = await POST(makeRequest({ assistantMessage: 'hello' }));
      expect(res.status).toBe(400);
    });

    it('assistantMessage가 없으면 400 반환', async () => {
      const res = await POST(makeRequest({ userMessage: 'hi' }));
      expect(res.status).toBe(400);
    });

    it('빈 문자열 userMessage는 400 반환', async () => {
      const res = await POST(makeRequest({ userMessage: '', assistantMessage: 'hello' }));
      expect(res.status).toBe(400);
    });

    it('유효한 요청이면 generateObject를 호출한다', async () => {
      mockLLMBlocks([]);
      await POST(makeRequest({ userMessage: '고양이 좋아', assistantMessage: '귀엽네요' }));
      expect(mockGenerateObject).toHaveBeenCalledTimes(1);
    });
  });

  // ── category 필드 ─────────────────────────────────────────────────────

  describe('category 필드', () => {
    it('LLM이 category를 반환하면 응답에 포함된다', async () => {
      mockLLMBlocks([{ label: '고양이 선호도', content: '고양이를 좋아함', category: 'animal' }]);
      const res = await POST(makeRequest({ userMessage: '고양이 좋아', assistantMessage: '귀엽네요' }));

      const data = (await res.json()) as { blocks: Array<{ category?: string }> };
      expect(data.blocks[0].category).toBe('animal');
    });

    it('LLM이 category를 반환하지 않으면 응답에 포함되지 않는다', async () => {
      mockLLMBlocks([{ label: '메모', content: '기억할 것' }]);
      const res = await POST(makeRequest({ userMessage: '메모해줘', assistantMessage: '기록했습니다' }));

      const data = (await res.json()) as { blocks: Array<{ category?: string }> };
      expect(data.blocks[0].category).toBeUndefined();
    });

    it('16개 카테고리 중 어떤 값도 응답에 포함될 수 있다', async () => {
      const categories = [
        'animal', 'fitness', 'travel', 'coding', 'food', 'music',
        'study', 'health', 'work', 'game', 'finance', 'shopping',
        'home', 'sports', 'entertainment', 'person',
      ];

      for (const category of categories) {
        mockLLMBlocks([{ label: '테스트', content: '내용', category }]);
        const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));
        const data = (await res.json()) as { blocks: Array<{ category?: string }> };
        expect(data.blocks[0].category).toBe(category);
      }
    });
  });

  // ── attachFile 블록 처리 ──────────────────────────────────────────────

  describe('attachFile 블록 처리', () => {
    const fileMetadata = {
      storagePath: 'user-abc/cat.jpg',
      fileName: 'cat.jpg',
      fileType: 'image/jpeg',
      fileSize: 12345,
    };

    it('attachFile=true이면 파일 필드가 주입된다', async () => {
      mockLLMBlocks([{ label: '고양이 사진', content: '귀여운 고양이', attachFile: true }]);
      const res = await POST(makeRequest({
        userMessage: '이 사진 저장해줘',
        assistantMessage: '저장했어요',
        fileMetadata,
      }));

      const data = (await res.json()) as { blocks: Array<Record<string, unknown>> };
      const block = data.blocks[0];
      expect(block.type).toBe('image');
      expect(block.fileUrl).toBe('user-abc/cat.jpg');
      expect(block.fileName).toBe('cat.jpg');
      expect(block.fileType).toBe('image/jpeg');
    });

    it('attachFile=true인 파일 블록에는 category가 포함되지 않는다', async () => {
      mockLLMBlocks([{ label: '고양이 사진', content: '귀여운 고양이', attachFile: true, category: 'animal' }]);
      const res = await POST(makeRequest({
        userMessage: '이 사진 저장해줘',
        assistantMessage: '저장했어요',
        fileMetadata,
      }));

      const data = (await res.json()) as { blocks: Array<Record<string, unknown>> };
      // attachFile 블록은 image/file 타입이 되므로 category 불필요
      expect(data.blocks[0].category).toBeUndefined();
    });

    it('PDF 파일이면 type이 file로 설정된다', async () => {
      const pdfMetadata = { ...fileMetadata, fileName: 'doc.pdf', fileType: 'application/pdf' };
      mockLLMBlocks([{ label: '문서', content: '중요 문서', attachFile: true }]);
      const res = await POST(makeRequest({
        userMessage: '이 PDF 저장해줘',
        assistantMessage: '저장했어요',
        fileMetadata: pdfMetadata,
      }));

      const data = (await res.json()) as { blocks: Array<{ type?: string }> };
      expect(data.blocks[0].type).toBe('file');
    });

    it('attachFile=true여도 fileMetadata가 없으면 파일 필드가 주입되지 않는다', async () => {
      mockLLMBlocks([{ label: '메모', content: '내용', attachFile: true }]);
      const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));

      const data = (await res.json()) as { blocks: Array<Record<string, unknown>> };
      // fileMetadata 없으면 일반 data 블록처럼 처리됨
      expect(data.blocks[0].fileUrl).toBeUndefined();
      expect(data.blocks[0].type).toBeUndefined();
    });
  });

  // ── MAX_BLOCKS_PER_CYCLE 제한 ────────────────────────────────────────

  describe('블록 수 제한', () => {
    it('LLM이 여러 블록을 반환해도 최대 1개만 응답한다', async () => {
      mockLLMBlocks([
        { label: '블록1', content: '내용1', category: 'animal' },
        { label: '블록2', content: '내용2', category: 'fitness' },
        { label: '블록3', content: '내용3', category: 'travel' },
      ]);
      const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));
      const data = (await res.json()) as { blocks: unknown[] };
      expect(data.blocks).toHaveLength(1);
    });

    it('LLM이 빈 배열을 반환하면 blocks가 빈 배열이다', async () => {
      mockLLMBlocks([]);
      const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));
      const data = (await res.json()) as { blocks: unknown[] };
      expect(data.blocks).toHaveLength(0);
    });
  });

  // ── LLM 오류 처리 ────────────────────────────────────────────────────

  describe('LLM 오류 처리', () => {
    it('generateObject가 throw하면 빈 blocks와 200 반환', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('LLM 오류'));
      const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));

      expect(res.status).toBe(200);
      const data = (await res.json()) as { blocks: unknown[] };
      expect(data.blocks).toHaveLength(0);
    });
  });

  // ── existingBlocks (중복 방지용 컨텍스트) ────────────────────────────

  describe('existingBlocks', () => {
    it('existingBlocks 없이도 정상 동작한다', async () => {
      mockLLMBlocks([{ label: '새 블록', content: '내용', category: 'coding' }]);
      const res = await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test' }));

      expect(res.status).toBe(200);
      const data = (await res.json()) as { blocks: unknown[] };
      expect(data.blocks).toHaveLength(1);
    });

    it('existingBlocks가 generateObject 프롬프트에 포함된다', async () => {
      mockLLMBlocks([]);
      const existingBlocks = [{ label: '기존 블록', content: '기존 내용' }];
      await POST(makeRequest({ userMessage: 'test', assistantMessage: 'test', existingBlocks }));

      const callArgs = mockGenerateObject.mock.calls[0][0] as { prompt: string };
      expect(callArgs.prompt).toContain('기존 블록');
    });
  });
});
