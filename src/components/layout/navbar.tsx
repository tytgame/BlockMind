'use client';

import { useSession, signOut } from 'next-auth/react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, MessageSquare, Globe, Check } from 'lucide-react';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { LOCALE_CONFIG } from '@/i18n/locales';
import { cn } from '@/lib/utils';

function LanguageSelector() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const current = LOCALE_CONFIG.find((l) => l.code === locale) ?? LOCALE_CONFIG[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-1.5 text-gray-300 hover:text-white hover:bg-white/10 px-2.5"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium tracking-wide">{current.short}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-36 bg-gray-900 border-gray-800 text-white"
      >
        {LOCALE_CONFIG.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => router.replace(pathname, { locale: l.code })}
            className={cn(
              'cursor-pointer flex items-center justify-between',
              locale === l.code && 'text-blue-400'
            )}
          >
            <span className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span className="text-sm">{l.label}</span>
            </span>
            {locale === l.code && <Check className="w-3.5 h-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const t = useTranslations('nav');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0f1419]/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-xl text-white font-sora">
              <span className="font-bold">Block</span>
              <span className="font-normal">Mind</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {t('home')}
            </Link>
            <Link
              href="/#features"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              {t('features')}
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <LanguageSelector />

            {isLoading ? (
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : session ? (
              <>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    {t('goToChat')}
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full p-0 hover:bg-white/10"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={session.user?.image || ''}
                          alt={session.user?.name || ''}
                        />
                        <AvatarFallback className="bg-blue-600">
                          <User className="h-4 w-4 text-white" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-gray-900 border-gray-800 text-white"
                  >
                    <div className="flex items-center gap-3 px-2 py-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={session.user?.image || ''}
                          alt={session.user?.name || ''}
                        />
                        <AvatarFallback className="bg-blue-600">
                          <User className="h-3 w-3 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-0.5">
                        <p className="text-sm font-medium">{session.user?.name}</p>
                        <p className="text-xs text-gray-400">{session.user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="bg-gray-800" />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-950/50"
                      onClick={() => signOut({ callbackUrl: '/' })}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/login">{t('login')}</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/chat">{t('getStarted')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
