/**
 * E2E: 블록 비활성화 → 컨텍스트 리셋 검증
 *
 * 목적:
 *   블록 활성/비활성/재활성화 시 AI 응답이 실제로 달라지는지 검증.
 *   pivotIndex 기반 메시지 슬라이싱이 실제 Gemini 응답에 반영되는지 확인.
 *
 * Mock 전략:
 *   - /api/chat            → 실제 Gemini API 호출 (mock 없음)
 *   - /api/blocks/extract  → 고정 블록 데이터 반환 (LLM 추출 비결정성 제거)
 *   - /api/sessions, /api/blocks → 실제 DB
 *
 * 검증 항목:
 *   1. 블록 활성 상태에서 AI가 블록 정보(홍길동)를 사용하는지
 *   2. 블록 비활성화 후 AI가 블록 정보를 사용하지 않는지
 *   3. 블록 재활성화 후 AI가 블록 정보를 다시 사용하는지
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });

import { test, expect, type Page } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const TEST_EMAIL = 'test@blockmind.kr';
const BLOCK_LABEL = '사용자 정보';
const BLOCK_CONTENT = '홍길동, 30세, 강남 거주, 백엔드 엔지니어';

function createPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
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

/** 메시지 입력 → 전송 → AI 응답 완료 대기 */
async function sendMessageAndWait(page: Page, message: string) {
  // 쿨다운 해제 대기 (이전 메시지 전송 후 3초 제한)
  const submitBtn = page.locator('button[type="submit"]');
  await expect(submitBtn).toBeVisible({ timeout: 10_000 });

  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill(message);

  await expect(submitBtn).toBeEnabled({ timeout: 10_000 });
  await submitBtn.click();

  // 스트리밍 중: submit 버튼이 stop 버튼(type="button")으로 교체됨
  // 스트리밍 완료: stop 버튼이 사라지고 submit 버튼이 다시 나타남
  // → submit 버튼이 다시 보이면 응답 완료
  await expect(submitBtn).toBeVisible({ timeout: 60_000 });
}

/** 마지막 assistant 메시지의 텍스트를 반환 */
async function getLastAssistantText(page: Page): Promise<string> {
  const assistantMessages = page.locator('[data-role="assistant"]');
  const count = await assistantMessages.count();
  if (count === 0) return '';
  const lastMessage = assistantMessages.nth(count - 1);
  return (await lastMessage.textContent()) ?? '';
}

test.describe('블록 비활성화 → 컨텍스트 리셋', () => {
  // 실제 Gemini API 호출 4회 (세션 생성 + 3번 질문) → 넉넉한 타임아웃
  test.setTimeout(180_000);
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

  test('블록 활성 → 비활성 → 재활성화 시 AI 응답이 달라진다', async ({ page }) => {
    // ── 0. /api/blocks/extract mock (고정 블록 반환) ──────────────
    await page.route(/\/api\/blocks\/extract$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          blocks: [
            {
              label: BLOCK_LABEL,
              content: BLOCK_CONTENT,
              category: 'person',
            },
          ],
        }),
      });
    });

    // ── 1. 채팅 페이지 이동 ──────────────────────────────────────
    await page.goto('/chat');

    // ── 2. 개인 정보 포함 메시지 전송 → 블록 자동 생성 ────────────
    await sendMessageAndWait(
      page,
      '나는 홍길동이야. 30살이고 강남에 사는 백엔드 엔지니어야.'
    );

    // 블록 생성 토스트 확인
    await expect(
      page.getByText(BLOCK_LABEL, { exact: false }).first()
    ).toBeVisible({ timeout: 20_000 });

    // 블록 패널 열기 → 블록 존재 확인
    await openBlockPanel(page);
    await expect(
      page.locator('h4').filter({ hasText: BLOCK_LABEL })
    ).toBeVisible({ timeout: 10_000 });

    // ── 3. 테스트 1: 블록 활성 상태에서 AI가 이름을 아는지 확인 ──
    await sendMessageAndWait(page, '내 이름이 뭐야?');

    const activeResponse = await getLastAssistantText(page);
    expect(activeResponse).toContain('홍길동');

    // ── 4. 블록 비활성화 (Eye → EyeOff) ─────────────────────────
    const blockCard = page.locator('h4').filter({ hasText: BLOCK_LABEL }).locator('..').locator('..');
    await blockCard.hover();
    const toggleBtn = blockCard.locator('[data-testid="block-visibility-toggle"]');
    await toggleBtn.click();

    // EyeOff 상태 확인 (잠시 대기 후)
    await page.waitForTimeout(500);

    // ── 5. 테스트 2: 블록 비활성화 후 AI가 이름을 모르는지 확인 ──
    await sendMessageAndWait(page, '내 이름이 뭐야?');

    const inactiveResponse = await getLastAssistantText(page);
    expect(inactiveResponse).not.toContain('홍길동');

    // ── 6. 블록 재활성화 (EyeOff → Eye) ─────────────────────────
    await blockCard.hover();
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // ── 7. 테스트 3: 블록 재활성화 후 AI가 이름을 다시 아는지 확인
    await sendMessageAndWait(page, '내 이름이 뭐야?');

    const reactivatedResponse = await getLastAssistantText(page);
    expect(reactivatedResponse).toContain('홍길동');
  });
});
