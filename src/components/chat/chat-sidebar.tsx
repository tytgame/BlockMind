'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import {
  Plus,
  Search,
  Settings,
  Pin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useChatStore, RestoredMessage } from '@/store/chat-store';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';

type ChatSessionItem = {
  id: string;
  title: string | null;
  updatedAt: string;
};

type SessionsResponse = {
  sessions: ChatSessionItem[];
  hasMore: boolean;
};

type PinnedChat = {
  id: string;
  title: string;
};

const pinnedChats: PinnedChat[] = [];

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const iconRailButtonClass =
  'h-10 w-10 text-gray-300 hover:text-white hover:bg-white/10';

export function ChatSidebar({ collapsed, onToggleCollapse }: ChatSidebarProps) {
  const { data: session } = useSession();
  const { sessionId, setSessionId, setPendingMessages, clearPendingMessages, newMountKey, setMessageFiles } = useChatStore();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sessions, setSessions] = React.useState<ChatSessionItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [newSessionId, setNewSessionId] = React.useState<string | null>(null);
  const t = useTranslations('chatSidebar');

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const sessionsRef = React.useRef<ChatSessionItem[]>([]);
  const prevSessionIdRef = React.useRef<string | null | undefined>(undefined);

  // sessionsRef를 항상 최신으로 유지
  sessionsRef.current = sessions;

  // 첫 페이지 로드 (목록 초기화)
  const loadInitial = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sessions?limit=20');
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      setSessions(data.sessions);
      setCursor(data.sessions.at(-1)?.updatedAt ?? null);
      setHasMore(data.hasMore);
    } catch {
      // silent
    }
  }, []);

  // 다음 페이지 로드 (append)
  const fetchMore = React.useCallback(async (cursorValue: string) => {
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/sessions?cursor=${encodeURIComponent(cursorValue)}&limit=20`);
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      setSessions((prev) => [...prev, ...data.sessions]);
      setCursor(data.sessions.at(-1)?.updatedAt ?? null);
      setHasMore(data.hasMore);
    } catch {
      // silent
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  // 마운트 시 초기 로드
  React.useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  // sessionId 변경 감지: 새 세션 생성 시 목록 맨 위에 추가
  React.useEffect(() => {
    // 첫 렌더 skip
    if (prevSessionIdRef.current === undefined) {
      prevSessionIdRef.current = sessionId;
      return;
    }
    const prev = prevSessionIdRef.current;
    prevSessionIdRef.current = sessionId;

    if (sessionId && sessionId !== prev) {
      const alreadyInList = sessionsRef.current.some((s) => s.id === sessionId);
      if (!alreadyInList) {
        // 새 세션 생성 → 목록 리로드 + 애니메이션 마킹
        setNewSessionId(sessionId);
        void loadInitial();
        // 400ms 후 애니메이션 클래스 제거
        setTimeout(() => setNewSessionId(null), 400);
      }
    }
  }, [sessionId, loadInitial]);

  // IntersectionObserver: sentinel이 보이면 다음 페이지 로드
  // loadMoreRef로 항상 최신 상태 참조
  const loadMoreRef = React.useRef<() => void>(() => {});
  loadMoreRef.current = () => {
    if (!hasMore || isLoadingMore || !cursor) return;
    void fetchMore(cursor);
  };

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { root: container, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []); // 한 번만 설정, ref로 최신 함수 참조

  // 세션 선택
  async function handleSelectSession(id: string) {
    if (id === sessionId) return;
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as {
        messages: Array<{ id: string; role: string; content: string; clientId?: string | null; files?: SentFileInfo[] | null }>;
      };
      const converted: RestoredMessage[] = data.messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          id: m.clientId ?? m.id,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
        }));

      for (const m of data.messages) {
        if (m.role === 'user' && m.files && m.files.length > 0) {
          setMessageFiles(m.clientId ?? m.id, m.files);
        }
      }

      setPendingMessages(converted);
    } catch {
      clearPendingMessages();
    }
    setSessionId(id);
    newMountKey();
  }

  function handleNewChat() {
    clearPendingMessages();
    setSessionId(null);
    newMountKey();
  }

  if (collapsed) {
    return (
      <div className="flex h-full flex-col bg-[#1a1d21] text-white">
        <div className="flex items-center justify-center border-b border-white/10 p-3">
          <Button
            variant="ghost"
            size="icon"
            className={iconRailButtonClass}
            onClick={onToggleCollapse}
            aria-label={t('expandSidebar')}
            title={t('expandSidebar')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-2 px-2 py-3">
          <Link
            href="/"
            className="mb-2 h-10 w-10 rounded-xl border border-white/10 bg-[#252830] flex items-center justify-center hover:bg-[#2a2f3a] transition-colors"
            aria-label={t('goToHome')}
            title={t('goToHome')}
          >
            <Image
              src="/blockmind_logo_noBackGround.png"
              alt="BlockMind"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className={iconRailButtonClass}
            title={t('newChat')}
            aria-label={t('newChat')}
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconRailButtonClass}
            title={t('search')}
            aria-label={t('search')}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconRailButtonClass}
            title={t('pinned')}
            aria-label={t('pinned')}
          >
            <Pin className="h-5 w-5" />
          </Button>
        </div>

        <div className="border-t border-white/10 p-2">
          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className={iconRailButtonClass}
              title={t('settings')}
              aria-label={t('settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
            {session?.user ? (
              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={session.user.image || ''} />
                <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-xs">
                  {session.user.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/10" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1a1d21] text-white">
      {/* Header - Logo */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="h-10 w-10 rounded-xl border border-white/10 bg-[#252830] flex items-center justify-center hover:bg-[#2a2f3a] transition-colors"
            aria-label={t('goToHome')}
            title={t('goToHome')}
          >
            <Image
              src="/blockmind_logo_noBackGround.png"
              alt="BlockMind"
              width={30}
              height={30}
              className="h-7 w-7 object-contain"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
            onClick={onToggleCollapse}
            aria-label={t('collapseSidebar')}
            title={t('collapseSidebar')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button
          onClick={handleNewChat}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          {t('newChat')}
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      {/* Chat Lists — 네이티브 스크롤 컨테이너 (IntersectionObserver용) */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3">
        {/* Pinned */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
            <Pin className="h-3 w-3" />
            {t('pinned')}
          </h3>
          <div className="space-y-1">
            {pinnedChats.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">{t('noPinnedChats')}</p>
            )}
            {pinnedChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSessionId(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                  sessionId === chat.id
                    ? 'bg-blue-600/20 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                )}
              >
                <Pin className="h-4 w-4 text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recents */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            {t('recents')}
          </h3>
          <div className="space-y-1">
            {sessions.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">{t('noRecentChats')}</p>
            )}
            {sessions.map((chat) => (
              <button
                key={chat.id}
                onClick={() => void handleSelectSession(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                  sessionId === chat.id
                    ? 'bg-blue-600/20 text-white'
                    : 'text-gray-300 hover:bg-white/5',
                  // 새 세션 추가 시 슬라이드인 애니메이션
                  chat.id === newSessionId &&
                    'animate-in fade-in slide-in-from-top-2 duration-300'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {chat.title ?? t('noRecentChats')}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 무한 스크롤 sentinel + 스피너 */}
        <div ref={sentinelRef} className="h-1" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}
      </div>

      {/* Bottom Section - Settings & User */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-gray-300 hover:bg-white/5 transition-colors">
          <Settings className="h-4 w-4" />
          <span className="text-sm">{t('settings')}</span>
        </button>

        {session?.user && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image || ''} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-xs">
                {session.user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {session.user.name || 'User'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session.user.email || ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
