'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0f1419]/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
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

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Home
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Features
            </Link>
            <Link
              href="#"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-white hover:bg-white/10"
              asChild
            >
              <Link href="#">Log in</Link>
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
              asChild
            >
              <Link href="/chat">Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
