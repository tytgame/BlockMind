/**
 * @jest-environment node
 *
 * POST /api/files/upload-url
 * - 인증, MIME 타입 검증, storagePath 형식, presigned URL 반환 검증
 */

import { POST } from '@/app/api/files/upload-url/route';

jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
  STORAGE_BUCKET: 'blockmind-files',
}));

import { auth } from '@/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// jest.Mock으로 단순화 — MockedFunction<typeof auth>는 복잡한 반환 타입으로 인해
// mockResolvedValueOnce 파라미터가 never로 추론되는 문제 발생
const mockAuth = auth as jest.Mock;
const mockCreateAdminClient = createAdminClient as jest.Mock;

const FAKE_USER_ID = 'user-test-123';
const FAKE_SESSION = { user: { id: FAKE_USER_ID } };

// Supabase 모의 객체 — unknown 경유 캐스팅으로 타입 충돌 방지
function makeMockSupabase(signedUrl = 'https://fake-upload-url.supabase.co', token = 'fake-token') {
  return {
    storage: {
      from: jest.fn(() => ({
        createSignedUploadUrl: jest.fn().mockResolvedValue({
          data: { signedUrl, token },
          error: null,
        }),
      })),
    },
  } as unknown as ReturnType<typeof createAdminClient>;
}

function makeRequest(body: object) {
  return new Request('http://localhost/api/files/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/files/upload-url', () => {
  // ──────────────────────────────────────────
  // 인증 검증
  // ──────────────────────────────────────────
  describe('인증', () => {
    it('세션 없으면 401 반환', async () => {
      mockAuth.mockResolvedValueOnce(null);
      const res = await POST(makeRequest({ fileName: 'test.jpg', mimeType: 'image/jpeg' }));
      expect(res.status).toBe(401);
    });

    it('userId 없는 세션도 401 반환', async () => {
      mockAuth.mockResolvedValueOnce({ user: {} });
      const res = await POST(makeRequest({ fileName: 'test.jpg', mimeType: 'image/jpeg' }));
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────
  // 입력값 검증
  // ──────────────────────────────────────────
  describe('입력값 검증', () => {
    it('fileName 누락 시 400 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      const res = await POST(makeRequest({ mimeType: 'image/jpeg' }));
      expect(res.status).toBe(400);
    });

    it('mimeType 누락 시 400 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      const res = await POST(makeRequest({ fileName: 'test.jpg' }));
      expect(res.status).toBe(400);
    });

    it('허용되지 않은 MIME 타입은 400 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      const res = await POST(makeRequest({ fileName: 'virus.exe', mimeType: 'application/exe' }));
      expect(res.status).toBe(400);
      const body = await res.json() as { error: string };
      expect(body.error).toContain('Unsupported');
    });

    it('text/plain 같은 일반 파일도 400 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      const res = await POST(makeRequest({ fileName: 'note.txt', mimeType: 'text/plain' }));
      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────
  // 허용된 MIME 타입 전체
  // ──────────────────────────────────────────
  describe('허용 MIME 타입', () => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    it.each(allowed)('%s 는 200 반환', async (mimeType) => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce(makeMockSupabase());
      const ext = mimeType.split('/')[1].split('.').pop() ?? 'bin';
      const res = await POST(makeRequest({ fileName: `file.${ext}`, mimeType }));
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────
  // 응답 형식
  // ──────────────────────────────────────────
  describe('응답 형식', () => {
    it('uploadUrl, storagePath, token을 반환한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce(makeMockSupabase('https://upload.example.com', 'tok-abc'));

      const res = await POST(makeRequest({ fileName: 'photo.jpg', mimeType: 'image/jpeg' }));
      expect(res.status).toBe(200);

      const body = await res.json() as { uploadUrl: string; storagePath: string; token: string };
      expect(body.uploadUrl).toBe('https://upload.example.com');
      expect(body.token).toBe('tok-abc');
      expect(body.storagePath).toBeDefined();
    });

    it('storagePath는 항상 userId/로 시작한다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce(makeMockSupabase());

      const res = await POST(makeRequest({ fileName: 'report.pdf', mimeType: 'application/pdf' }));
      const body = await res.json() as { storagePath: string };
      expect(body.storagePath.startsWith(`${FAKE_USER_ID}/`)).toBe(true);
    });

    it('storagePath는 timestamp-filename 형식이다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce(makeMockSupabase());

      const res = await POST(makeRequest({ fileName: 'report.pdf', mimeType: 'application/pdf' }));
      const body = await res.json() as { storagePath: string };
      expect(body.storagePath).toMatch(new RegExp(`^${FAKE_USER_ID}/\\d+-report\\.pdf$`));
    });

    it('파일명의 특수문자(한글 등)는 _로 치환된다', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce(makeMockSupabase());

      const res = await POST(makeRequest({ fileName: '보고서 최종.pdf', mimeType: 'application/pdf' }));
      const body = await res.json() as { storagePath: string };
      expect(body.storagePath).not.toContain('보');
      expect(body.storagePath).not.toContain(' ');
    });

    it('같은 파일명을 두 번 업로드하면 둘 다 userId/로 시작하는 storagePath 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValue(makeMockSupabase());

      const req1 = makeRequest({ fileName: 'photo.jpg', mimeType: 'image/jpeg' });
      const req2 = makeRequest({ fileName: 'photo.jpg', mimeType: 'image/jpeg' });

      const [res1, res2] = await Promise.all([POST(req1), POST(req2)]);
      const [b1, b2] = await Promise.all([
        res1.json() as Promise<{ storagePath: string }>,
        res2.json() as Promise<{ storagePath: string }>,
      ]);
      expect(b1.storagePath.startsWith(`${FAKE_USER_ID}/`)).toBe(true);
      expect(b2.storagePath.startsWith(`${FAKE_USER_ID}/`)).toBe(true);
    });
  });

  // ──────────────────────────────────────────
  // Supabase 오류 처리
  // ──────────────────────────────────────────
  describe('Supabase 오류 처리', () => {
    it('Supabase가 error를 반환하면 500 반환', async () => {
      mockAuth.mockResolvedValueOnce(FAKE_SESSION);
      mockCreateAdminClient.mockReturnValueOnce({
        storage: {
          from: jest.fn(() => ({
            createSignedUploadUrl: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Bucket not found'),
            }),
          })),
        },
      } as unknown as ReturnType<typeof createAdminClient>);

      const res = await POST(makeRequest({ fileName: 'test.jpg', mimeType: 'image/jpeg' }));
      expect(res.status).toBe(500);
    });
  });
});
