/**
 * E2E 인증 셋업
 *
 * 전략: 실제 이메일 발송 없이 OTP 토큰을 DB에 직접 심어 로그인 처리
 * 1. Prisma(PrismaPg adapter)로 VerificationToken(hash('123456')) 삽입
 * 2. /login/verify 페이지로 직접 이동 (이메일 단계 건너뜀)
 * 3. OTP 입력 → 로그인 → storageState 저장
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env' });

import { test as setup } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TEST_EMAIL = 'test@blockmind.kr';
const TEST_OTP = '123456';

function createPrisma() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

setup('인증 셋업', async ({ page }) => {
  const prisma = createPrisma();

  try {
    // 1. VerificationToken DB에 직접 삽입
    const hashedOtp = crypto.createHash('sha256').update(TEST_OTP).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10분 후 만료

    await prisma.verificationToken.deleteMany({ where: { identifier: TEST_EMAIL } });
    await prisma.verificationToken.create({
      data: { identifier: TEST_EMAIL, token: hashedOtp, expires },
    });

    // 2. verify 페이지로 직접 이동 (이메일 발송 단계 건너뜀)
    await page.goto(`/login/verify?email=${encodeURIComponent(TEST_EMAIL)}`);

    // 3. 첫 번째 OTP input에 6자리 붙여넣기 (React paste 로직이 나머지 칸에 자동 분배)
    const firstOtpInput = page.locator('input[inputmode="numeric"]').first();
    await firstOtpInput.fill(TEST_OTP);

    // 4. 인증 버튼 클릭
    await page.locator('button[type="submit"]').click();

    // 5. /chat으로 이동 확인
    await page.waitForURL(/\/chat/, { timeout: 15_000 });

    // 6. storageState 저장 (이후 테스트에서 로그인 상태 재사용)
    fs.mkdirSync(path.join('e2e', '.auth'), { recursive: true });
    await page.context().storageState({ path: 'e2e/.auth/user.json' });
  } finally {
    await prisma.$disconnect();
  }
});
