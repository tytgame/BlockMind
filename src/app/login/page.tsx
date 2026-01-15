'use client';

import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/chat' });
  };

  return (
    <div className="min-h-screen bg-[#0f1419] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-3 w-fit">
          <img
            src="/blockmind_logo_noBackGround.png"
            alt="BlockMind Logo"
            className="w-10 h-10"
          />
          <span className="text-xl text-white font-sora">
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
            {/* Background decoration */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600/5 to-purple-600/5" />
            
            <div className="relative z-10">
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">
                  Welcome Back
                </h1>
                <p className="text-gray-400">
                  Sign in to continue building with BlockMind
                </p>
              </div>

              {/* Google Sign In Button */}
              <Button
                onClick={handleGoogleSignIn}
                size="lg"
                className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/10"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900 text-gray-500">
                    Secure authentication
                  </span>
                </div>
              </div>

              {/* Info */}
              <p className="text-center text-xs text-gray-500">
                By continuing, you agree to our{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>

      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
