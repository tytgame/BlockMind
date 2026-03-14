'use client';

import { Github } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export function Footer() {
  const t = useTranslations('footer');

  return (
    <footer className="relative border-t border-gray-800 bg-gray-950">
      <div className="container mx-auto px-6 py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
          {/* Brand Column */}
          <div>
            <Link href="/" className="flex items-center mb-4">
              <span className="text-xl text-white font-sora">
                <span className="font-bold">Block</span>
                <span className="font-normal">Mind</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm mb-4 max-w-xs">
              {t('description')}
            </p>

            {/* Social Links */}
            <div className="flex gap-3">
              <a
                href="https://github.com/tytgame/BlockMind"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">{t('copyright')}</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              {t('privacyPolicy')}
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-gray-400 text-sm transition-colors">
              {t('termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
