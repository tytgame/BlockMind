'use client';

import * as React from 'react';
import { signIn } from 'next-auth/react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

const RESEND_COOLDOWN = 60; // 초

export default function VerifyPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) ?? 'ko';
  const t = useTranslations('verify');

  const email = searchParams.get('email') ?? '';
  const callbackUrl = locale === 'ko' ? '/chat' : `/${locale}/chat`;

  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [error, setError] = React.useState('');
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const [resendMsg, setResendMsg] = React.useState('');

  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  // 이메일 없으면 로그인 페이지로
  React.useEffect(() => {
    if (!email) {
      const loginPath = locale === 'ko' ? '/login' : `/${locale}/login`;
      router.replace(loginPath);
    }
  }, [email, locale, router]);

  // 쿨다운 타이머
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const otpValue = otp.join('');

  const handleChange = (index: number, value: string) => {
    // 붙여넣기: 6자리 전체 처리
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const next = ['', '', '', '', '', ''];
      digits.split('').forEach((d, i) => { next[i] = d; });
      setOtp(next);
      const focusIdx = Math.min(digits.length, 5);
      inputRefs.current[focusIdx]?.focus();
      return;
    }
    const digit = value.replace(/\D/g, '');
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpValue.length !== 6 || isVerifying) return;
    setError('');
    setIsVerifying(true);
    try {
      const result = await signIn('credentials', {
        email,
        otp: otpValue,
        redirect: false,
      });
      if (result?.error) {
        setError(t('invalidCode'));
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError(t('invalidCode'));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResendMsg('');
    setError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendMsg(t('resendSuccess'));
        setCooldown(RESEND_COOLDOWN);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      // silent
    }
  };

  const loginPath = locale === 'ko' ? '/login' : `/${locale}/login`;

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <img src="/blockmind_logo_noBackGround.png" alt="BlockMind Logo" className="w-10 h-10" />
          <span className="text-xl text-white font-sora">
            <span className="font-bold">Block</span>
            <span className="font-normal">Mind</span>
          </span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="relative p-8 rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-gray-950/80 backdrop-blur-xl shadow-2xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/5 to-purple-600/5" />

            <div className="relative z-10">
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-white mb-2">{t('title')}</h1>
                <p className="text-gray-400 text-sm break-all">
                  {t('subtitle', { email })}
                </p>
              </div>

              {/* OTP Input */}
              <form onSubmit={(e) => { void handleSubmit(e); }}>
                <div className="flex justify-center gap-3 mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleChange(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-14 text-center text-xl font-bold text-white bg-white/5 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors caret-transparent"
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    />
                  ))}
                </div>

                {error && (
                  <p className="text-center text-sm text-red-400 mb-4">{error}</p>
                )}
                {resendMsg && (
                  <p className="text-center text-sm text-green-400 mb-4">{resendMsg}</p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={otpValue.length !== 6 || isVerifying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-6 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isVerifying ? t('verifying') : t('submit')}
                </Button>
              </form>

              {/* Resend */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => { void handleResend(); }}
                  disabled={cooldown > 0}
                  className="text-sm text-gray-400 hover:text-white transition-colors disabled:cursor-not-allowed disabled:text-gray-600"
                >
                  {cooldown > 0 ? t('resendCooldown', { seconds: cooldown }) : t('resend')}
                </button>
              </div>
            </div>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link href={loginPath} className="text-gray-400 hover:text-white text-sm transition-colors">
              {t('backToLogin')}
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
