import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    // @/ → src/ path alias 처리
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  // Next.js 내부 모듈은 테스트에서 제외
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
  // uuid, @dnd-kit 등 ESM 전용 패키지를 ts-jest로 트랜스폼
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@dnd-kit)/)',
  ],
};

export default config;
