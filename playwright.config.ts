import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

// Prisma (auth.setup.ts, spec afterAll)에서 DATABASE_URL 필요
loadEnv({ path: '.env' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // DB 공유 및 스트림 타이밍 테스트를 위해 순차 실행
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
        locale: 'ko-KR', // next-intl이 한국어 로케일로 서빙하도록 강제
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
