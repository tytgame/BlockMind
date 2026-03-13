/**
 * E2E: 파일 첨부 -> 전송 -> 블록 생성 및 Gemini URI 만료 처리
 *
 * Mock 전략:
 *   - /api/files/upload-url    : fake presigned URL 반환
 *   - /__test_upload_ok        : Supabase PUT 업로드 mock (200 OK)
 *   - /api/upload/gemini       : geminiFileUri + geminiExpiresAt 반환
 *   - /api/chat                : Vercel AI SDK UIMessageStream fake 응답
 *   - /api/blocks/extract      : 고정 블록 데이터 반환
 *   - /api/blocks/{id}/refresh : 갱신된 geminiExpiresAt 반환 (Test 3)
 *
 * 실제 Supabase:
 *   - /api/sessions POST, /api/blocks POST, /api/sessions/{id}/messages POST
 *
 * 검증 항목:
 *   1. 이미지 첨부 - 메시지 전송 - 블록 생성 토스트 표시
 *   2. PDF 첨부 (만료된 Gemini URI) - 블록 패널에서 "기억 만료됨" UI 표시
 *   3. 만료된 PDF 블록 새로고침 - "기억 활성 중" UI 복원
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });

import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const TEST_EMAIL = 'test@blockmind.kr';

function createPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Vercel AI SDK v4 UIMessageStream SSE 포맷
const FAKE_AI_TEXT = '파일을 첨부해 주셨군요! 잘 확인했습니다.';
const sseEvent = (obj: object) => `data: ${JSON.stringify(obj)}\n\n`;
const fakeAIStream = [
  sseEvent({ type: 'text-start', id: 'text-part-001' }),
  sseEvent({ type: 'text-delta', id: 'text-part-001', delta: FAKE_AI_TEXT }),
  sseEvent({ type: 'text-end', id: 'text-part-001' }),
].join('');

/** 공통 API Mock: 파일 업로드 presigned URL + Supabase PUT + AI 채팅 */
async function setupCommonMocks(page: Page) {
  await page.route(/\/api\/files\/upload-url$/, async (route) => {
    const reqBody = await route.request().postDataJSON() as { fileName: string; mimeType: string };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uploadUrl: 'http://localhost:3000/__test_upload_ok',
        storagePath: `test/${reqBody.fileName}`,
      }),
    });
  });

  await page.route(/\/__test_upload_ok$/, async (route) => {
    await route.fulfill({ status: 200 });
  });

  await page.route(/\/api\/chat$/, async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'x-vercel-ai-ui-message-stream': 'v1',
      },
      body: fakeAIStream,
    });
  });
}

/** 블록 패널 expand 버튼이 있으면 클릭 (이미 열려있으면 스킵) */
async function openBlockPanel(page: Page) {
  const expandBtn = page.locator('[aria-label="블록 패널 펼치기"]');
  try {
    await expandBtn.click({ timeout: 5_000 });
  } catch {
    // 이미 펼쳐진 경우
  }
}

test.describe('파일 첨부 -> 블록 생성 및 만료 처리', () => {
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = createPrisma();
  });

  test.afterAll(async () => {
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.block.deleteMany({ where: { userId: user.id } });
      await prisma.chatSession.deleteMany({ where: { userId: user.id } });
    }
    await prisma.$disconnect();
  });

  // ── Test 1: 이미지 첨부 -> 블록 생성 토스트 ─────────────────────────

  test('이미지 첨부 후 전송하면 블록 생성 토스트가 표시된다', async ({ page }) => {
    await setupCommonMocks(page);

    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [
            {
              label: '프로필 사진',
              content: '사용자가 첨부한 프로필 이미지',
              type: 'image',
              fileUrl: 'test/mock-image.jpg',
              fileName: 'mock-image.jpg',
              fileType: 'image/jpeg',
              fileSize: 1024,
            },
          ],
        }),
      });
    });

    await page.goto('/chat');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mock-image.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
    });

    await page.locator('textarea').first().click();
    await page.keyboard.type('이미지 첨부 테스트');
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5_000 });
    await page.locator('button[type="submit"]').click();

    await page.waitForRequest(/\/api\/blocks\/extract$/, { timeout: 20_000 });

    // 토스트에서 블록 라벨 확인 (first()로 strict mode 우회)
    await expect(
      page.getByText('프로필 사진', { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── Test 2: PDF 첨부 (만료된 Gemini URI) -> "기억 만료됨" UI ─────────

  test('만료된 Gemini URI를 가진 PDF 블록은 "기억 만료됨"으로 표시된다', async ({ page }) => {
    await setupCommonMocks(page);

    await page.route(/\/api\/upload\/gemini$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          geminiFileUri: 'files/mock-expired-001',
          geminiExpiresAt: '2020-01-01T00:00:00.000Z',
        }),
      });
    });

    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [
            {
              label: '테스트 PDF 문서',
              content: 'PDF 파일의 주요 내용 요약',
              type: 'file',
              fileUrl: 'test/mock-document.pdf',
              fileName: 'mock-document.pdf',
              fileType: 'application/pdf',
              fileSize: 2048,
              geminiFileUri: 'files/mock-expired-001',
              geminiExpiresAt: '2020-01-01T00:00:00.000Z',
            },
          ],
        }),
      });
    });

    await page.goto('/chat');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'mock-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake content'),
    });

    await page.locator('textarea').first().click();
    await page.keyboard.type('PDF 파일 첨부 테스트');
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5_000 });
    await page.locator('button[type="submit"]').click();

    await page.waitForRequest(/\/api\/blocks\/extract$/, { timeout: 20_000 });

    // 토스트에서 블록 라벨 확인 (블록이 생성되었음을 보장)
    await expect(
      page.getByText('테스트 PDF 문서', { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });

    // 블록 패널 펼치기
    await openBlockPanel(page);

    // BlockItem에서 "기억 만료됨" 확인
    await expect(
      page.getByText('기억 만료됨', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });

  // ── Test 3: 만료된 PDF 블록 새로고침 -> "기억 활성 중" ──────────────

  test('만료된 PDF 블록을 새로고침하면 "기억 활성 중"으로 복원된다', async ({ page }) => {
    await setupCommonMocks(page);

    await page.route(/\/api\/upload\/gemini$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          geminiFileUri: 'files/mock-expired-002',
          geminiExpiresAt: '2020-06-01T00:00:00.000Z',
        }),
      });
    });

    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [
            {
              label: '갱신 테스트 PDF',
              content: '새로고침 기능 검증용 PDF',
              type: 'file',
              fileUrl: 'test/refresh-test.pdf',
              fileName: 'refresh-test.pdf',
              fileType: 'application/pdf',
              fileSize: 1024,
              geminiFileUri: 'files/mock-expired-002',
              geminiExpiresAt: '2020-06-01T00:00:00.000Z',
            },
          ],
        }),
      });
    });

    // refresh API mock — 47시간 후 만료로 갱신
    const futureExpiry = new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString();
    await page.route(/\/api\/blocks\/[^/]+\/refresh$/, async (route) => {
      const url = route.request().url();
      const match = url.match(/\/api\/blocks\/([^/]+)\/refresh/);
      const id = match?.[1] ?? 'mock-id';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id,
          geminiFileUri: 'files/mock-refreshed-001',
          geminiExpiresAt: futureExpiry,
        }),
      });
    });

    await page.goto('/chat');

    await page.locator('input[type="file"]').setInputFiles({
      name: 'refresh-test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 refresh test'),
    });

    await page.locator('textarea').first().click();
    await page.keyboard.type('PDF 갱신 테스트');
    await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 5_000 });
    await page.locator('button[type="submit"]').click();

    await page.waitForRequest(/\/api\/blocks\/extract$/, { timeout: 20_000 });

    // 토스트에서 블록 라벨 확인
    await expect(
      page.getByText('갱신 테스트 PDF', { exact: false }).first()
    ).toBeVisible({ timeout: 15_000 });

    // 블록 패널 펼치기
    await openBlockPanel(page);

    // "갱신 테스트 PDF" BlockItem h4 확인
    await expect(
      page.locator('h4').filter({ hasText: '갱신 테스트 PDF' })
    ).toBeVisible({ timeout: 5_000 });

    // "기억 만료됨" 상태 확인 (first()로 strict mode 우회 - 이전 테스트 블록도 만료됨)
    await expect(
      page.getByText('기억 만료됨', { exact: false }).first()
    ).toBeVisible({ timeout: 5_000 });

    // 블록 아이템 hover -> 새로고침 버튼 표시
    await page.locator('h4').filter({ hasText: '갱신 테스트 PDF' }).hover();

    // 새로고침 버튼 클릭 (title="다시 기억")
    const refreshBtn = page.locator('[title="다시 기억"]').first();
    await expect(refreshBtn).toBeVisible({ timeout: 3_000 });
    await refreshBtn.click();

    // refresh API 응답 후 "기억 활성 중"으로 변경됨 확인
    await expect(
      page.getByText('기억 활성 중', { exact: false })
    ).toBeVisible({ timeout: 10_000 });
  });
});
