export const LOCALE_CONFIG = [
  { code: 'ko' as const, flag: '🇰🇷', label: '한국어', short: 'KO' },
  { code: 'en' as const, flag: '🇺🇸', label: 'English', short: 'EN' },
  { code: 'zh' as const, flag: '🇨🇳', label: '中文', short: 'ZH' },
  { code: 'ja' as const, flag: '🇯🇵', label: '日本語', short: 'JA' },
];

export type AppLocale = (typeof LOCALE_CONFIG)[number]['code'];
