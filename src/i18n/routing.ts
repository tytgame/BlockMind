import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ko', 'en', 'zh', 'ja'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed', // 한국어: /chat, 영어: /en/chat
});
