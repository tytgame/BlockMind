/**
 * @jest-environment node
 *
 * POST /api/chat
 * - 인증 검사
 * - 일일 사용량 제한 (DailyUsage)
 * - streamText 호출 및 스트리밍 응답
 * - pivotIndex 기반 메시지 슬라이싱
 * - saveMemoryBlock tool 정의
 * - 파일 메타데이터 → 시스템 프롬프트 주입
 * - 쿼터 에러 처리 (429)
 * - 일반 에러 처리 (500)
 */

// ── 모킹 ──────────────────────────────────────────────────────────────────

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn().mockReturnValue('mocked-model'),
}));

const mockStreamText = jest.fn();
const mockConvertToModelMessages = jest.fn();
jest.mock('ai', () => ({
  streamText: (...args: unknown[]) => mockStreamText(...args),
  convertToModelMessages: (...args: unknown[]) => mockConvertToModelMessages(...args),
  tool: (t: unknown) => t,
  zodSchema: (s: unknown) => s,
}));

jest.mock('@/auth', () => ({ auth: jest.fn() }));

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn();
const mockTransaction = jest.fn();
jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

jest.mock('@/lib/slice-messages-by-reset', () => ({
  sliceMessagesByReset: jest.fn(
    (messages: unknown[], pivotIndex?: number | null) =>
      pivotIndex != null ? (messages as unknown[]).slice(pivotIndex) : messages
  ),
}));

import { POST } from '@/app/api/chat/route';
import { auth } from '@/auth';
import { sliceMessagesByReset } from '@/lib/slice-messages-by-reset';

const mockAuth = auth as jest.Mock;
const mockSlice = sliceMessagesByReset as jest.Mock;

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

const FAKE_AUTH = { user: { id: 'user-123' } };

function makeRequest(body: object) {
  return new Request('http://localhost/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeMessages(count = 2) {
  const msgs = [];
  for (let i = 0; i < count; i++) {
    msgs.push({
      id: `msg-${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      parts: [{ type: 'text', text: `message ${i}` }],
    });
  }
  return msgs;
}

/** streamText mock이 반환할 기본 객체 */
function mockStreamResponse() {
  const response = new Response('streamed', { status: 200 });
  mockStreamText.mockReturnValueOnce({
    toUIMessageStreamResponse: () => response,
  });
  return response;
}

/** prisma.$transaction: 사용량 통과 */
function mockQuotaPass(currentCount = 0) {
  mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      dailyUsage: {
        findUnique: jest.fn().mockResolvedValue({ count: currentCount }),
        upsert: jest.fn().mockResolvedValue({ count: currentCount + 1 }),
      },
    };
    return fn(tx);
  });
}

/** prisma.$transaction: 사용량 초과 */
function mockQuotaExceeded() {
  mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) => {
    const tx = {
      dailyUsage: {
        findUnique: jest.fn().mockResolvedValue({ count: 30 }),
        upsert: jest.fn(),
      },
    };
    return fn(tx);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue(FAKE_AUTH);
  mockConvertToModelMessages.mockResolvedValue([{ role: 'user', content: 'hello' }]);
});

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('POST /api/chat', () => {

  // ── 인증 ──────────────────────────────────────────────────────────────

  describe('인증', () => {
    it('세션이 없으면 401 반환', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(401);
    });

    it('user.id가 없으면 401 반환', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });
      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(401);
    });
  });

  // ── 일일 사용량 제한 ──────────────────────────────────────────────────

  describe('일일 사용량 제한', () => {
    it('한도 미만이면 정상 응답', async () => {
      mockQuotaPass(5);
      mockStreamResponse();
      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(200);
    });

    it('한도 도달(30회)이면 429 반환', async () => {
      mockQuotaExceeded();
      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(429);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('QUOTA_EXCEEDED');
    });
  });

  // ── streamText 호출 ──────────────────────────────────────────────────

  describe('streamText 호출', () => {
    it('streamText를 올바른 파라미터로 호출한다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      const messages = makeMessages();
      await POST(makeRequest({ messages, systemPrompt: '블록 메모리' }));

      expect(mockStreamText).toHaveBeenCalledTimes(1);
      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.model).toBe('mocked-model');
      expect(callArgs.system).toContain('BlockMind');
      expect(callArgs.system).toContain('블록 메모리');
      expect(callArgs.maxOutputTokens).toBe(8192);
    });

    it('systemPrompt가 없으면 기본 시스템 프롬프트에 "(No active memory blocks)" 포함', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({ messages: makeMessages() }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.system).toContain('No active memory blocks');
    });

    it('toUIMessageStreamResponse()로 스트리밍 응답을 반환한다', async () => {
      mockQuotaPass();
      const expectedResponse = mockStreamResponse();

      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res).toBe(expectedResponse);
    });
  });

  // ── pivotIndex 메시지 슬라이싱 ────────────────────────────────────────

  describe('pivotIndex 메시지 슬라이싱', () => {
    it('pivotIndex가 있으면 sliceMessagesByReset에 전달된다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      const messages = makeMessages(6);
      await POST(makeRequest({ messages, pivotIndex: 4 }));

      expect(mockSlice).toHaveBeenCalledWith(messages, 4);
    });

    it('pivotIndex가 없으면 null/undefined로 전달된다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      const messages = makeMessages();
      await POST(makeRequest({ messages }));

      expect(mockSlice).toHaveBeenCalledWith(messages, undefined);
    });

    it('슬라이싱된 메시지가 convertToModelMessages에 전달된다', async () => {
      mockQuotaPass();
      mockStreamResponse();
      mockSlice.mockReturnValueOnce([{ id: 'sliced', role: 'user', parts: [] }]);

      await POST(makeRequest({ messages: makeMessages(6), pivotIndex: 4 }));

      expect(mockConvertToModelMessages).toHaveBeenCalledWith([
        { id: 'sliced', role: 'user', parts: [] },
      ]);
    });
  });

  // ── saveMemoryBlock tool ───────────────────────────────────────────────

  describe('saveMemoryBlock tool', () => {
    it('streamText에 tools.saveMemoryBlock이 전달된다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({ messages: makeMessages() }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      const tools = callArgs.tools as Record<string, unknown>;
      expect(tools).toHaveProperty('saveMemoryBlock');
    });

    it('saveMemoryBlock tool에 description과 inputSchema가 있다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({ messages: makeMessages() }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      const tools = callArgs.tools as Record<string, Record<string, unknown>>;
      const toolDef = tools.saveMemoryBlock;
      expect(toolDef.description).toContain('durable memory block');
      expect(toolDef.inputSchema).toBeDefined();
    });

    it('saveMemoryBlock tool의 execute는 input을 그대로 반환한다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({ messages: makeMessages() }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      const tools = callArgs.tools as Record<string, { execute: (input: unknown) => Promise<unknown> }>;
      const result = await tools.saveMemoryBlock.execute({ label: '테스트', content: '내용' });
      expect(result).toEqual({ label: '테스트', content: '내용' });
    });
  });

  // ── 파일 메타데이터 ───────────────────────────────────────────────────

  describe('파일 메타데이터', () => {
    it('fileMetadata가 있으면 시스템 프롬프트에 파일 정보가 포함된다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({
        messages: makeMessages(),
        fileMetadata: { fileName: 'report.pdf', fileType: 'application/pdf' },
      }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.system).toContain('report.pdf');
      expect(callArgs.system).toContain('application/pdf');
      expect(callArgs.system).toContain('attachFile');
    });

    it('fileMetadata가 없으면 파일 관련 문구가 시스템 프롬프트에 없다', async () => {
      mockQuotaPass();
      mockStreamResponse();

      await POST(makeRequest({ messages: makeMessages() }));

      const callArgs = mockStreamText.mock.calls[0][0] as Record<string, unknown>;
      expect(callArgs.system).not.toContain('Attached file');
    });
  });

  // ── 에러 처리 ─────────────────────────────────────────────────────────

  describe('에러 처리', () => {
    it('쿼터 에러(RESOURCE_EXHAUSTED)이면 429 반환', async () => {
      mockQuotaPass();
      mockStreamText.mockImplementationOnce(() => {
        const err = new Error('RESOURCE_EXHAUSTED');
        throw err;
      });

      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(429);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('QUOTA_EXCEEDED');
    });

    it('rate_limit 에러이면 429 반환', async () => {
      mockQuotaPass();
      mockStreamText.mockImplementationOnce(() => {
        throw new Error('rate_limit exceeded');
      });

      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(429);
    });

    it('일반 에러이면 500 반환', async () => {
      mockQuotaPass();
      mockStreamText.mockImplementationOnce(() => {
        throw new Error('unexpected failure');
      });

      const res = await POST(makeRequest({ messages: makeMessages() }));
      expect(res.status).toBe(500);
      const data = (await res.json()) as { error: string };
      expect(data.error).toBe('INTERNAL_ERROR');
    });
  });
});
