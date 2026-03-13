/**
 * E2E: 로그인 → 채팅 → 블록 자동 생성 전체 플로우
 *
 * Mock 전략:
 *   - /api/chat          → Vercel AI SDK UIMessageStream 포맷으로 fake 응답 (Gemini 비용 0)
 *   - /api/blocks/extract → 고정 블록 데이터 반환
 *   - /api/sessions, /api/blocks (POST) → 실제 Supabase 연동 (DB 로직 실검증)
 *
 * 검증 항목:
 *   1. /api/blocks/extract 가 호출됨 (채팅 완료 후 블록 추출 실행)
 *   2. "블록이 생성되었습니다 — 사용자 정보" 토스트 표시
 *   3. 채팅 중단 시 extract가 호출되지 않음
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });

import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const TEST_EMAIL = 'test@blockmind.kr';

function createPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Vercel AI SDK v4 UIMessageStream 포맷
// DefaultChatTransport → parseJsonEventStream → uiMessageChunkSchema 파싱
// SSE 형식: data: {json}\n\n
// 필수 타입: text-start → text-delta → text-end (스트림 종료 시 onFinish 트리거)
const FAKE_AI_TEXT = '안녕하세요! 사용자 정보를 바탕으로 도움을 드릴게요.';
const sseEvent = (obj: object) => `data: ${JSON.stringify(obj)}\n\n`;
const fakeAIStream = [
  sseEvent({ type: 'text-start', id: 'text-part-001' }),
  sseEvent({ type: 'text-delta', id: 'text-part-001', delta: FAKE_AI_TEXT }),
  sseEvent({ type: 'text-end', id: 'text-part-001' }),
].join('');

test.describe('채팅 → 블록 자동 생성', () => {
  let prisma: PrismaClient;

  test.beforeAll(async () => {
    prisma = createPrisma();
  });

  test.afterAll(async () => {
    // 테스트 유저의 세션/블록 데이터 정리
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    if (user) {
      await prisma.block.deleteMany({ where: { userId: user.id } });
      await prisma.chatSession.deleteMany({ where: { userId: user.id } });
    }
    await prisma.$disconnect();
  });

  test('메시지 전송 후 블록이 자동 생성된다', async ({ page }) => {
    let extractCalled = false;

    // ── 1. API Mock 설정 ─────────────────────────────────────────

    // Gemini 대신 fake 스트림 반환
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

    // 블록 추출 결과 고정 + 호출 여부 추적
    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      extractCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [
            {
              label: '사용자 정보',
              content: '의정부 사는 29살 프론트엔드 개발자',
              category: 'person',
            },
          ],
        }),
      });
    });

    // ── 2. 채팅 페이지로 이동 ─────────────────────────────────────
    await page.goto('/chat');

    // ── 3. 메시지 입력 및 전송 ────────────────────────────────────
    const textarea = page.locator('textarea').first();
    await textarea.click();
    await page.keyboard.type('난 의정부 사는 29살 프론트엔드 개발자야');

    // submit 버튼이 활성화될 때까지 대기 후 클릭 (input값 반영 확인)
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    // ── 4. 블록 추출 API 호출 확인 ────────────────────────────────
    // onFinish → handleFinish → /api/blocks/extract 호출 순서로 진행
    await page.waitForRequest(/\/api\/blocks\/extract$/, { timeout: 20_000 });

    // ── 5. 블록 생성 토스트 확인 ──────────────────────────────────
    // 토스트: "블록이 생성되었습니다 — 사용자 정보"
    await expect(
      page.getByText('사용자 정보', { exact: false })
    ).toBeVisible({ timeout: 15_000 });

    expect(extractCalled).toBe(true);
  });

  test('채팅 중단 시 블록이 생성되지 않는다', async ({ page }) => {
    let extractCalled = false;

    // 스트림을 느리게 반환하여 stop() 호출 시간 확보
    await page.route(/\/api\/chat$/, async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-vercel-ai-ui-message-stream': 'v1',
        },
        body: fakeAIStream,
      });
    });

    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      extractCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ blocks: [] }),
      });
    });

    await page.goto('/chat');

    const textarea = page.locator('textarea').first();
    await textarea.click();
    await page.keyboard.type('중단 테스트 메시지');

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeEnabled({ timeout: 3_000 });
    await submitBtn.click();

    // 로딩 중 정지 버튼 클릭 (isLoading=true → stop button 표시)
    // stop button: type="button", 마지막 버튼
    const stopBtn = page.locator('button[type="button"]').last();
    await stopBtn.click({ timeout: 5_000 }).catch(() => {
      // 이미 완료된 경우 무시
    });

    // 충분한 대기 후 extract가 호출되지 않았는지 확인
    await page.waitForTimeout(5_000);
    expect(extractCalled).toBe(false);
  });
});
