'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) ?? 'ko';
  const t = useTranslations('login');

  const [email, setEmail] = React.useState('');
  const [emailError, setEmailError] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const [sendError, setSendError] = React.useState('');

  const callbackUrl = locale === 'ko' ? '/chat' : `/${locale}/chat`;

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl });
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError(t('invalidEmail'));
      return;
    }
    setEmailError('');
    setSendError('');
    setIsSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.status === 429) {
        setSendError(t('tooManyRequests'));
        return;
      }
      if (!res.ok) {
        setSendError(t('sendError'));
        return;
      }
      const verifyPath = locale === 'ko' ? '/login/verify' : `/${locale}/login/verify`;
      router.push(`${verifyPath}?email=${encodeURIComponent(trimmed)}`);
    } catch {
      setSendError(t('sendError'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center w-fit">
          <span className="text-xl text-white font-sora -translate-y-1.5">
            <span className="font-bold">Block</span>
            <span className="font-normal">Mind</span>
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          {/* Login Card */}
          <div className="relative p-8 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/5 to-purple-600/5" />

            <div className="relative z-10">
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('title')}</h1>
                <p className="text-gray-400">{t('subtitle')}</p>
              </div>

              {/* Google Sign In */}
              <Button
                onClick={handleGoogleSignIn}
                size="lg"
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/10"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('continueWithGoogle')}
              </Button>

              {/* OR Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900 text-gray-500">{t('orDivider')}</span>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={(e) => { void handleEmailSubmit(e); }} className="space-y-3">
                <Input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    setSendError('');
                  }}
                  className="bg-white/5 border-gray-700 text-white placeholder:text-gray-500 focus-visible:ring-blue-500 h-12 rounded-xl"
                  autoComplete="email"
                />
                {emailError && <p className="text-xs text-red-400">{emailError}</p>}
                {sendError && <p className="text-xs text-red-400">{sendError}</p>}
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSending || !email.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isSending ? t('sendingCode') : t('continueWithEmail')}
                </Button>
              </form>

              {/* Terms */}
              <p className="text-center text-xs text-gray-500 mt-6">
                {t('terms')}{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">{t('termsOfService')}</Link>{' '}
                {t('and')}{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">{t('privacyPolicy')}</Link>
                {t('agree')}
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('backToHome')}
            </Link>
          </div>
        </div>
      </main>

      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
