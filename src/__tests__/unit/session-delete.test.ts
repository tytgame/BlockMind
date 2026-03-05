/**
 * @jest-environment node
 *
 * DELETE /api/sessions/[id]
 * - 인증, 세션 소유권 확인
 * - 메시지 첨부파일 & 블록 파일 Supabase Storage 삭제
 * - 연결된 블록 DB 삭제 (sourceSessionId)
 * - 세션 DB 삭제 (Messages cascade)
 */

// ── 모킹 ──────────────────────────────────────────────────────────────────

jest.mock('@/auth', () => ({ auth: jest.fn() }));

// Supabase admin 모킹: storage.from(bucket).remove(paths)
const mockRemove = jest.fn();
const mockFrom = jest.fn().mockReturnValue({ remove: mockRemove });
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn().mockReturnValue({ storage: { from: mockFrom } }),
  STORAGE_BUCKET: 'test-bucket',
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    chatSession: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    block: {
      deleteMany: jest.fn(),
    },
  },
}));

import { DELETE } from '@/app/api/sessions/[id]/route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.chatSession.findUnique as jest.Mock;
const mockDelete = prisma.chatSession.delete as jest.Mock;
const mockDeleteMany = prisma.block.deleteMany as jest.Mock;

// ── 상수 ──────────────────────────────────────────────────────────────────

const FAKE_USER_ID = 'user-abc';
const FAKE_SESSION_ID = 'session-123';
const FAKE_AUTH = { user: { id: FAKE_USER_ID } };

// ── 헬퍼 ──────────────────────────────────────────────────────────────────

function makeParams(id = FAKE_SESSION_ID) {
  return { params: Promise.resolve({ id }) };
}

function makeDeleteRequest() {
  return new Request(`http://localhost/api/sessions/${FAKE_SESSION_ID}`, {
    method: 'DELETE',
  });
}

/** files JSON이 있는 메시지 */
function makeMessageWithFiles(storagePaths: string[]) {
  return {
    files: storagePaths.map((p) => ({ storagePath: p, fileName: 'f', fileType: 'image/jpeg' })),
  };
}

/** 파일 없는 메시지 */
function makeMessageNoFiles() {
  return { files: null };
}

/** blocks 포함 세션 fixture */
function makeSession(options: {
  messages?: Array<{ files: unknown }>;
  blocks?: Array<{ id: string; fileUrl: string | null }>;
} = {}) {
  return {
    id: FAKE_SESSION_ID,
    userId: FAKE_USER_ID,
    messages: options.messages ?? [],
    blocks: options.blocks ?? [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDelete.mockResolvedValue({});
  mockDeleteMany.mockResolvedValue({ count: 0 });
  mockRemove.mockResolvedValue({ data: null, error: null });
});

// ── 테스트 ────────────────────────────────────────────────────────────────

describe('DELETE /api/sessions/[id]', () => {

  // ── 인증 ────────────────────────────────────────────────────────────────

  describe('인증', () => {
    it('세션 없으면 401 반환', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await DELETE(makeDeleteRequest(), makeParams());
      expect(res.status).toBe(401);
    });

    it('userId 없는 세션도 401 반환', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });
      const res = await DELETE(makeDeleteRequest(), makeParams());
      expect(res.status).toBe(401);
    });
  });

  // ── 세션 소유권 ──────────────────────────────────────────────────────────

  describe('세션 소유권', () => {
    it('세션이 존재하지 않으면 404 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(null);
      const res = await DELETE(makeDeleteRequest(), makeParams());
      expect(res.status).toBe(404);
    });

    it('다른 사용자의 세션이면 404 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce({
        ...makeSession(),
        userId: 'other-user',
      });
      const res = await DELETE(makeDeleteRequest(), makeParams());
      expect(res.status).toBe(404);
    });
  });

  // ── 파일 없는 단순 삭제 ───────────────────────────────────────────────

  describe('파일/블록 없는 세션 삭제', () => {
    it('204 반환하고 세션을 삭제한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession());

      const res = await DELETE(makeDeleteRequest(), makeParams());

      expect(res.status).toBe(204);
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: FAKE_SESSION_ID } });
    });

    it('파일/블록이 없으면 Storage.remove를 호출하지 않는다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession());

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockRemove).not.toHaveBeenCalled();
    });

    it('블록이 없으면 block.deleteMany를 호출하지 않는다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession());

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });
  });

  // ── 메시지 첨부파일 Storage 삭제 ────────────────────────────────────────

  describe('메시지 첨부파일 Storage 삭제', () => {
    it('메시지 files JSON의 storagePath를 Storage에서 삭제한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        messages: [makeMessageWithFiles(['user-abc/ts-photo.jpg'])],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockFrom).toHaveBeenCalledWith('test-bucket');
      expect(mockRemove).toHaveBeenCalledWith(['user-abc/ts-photo.jpg']);
    });

    it('여러 메시지의 파일을 하나로 모아 한 번에 삭제한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        messages: [
          makeMessageWithFiles(['user-abc/img1.jpg', 'user-abc/img2.jpg']),
          makeMessageWithFiles(['user-abc/doc.pdf']),
        ],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      const calledPaths = mockRemove.mock.calls[0][0] as string[];
      expect(calledPaths).toHaveLength(3);
      expect(calledPaths).toContain('user-abc/img1.jpg');
      expect(calledPaths).toContain('user-abc/img2.jpg');
      expect(calledPaths).toContain('user-abc/doc.pdf');
    });

    it('files가 null인 메시지는 무시된다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        messages: [
          makeMessageNoFiles(),
          makeMessageWithFiles(['user-abc/photo.jpg']),
        ],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      const calledPaths = mockRemove.mock.calls[0][0] as string[];
      expect(calledPaths).toEqual(['user-abc/photo.jpg']);
    });
  });

  // ── 블록 파일 Storage 삭제 ───────────────────────────────────────────────

  describe('연결된 블록 파일 Storage 삭제', () => {
    it('블록 fileUrl도 Storage 삭제 경로에 포함된다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        blocks: [{ id: 'block-1', fileUrl: 'user-abc/block-file.jpg' }],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      const calledPaths = mockRemove.mock.calls[0][0] as string[];
      expect(calledPaths).toContain('user-abc/block-file.jpg');
    });

    it('fileUrl이 null인 블록은 Storage 삭제 대상에서 제외된다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        blocks: [
          { id: 'block-1', fileUrl: null },
          { id: 'block-2', fileUrl: 'user-abc/block-img.png' },
        ],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      const calledPaths = mockRemove.mock.calls[0][0] as string[];
      expect(calledPaths).toEqual(['user-abc/block-img.png']);
    });
  });

  // ── 메시지 파일 + 블록 파일 통합 ─────────────────────────────────────────

  describe('메시지 파일 + 블록 파일 통합 삭제', () => {
    it('메시지 파일과 블록 파일을 합쳐 한 번에 Storage에서 삭제한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        messages: [makeMessageWithFiles(['user-abc/msg-file.jpg'])],
        blocks: [{ id: 'block-1', fileUrl: 'user-abc/block-file.pdf' }],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockRemove).toHaveBeenCalledTimes(1);
      const calledPaths = mockRemove.mock.calls[0][0] as string[];
      expect(calledPaths).toHaveLength(2);
      expect(calledPaths).toContain('user-abc/msg-file.jpg');
      expect(calledPaths).toContain('user-abc/block-file.pdf');
    });
  });

  // ── 블록 DB 삭제 ─────────────────────────────────────────────────────────

  describe('연결된 블록 DB 삭제', () => {
    it('블록이 있으면 sourceSessionId로 block.deleteMany를 호출한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        blocks: [{ id: 'block-1', fileUrl: null }],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { sourceSessionId: FAKE_SESSION_ID },
      });
    });

    it('블록이 여러 개여도 deleteMany를 한 번만 호출한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        blocks: [
          { id: 'block-1', fileUrl: null },
          { id: 'block-2', fileUrl: 'user-abc/b2.jpg' },
          { id: 'block-3', fileUrl: null },
        ],
      }));

      await DELETE(makeDeleteRequest(), makeParams());

      expect(mockDeleteMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── Storage 실패 내성 ─────────────────────────────────────────────────────

  describe('Storage 삭제 실패 내성', () => {
    it('Storage 삭제가 실패해도 세션 DB 삭제는 계속 진행된다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        messages: [makeMessageWithFiles(['user-abc/photo.jpg'])],
      }));
      mockRemove.mockRejectedValueOnce(new Error('Storage error'));

      const res = await DELETE(makeDeleteRequest(), makeParams());

      // Storage 실패해도 204 반환
      expect(res.status).toBe(204);
      // 세션 삭제는 실행됨
      expect(mockDelete).toHaveBeenCalledWith({ where: { id: FAKE_SESSION_ID } });
    });
  });

  // ── 삭제 순서 보장 ────────────────────────────────────────────────────────

  describe('삭제 순서', () => {
    it('블록 DB 삭제 후 세션 DB 삭제가 실행된다', async () => {
      const callOrder: string[] = [];
      mockAuth.mockResolvedValueOnce(FAKE_AUTH);
      mockFindUnique.mockResolvedValueOnce(makeSession({
        blocks: [{ id: 'block-1', fileUrl: null }],
      }));
      mockDeleteMany.mockImplementation(async () => {
        callOrder.push('deleteMany');
        return { count: 1 };
      });
      mockDelete.mockImplementation(async () => {
        callOrder.push('delete');
        return {};
      });

      await DELETE(makeDeleteRequest(), makeParams());

      expect(callOrder).toEqual(['deleteMany', 'delete']);
    });
  });
});
