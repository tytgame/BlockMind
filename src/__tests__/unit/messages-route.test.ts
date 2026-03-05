/**
 * @jest-environment node
 *
 * POST /api/sessions/[id]/messages
 * - 인증, 본인 세션 확인, userMessageFiles(Json?) 저장 검증
 */

import { POST } from '@/app/api/sessions/[id]/messages/route';

// ── 모킹 ──────────────────────────────────────────────────────────────────

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    chatSession: { findUnique: jest.fn(), update: jest.fn() },
    message: { createMany: jest.fn() },
  },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.chatSession.findUnique as jest.Mock;
const mockUpdate = prisma.chatSession.update as jest.Mock;
const mockCreateMany = prisma.message.createMany as jest.Mock;

const FAKE_USER_ID = 'user-abc';
const FAKE_SESSION_ID = 'session-123';
const FAKE_AUTH = { user: { id: FAKE_USER_ID } };
const FAKE_CHAT_SESSION = { id: FAKE_SESSION_ID, userId: FAKE_USER_ID };

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function makeRequest(body: object) {
  return new Request(`http://localhost/api/sessions/${FAKE_SESSION_ID}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id = FAKE_SESSION_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue({});
  mockCreateMany.mockResolvedValue({ count: 2 });
});

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('POST /api/sessions/[id]/messages', () => {
  // ── 인증 ──────────────────────────────────────────────────────────────

  describe('인증', () => {
    it('세션 없으면 401 반환', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await POST(makeRequest({ userMessage: 'hi', assistantMessage: 'hello' }), makeParams());
      expect(res.status).toBe(401);
    });

    it('userId 없는 세션도 401 반환', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });
      const res = await POST(makeRequest({ userMessage: 'hi', assistantMessage: 'hello' }), makeParams());
      expect(res.status).toBe(401);
    });
  });

  // ── 본인 세션 확인 ────────────────────────────────────────────────────

  describe('세션 소유권', () => {
    it('세션이 없으면 404 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(null);
      const res = await POST(makeRequest({ userMessage: 'hi', assistantMessage: 'hello' }), makeParams());
      expect(res.status).toBe(404);
    });

    it('다른 사용자의 세션이면 404 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce({ id: FAKE_SESSION_ID, userId: 'other-user' });
      const res = await POST(makeRequest({ userMessage: 'hi', assistantMessage: 'hello' }), makeParams());
      expect(res.status).toBe(404);
    });
  });

  // ── 메시지 저장 ───────────────────────────────────────────────────────

  describe('메시지 저장', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(FAKE_CHAT_SESSION);
    });

    it('파일 없을 때 user/assistant 메시지 2개 저장 후 201 반환', async () => {
      const res = await POST(
        makeRequest({ userMessage: '안녕', assistantMessage: '반가워', userMessageId: 'msg-1' }),
        makeParams()
      );
      expect(res.status).toBe(201);
      expect(mockCreateMany).toHaveBeenCalledTimes(1);

      const { data } = mockCreateMany.mock.calls[0][0] as {
        data: Array<{ role: string; content: string; clientId?: string; files?: unknown }>;
      };
      expect(data).toHaveLength(2);
      expect(data[0].role).toBe('user');
      expect(data[0].content).toBe('안녕');
      expect(data[0].clientId).toBe('msg-1');
      expect(data[1].role).toBe('assistant');
      expect(data[1].content).toBe('반가워');
    });

    it('파일 없을 때 user 메시지의 files는 undefined', async () => {
      await POST(
        makeRequest({ userMessage: '안녕', assistantMessage: '반가워' }),
        makeParams()
      );
      const { data } = mockCreateMany.mock.calls[0][0] as {
        data: Array<{ files?: unknown }>;
      };
      // files가 undefined여야 함
      expect(data[0].files).toBeUndefined();
    });

    it('userMessageFiles 배열이 있으면 user 메시지 files 컬럼에 저장된다', async () => {
      const files = [
        { fileName: 'photo.jpg', fileType: 'image/jpeg', storagePath: 'user-abc/123-photo.jpg' },
        { fileName: 'doc.pdf', fileType: 'application/pdf', storagePath: 'user-abc/456-doc.pdf' },
      ];

      const res = await POST(
        makeRequest({ userMessage: '사진 보내줘', assistantMessage: '네!', userMessageFiles: files }),
        makeParams()
      );
      expect(res.status).toBe(201);

      const { data } = mockCreateMany.mock.calls[0][0] as {
        data: Array<{ role: string; files?: typeof files }>;
      };
      expect(data[0].role).toBe('user');
      expect(data[0].files).toEqual(files);
    });

    it('userMessageFiles가 빈 배열이면 user 메시지 files는 undefined', async () => {
      const res = await POST(
        makeRequest({ userMessage: '안녕', assistantMessage: '반가워', userMessageFiles: [] }),
        makeParams()
      );
      expect(res.status).toBe(201);

      const { data } = mockCreateMany.mock.calls[0][0] as {
        data: Array<{ files?: unknown }>;
      };
      expect(data[0].files).toBeUndefined();
    });

    it('assistant 메시지에는 files가 저장되지 않는다', async () => {
      const files = [{ fileName: 'x.jpg', fileType: 'image/jpeg', storagePath: 'u/x.jpg' }];

      await POST(
        makeRequest({ userMessage: 'hi', assistantMessage: 'hello', userMessageFiles: files }),
        makeParams()
      );

      const { data } = mockCreateMany.mock.calls[0][0] as {
        data: Array<{ role: string; files?: unknown }>;
      };
      const assistantMsg = data.find((d) => d.role === 'assistant');
      expect(assistantMsg?.files).toBeUndefined();
    });

    it('저장 후 chatSession.updatedAt이 갱신된다', async () => {
      await POST(
        makeRequest({ userMessage: 'hi', assistantMessage: 'hello' }),
        makeParams()
      );
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: FAKE_SESSION_ID },
        data: { updatedAt: expect.any(Date) as Date },
      });
    });
  });
});
