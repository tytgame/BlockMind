'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="relative min-h-screen flex flex-col pt-24 pb-16 px-6 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      {/* 하단 페이드 아웃 */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f1419] to-transparent" />

      {/* 헤딩 + 서브타이틀 — 수직 중앙 */}
      <div className="flex-1 flex items-center relative z-10">
        <div className="container mx-auto max-w-5xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center text-white mb-6 leading-tight">
            {t('headingLine1')}
            <br />
            {t('headingLine2prefix')}
            {t('headingLine2suffix')}
          </h1>
          <p className="text-lg md:text-xl text-gray-400 text-center max-w-3xl mx-auto leading-relaxed">
            {t('subtitle').split('BlockMind').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 bg-clip-text text-transparent font-semibold">
                    BlockMind
                  </span>
                )}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* CTA — 하단 고정 */}
      <div className="flex justify-center relative z-10">
        <Button
          size="lg"
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-6 text-lg font-semibold backdrop-blur-sm"
          asChild
        >
          <Link href="/chat">{t('startChatting')}</Link>
        </Button>
      </div>
    </section>
  );
}
