'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, MessageSquare } from 'lucide-react';

export function Navbar() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

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
            {isLoading ? (
              // 로딩 상태
              <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse" />
            ) : session ? (
              // 로그인 상태
              <>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/chat">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Go to Chat
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
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              // 로그아웃 상태
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/chat">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
