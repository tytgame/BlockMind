/**
 * @jest-environment node
 *
 * 파일 블록 API 검증
 * - GET /api/blocks : 파일 블록에 signedUrl 주입
 * - POST /api/blocks : 파일 필드(fileUrl, geminiFileUri 등) 저장
 * - PATCH /api/blocks/[id]/refresh : 만료된 PDF 재업로드 후 DB 업데이트
 */

// ── 모듈 모킹 ──────────────────────────────────────────────

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: {
    block: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
  STORAGE_BUCKET: 'blockmind-files',
}));

import { GET, POST } from '@/app/api/blocks/route';
import { PATCH } from '@/app/api/blocks/[id]/refresh/route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';

// jest.Mock으로 단순화 — MockedFunction은 복잡한 반환 타입으로 인해
// mockResolvedValueOnce 파라미터가 never로 추론되는 문제 발생
const mockAuth = auth as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockBlock = (prisma.block as any) as {
  findMany: jest.Mock;
  create: jest.Mock;
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockCreateAdminClient = createAdminClient as jest.Mock;

const FAKE_USER_ID = 'user-file-test';
const FAKE_SESSION = { user: { id: FAKE_USER_ID } };

function makeBlockRow(override: object = {}) {
  return {
    id: 'blk-1',
    userId: FAKE_USER_ID,
    type: 'data',
    label: '테스트',
    content: '내용',
    order: 0,
    isVisible: true,
    fileUrl: null,
    fileName: null,
    fileType: null,
    fileSize: null,
    geminiFileUri: null,
    geminiExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...override,
  };
}

function mockSupabaseWithSignedUrl(signedUrl: string) {
  mockCreateAdminClient.mockReturnValue({
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl } }),
      })),
    },
  } as unknown as ReturnType<typeof createAdminClient>);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════
// GET /api/blocks
// ══════════════════════════════════════════════════════════
describe('GET /api/blocks', () => {
  it('인증 없으면 401 반환', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('fileUrl 없는 블록은 그대로 반환 (Supabase 호출 없음)', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findMany.mockResolvedValueOnce([makeBlockRow()]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json() as object[];
    expect(body[0]).not.toHaveProperty('signedUrl');
    expect(mockCreateAdminClient).not.toHaveBeenCalled();
  });

  it('이미지 블록에 signedUrl이 주입된다', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findMany.mockResolvedValueOnce([
      makeBlockRow({ type: 'image', fileUrl: `${FAKE_USER_ID}/photo.jpg` }),
    ]);
    mockSupabaseWithSignedUrl('https://signed.supabase.co/photo.jpg');

    const res = await GET();
    const body = await res.json() as Array<{ signedUrl?: string }>;
    expect(body[0].signedUrl).toBe('https://signed.supabase.co/photo.jpg');
  });

  it('PDF 블록에 signedUrl이 주입된다', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findMany.mockResolvedValueOnce([
      makeBlockRow({ type: 'file', fileType: 'application/pdf', fileUrl: `${FAKE_USER_ID}/doc.pdf` }),
    ]);
    mockSupabaseWithSignedUrl('https://signed.supabase.co/doc.pdf');

    const res = await GET();
    const body = await res.json() as Array<{ signedUrl?: string }>;
    expect(body[0].signedUrl).toBe('https://signed.supabase.co/doc.pdf');
  });

  it('fileUrl 있는 블록과 없는 블록이 섞이면 fileUrl 있는 블록만 signedUrl 포함', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findMany.mockResolvedValueOnce([
      makeBlockRow({ id: 'blk-data', type: 'data', fileUrl: null }),
      makeBlockRow({ id: 'blk-img', type: 'image', fileUrl: `${FAKE_USER_ID}/img.jpg` }),
    ]);
    mockSupabaseWithSignedUrl('https://signed.supabase.co/img.jpg');

    const res = await GET();
    const body = await res.json() as Array<{ id: string; signedUrl?: string }>;
    const dataBlock = body.find(b => b.id === 'blk-data');
    const imgBlock = body.find(b => b.id === 'blk-img');

    expect(dataBlock?.signedUrl).toBeUndefined();
    expect(imgBlock?.signedUrl).toBe('https://signed.supabase.co/img.jpg');
  });

  it('Supabase signedUrl 생성 실패 시 signedUrl은 null로 반환', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findMany.mockResolvedValueOnce([
      makeBlockRow({ type: 'image', fileUrl: `${FAKE_USER_ID}/fail.jpg` }),
    ]);
    mockCreateAdminClient.mockReturnValue({
      storage: {
        from: jest.fn(() => ({
          createSignedUrl: jest.fn().mockResolvedValue({ data: null }),
        })),
      },
    } as unknown as ReturnType<typeof createAdminClient>);

    const res = await GET();
    const body = await res.json() as Array<{ signedUrl?: string | null }>;
    expect(body[0].signedUrl).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// POST /api/blocks
// ══════════════════════════════════════════════════════════
describe('POST /api/blocks', () => {
  function makeRequest(body: object) {
    return new Request('http://localhost/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('인증 없으면 401 반환', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ type: 'data', label: '테스트', content: '내용', order: 0 }));
    expect(res.status).toBe(401);
  });

  it('image 블록 생성 시 파일 필드가 prisma.create에 전달된다', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    const createdBlock = makeBlockRow({
      id: 'new-img-blk',
      type: 'image',
      label: '첨부 사진',
      fileUrl: `${FAKE_USER_ID}/photo.jpg`,
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 512000,
    });
    mockBlock.create.mockResolvedValueOnce(createdBlock);

    const res = await POST(makeRequest({
      type: 'image',
      label: '첨부 사진',
      content: '이미지 설명',
      order: 0,
      fileUrl: `${FAKE_USER_ID}/photo.jpg`,
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 512000,
    }));

    expect(res.status).toBe(201);

    const createArg = mockBlock.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.type).toBe('image');
    expect(createArg.data.fileUrl).toBe(`${FAKE_USER_ID}/photo.jpg`);
    expect(createArg.data.fileName).toBe('photo.jpg');
    expect(createArg.data.fileType).toBe('image/jpeg');
    expect(createArg.data.fileSize).toBe(512000);
  });

  it('PDF 블록 생성 시 geminiFileUri와 geminiExpiresAt(Date)이 저장된다', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    const futureIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    mockBlock.create.mockResolvedValueOnce(makeBlockRow({ type: 'file' }));

    await POST(makeRequest({
      type: 'file',
      label: '계약서',
      content: '계약 요약',
      order: 1,
      fileUrl: `${FAKE_USER_ID}/contract.pdf`,
      fileName: 'contract.pdf',
      fileType: 'application/pdf',
      fileSize: 2048000,
      geminiFileUri: 'https://generativelanguage.googleapis.com/v1beta/files/abc',
      geminiExpiresAt: futureIso,
    }));

    const createArg = mockBlock.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.geminiFileUri).toBe('https://generativelanguage.googleapis.com/v1beta/files/abc');
    expect(createArg.data.geminiExpiresAt).toBeInstanceOf(Date);
  });

  it('geminiExpiresAt이 null이면 DB에 null로 저장', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.create.mockResolvedValueOnce(makeBlockRow({ type: 'file' }));

    await POST(makeRequest({
      type: 'file',
      label: '문서',
      content: '내용',
      order: 0,
      fileUrl: `${FAKE_USER_ID}/doc.pdf`,
      fileType: 'application/pdf',
      geminiExpiresAt: null,
    }));

    const createArg = mockBlock.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.geminiExpiresAt).toBeNull();
  });

  it('파일 필드 없는 data 블록 생성도 정상 작동 (fileUrl=null)', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.create.mockResolvedValueOnce(makeBlockRow());

    const res = await POST(makeRequest({
      type: 'data',
      label: '이름',
      content: '홍길동',
      order: 0,
    }));

    expect(res.status).toBe(201);
    const createArg = mockBlock.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createArg.data.fileUrl).toBeNull();
    expect(createArg.data.geminiFileUri).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════
// PATCH /api/blocks/[id]/refresh
// ══════════════════════════════════════════════════════════
describe('PATCH /api/blocks/[id]/refresh', () => {
  // fetch 글로벌 모킹 (내부적으로 /api/upload/gemini 호출)
  const originalFetch = global.fetch;

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function makeRequest(blockId: string) {
    return new Request(`http://localhost/api/blocks/${blockId}/refresh`, {
      method: 'PATCH',
      headers: { Cookie: '' },
    });
  }

  async function callPATCH(blockId: string) {
    return PATCH(makeRequest(blockId), { params: Promise.resolve({ id: blockId }) });
  }

  it('인증 없으면 401 반환', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await callPATCH('blk-1');
    expect(res.status).toBe(401);
  });

  it('다른 userId의 블록은 404 반환', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findUnique.mockResolvedValueOnce(
      makeBlockRow({ id: 'blk-other', userId: 'other-user' })
    );
    const res = await callPATCH('blk-other');
    expect(res.status).toBe(404);
  });

  it('fileUrl 없는 블록은 400 반환', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findUnique.mockResolvedValueOnce(
      makeBlockRow({ fileUrl: null, fileType: null, fileName: null })
    );
    const res = await callPATCH('blk-1');
    expect(res.status).toBe(400);
  });

  it('정상 블록 refresh 시 새 geminiFileUri로 DB 업데이트 후 200 반환', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);

    const futureIso = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const existingBlock = makeBlockRow({
      type: 'file',
      fileUrl: `${FAKE_USER_ID}/doc.pdf`,
      fileType: 'application/pdf',
      fileName: 'doc.pdf',
      geminiFileUri: 'old-uri',
      geminiExpiresAt: new Date(Date.now() - 1000), // 만료된 상태
    });
    const updatedBlock = { ...existingBlock, geminiFileUri: 'new-uri', geminiExpiresAt: new Date(futureIso) };

    mockBlock.findUnique.mockResolvedValueOnce(existingBlock);
    mockBlock.update.mockResolvedValueOnce(updatedBlock);

    // /api/upload/gemini fetch 모킹
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ geminiFileUri: 'new-uri', geminiExpiresAt: futureIso }),
    } as Response);

    const res = await callPATCH('blk-1');
    expect(res.status).toBe(200);

    // DB update 호출 검증
    const updateArg = mockBlock.update.mock.calls[0][0] as { where: { id: string }; data: Record<string, unknown> };
    expect(updateArg.where.id).toBe('blk-1');
    expect(updateArg.data.geminiFileUri).toBe('new-uri');
    expect(updateArg.data.geminiExpiresAt).toBeInstanceOf(Date);
  });

  it('Gemini 재업로드 실패 시 500 반환', async () => {
    mockAuth.mockResolvedValueOnce(FAKE_SESSION);
    mockBlock.findUnique.mockResolvedValueOnce(
      makeBlockRow({
        fileUrl: `${FAKE_USER_ID}/doc.pdf`,
        fileType: 'application/pdf',
        fileName: 'doc.pdf',
      })
    );

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
    } as Response);

    const res = await callPATCH('blk-1');
    expect(res.status).toBe(500);
  });
});
