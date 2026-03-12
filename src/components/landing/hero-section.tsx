'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export function HeroSection() {
  const t = useTranslations('hero');

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

      <div className="container mx-auto max-w-5xl relative z-10">
        {/* Main Heading */}
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-center text-white mb-6 leading-tight">
          {t('headingLine1')}
          <br />
          {t('headingLine2prefix')}
          <span className="bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            BlockMind
          </span>
          {t('headingLine2suffix')}
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-gray-400 text-center max-w-3xl mx-auto mb-10 leading-relaxed">
          {t('subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-6 text-lg font-semibold backdrop-blur-sm"
            asChild
          >
            <Link href="/chat">{t('startChatting')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
