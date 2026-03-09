'use client';

import * as React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Settings,
  Pin,
  PinOff,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Home,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useParams } from 'next/navigation';
import { useChatStore } from '@/store/chat-store';
import { useBlockStore } from '@/store/block-store';
import { useSessionNavigation } from '@/hooks/use-session-navigation';

type ChatSessionItem = {
  id: string;
  title: string | null;
  isPinned: boolean;
  pinnedAt: string | null;
  updatedAt: string;
};

type SessionsResponse = {
  pinnedSessions: ChatSessionItem[];
  sessions: ChatSessionItem[];
  hasMore: boolean;
};

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const iconRailButtonClass =
  'h-10 w-10 text-gray-300 hover:text-white hover:bg-white/10';

export function ChatSidebar({ collapsed, onToggleCollapse }: ChatSidebarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams<{ sessionId?: string }>();
  // URL에서 현재 활성 세션 ID 읽기 (localStorage 의존 없음)
  const activeSessionId = params.sessionId ?? null;

  const { clearPendingMessages, lastCreatedSessionId, setLastCreatedSessionId } = useChatStore();
  const { navigateToSession } = useSessionNavigation();
  const [searchQuery, setSearchQuery] = React.useState('');

  // 고정 세션 (전체), 미고정 세션 (pagination)
  const [pinnedSessions, setPinnedSessions] = React.useState<ChatSessionItem[]>([]);
  const [sessions, setSessions] = React.useState<ChatSessionItem[]>([]);
  const [cursor, setCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [newSessionId, setNewSessionId] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const t = useTranslations('chatSidebar');
  const tNav = useTranslations('nav');

  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const sessionsRef = React.useRef<ChatSessionItem[]>([]);
  sessionsRef.current = sessions;

  const loadInitial = React.useCallback(async () => {
    try {
      const res = await fetch('/api/sessions?limit=20');
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      setPinnedSessions(data.pinnedSessions);
      setSessions(data.sessions);
      setCursor(data.sessions.at(-1)?.updatedAt ?? null);
      setHasMore(data.hasMore);
    } catch { /* silent */ }
  }, []);

  const fetchMore = React.useCallback(async (cursorValue: string) => {
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/sessions?cursor=${encodeURIComponent(cursorValue)}&limit=20`);
      if (!res.ok) return;
      const data = (await res.json()) as SessionsResponse;
      setSessions((prev) => [...prev, ...data.sessions]);
      setCursor(data.sessions.at(-1)?.updatedAt ?? null);
      setHasMore(data.hasMore);
    } catch { /* silent */ }
    finally { setIsLoadingMore(false); }
  }, []);

  React.useEffect(() => { void loadInitial(); }, [loadInitial]);

  // 새 세션 생성 감지 — replaceState는 useParams를 트리거하지 않으므로 store로 전달받음
  React.useEffect(() => {
    if (!lastCreatedSessionId) return;
    setLastCreatedSessionId(null);
    setNewSessionId(lastCreatedSessionId);
    void loadInitial();
    setTimeout(() => setNewSessionId(null), 400);
  }, [lastCreatedSessionId, setLastCreatedSessionId, loadInitial]);

  // IntersectionObserver
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
      (entries) => { if (entries[0].isIntersecting) loadMoreRef.current(); },
      { root: container, threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // 세션 선택
  async function handleSelectSession(id: string) {
    if (id === activeSessionId) return;
    await navigateToSession(id);
  }

  function handleNewChat() {
    clearPendingMessages();
    router.push('/chat');
  }

  // 채팅 삭제 (확인 후 실행)
  async function handleDeleteSession(id: string) {
    // optimistic: 목록에서 즉시 제거
    setPinnedSessions((prev) => prev.filter((s) => s.id !== id));
    setSessions((prev) => prev.filter((s) => s.id !== id));

    // 현재 활성 세션이면 새 채팅으로 이동
    if (activeSessionId === id) {
      router.push('/chat');
    }

    // 해당 세션에서 추출된 블록을 store에서 즉시 제거
    useBlockStore.getState().removeBlocksBySession(id);

    void fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  }

  // 고정 토글 (optimistic update)
  async function handleTogglePin(e: React.MouseEvent, chat: ChatSessionItem) {
    e.stopPropagation();
    const newIsPinned = !chat.isPinned;

    if (newIsPinned) {
      // 미고정 → 고정: sessions에서 제거, pinnedSessions 맨 앞에 추가
      setSessions((prev) => prev.filter((s) => s.id !== chat.id));
      setPinnedSessions((prev) => [{ ...chat, isPinned: true, pinnedAt: new Date().toISOString() }, ...prev]);
    } else {
      // 고정 → 미고정: pinnedSessions에서 제거, sessions 적절한 위치에 삽입
      setPinnedSessions((prev) => prev.filter((s) => s.id !== chat.id));
      setSessions((prev) => {
        const unpinned = { ...chat, isPinned: false, pinnedAt: null };
        const insertIdx = prev.findIndex((s) => new Date(s.updatedAt) < new Date(chat.updatedAt));
        if (insertIdx === -1) return [...prev, unpinned];
        const next = [...prev];
        next.splice(insertIdx, 0, unpinned);
        return next;
      });
    }

    // fire-and-forget DB 동기화
    void fetch(`/api/sessions/${chat.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPinned: newIsPinned }),
    });
  }

  // 채팅 아이템 공통 렌더링
  function ChatItem({ chat }: { chat: ChatSessionItem }) {
    return (
      <div
        key={chat.id}
        className={cn(
          'group relative flex items-center rounded-lg transition-colors',
          activeSessionId === chat.id ? 'bg-blue-600/20' : 'hover:bg-white/10',
          chat.id === newSessionId && 'animate-in fade-in slide-in-from-top-2 duration-300'
        )}
      >
        {/* 세션 선택 버튼 */}
        <button
          onClick={() => void handleSelectSession(chat.id)}
          className="flex-1 min-w-0 px-2 py-2 text-left cursor-pointer"
        >
          <p className={cn(
            'text-sm font-medium truncate pr-6',
            activeSessionId === chat.id ? 'text-white' : 'text-gray-300'
          )}>
            {chat.title ?? t('noRecentChats')}
          </p>
        </button>

        {/* 고정 아이콘 (고정된 채팅에만 항상 표시, hover 시 숨김) */}
        {chat.isPinned && (
          <div className="absolute right-1 h-6 w-6 flex items-center justify-center group-hover:hidden pointer-events-none">
            <Pin className="h-4 w-4 text-gray-500" />
          </div>
        )}

        {/* ... 더보기 버튼 (hover 시 표시) */}
        <div className={cn(
          'absolute right-1 opacity-0 group-hover:opacity-100 transition-opacity',
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-36 bg-[#2a2f3a] border-white/10 text-gray-200">
              <DropdownMenuItem
                onClick={(e) => void handleTogglePin(e, chat)}
                className="gap-2 text-gray-200 data-[highlighted]:bg-white/10 data-[highlighted]:text-white cursor-pointer"
              >
                {chat.isPinned
                  ? <><PinOff className="h-4 w-4" />{t('unpin')}</>
                  : <><Pin className="h-4 w-4" />{t('pin')}</>
                }
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); setDeleteTargetId(chat.id); }}
                className="gap-2 text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />{t('delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
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
            className={`mb-2 rounded-lg flex items-center justify-center ${iconRailButtonClass}`}
            aria-label={t('goToHome')}
            title={t('goToHome')}
          >
            <Home className="h-5 w-5" />
          </Link>
          <Button variant="ghost" size="icon" className={iconRailButtonClass} title={t('newChat')} aria-label={t('newChat')} onClick={handleNewChat}>
            <Plus className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={iconRailButtonClass} title={t('search')} aria-label={t('search')}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className={iconRailButtonClass} title={t('pinned')} aria-label={t('pinned')}>
            <Pin className="h-5 w-5" />
          </Button>
        </div>
        <div className="border-t border-white/10 p-2">
          <div className="flex flex-col items-center gap-2">
            <Button variant="ghost" size="icon" className={iconRailButtonClass} title={t('settings')} aria-label={t('settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60">
                    <Avatar className="h-10 w-10 border border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={session.user.image || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-xs">
                        {session.user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="end" className="w-44 bg-[#2a2f3a] border-white/10 text-gray-200">
                  <DropdownMenuItem
                    className="cursor-pointer text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {tNav('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="h-10 w-10 rounded-full bg-white/10" />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
      <AlertDialogContent className="bg-[#2a2f3a] border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {t('deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-transparent border-white/20 text-gray-300 hover:bg-white/10 hover:text-white">
            {t('deleteConfirmCancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => { if (deleteTargetId) void handleDeleteSession(deleteTargetId); }}
            className="bg-red-600 hover:bg-red-700 text-white border-0"
          >
            {t('deleteConfirmDelete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="flex flex-col h-full bg-[#1a1d21] text-white">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label={t('goToHome')}
            title={t('goToHome')}
          >
            <span className="text-xl text-white font-sora">
              <span className="font-bold">Block</span>
              <span className="font-normal">Mind</span>
            </span>
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
        <Button onClick={handleNewChat} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
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

      {/* Chat List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3">
        <div className="mb-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-2">
            {t('recents')}
          </h3>
          <div className="space-y-0.5">
            {pinnedSessions.length === 0 && sessions.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">{t('noRecentChats')}</p>
            )}
            {/* 고정된 세션 (맨 위) */}
            {pinnedSessions.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
            {/* 고정 안 된 세션 */}
            {sessions.map((chat) => (
              <ChatItem key={chat.id} chat={chat} />
            ))}
          </div>
        </div>

        {/* 무한 스크롤 sentinel */}
        <div ref={sentinelRef} className="h-1" />
        {isLoadingMore && (
          <div className="flex justify-center py-3">
            <Spinner />
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-gray-300 hover:bg-white/5 transition-colors">
          <Settings className="h-4 w-4" />
          <span className="text-sm">{t('settings')}</span>
        </button>
        {session?.user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session.user.image || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-400 to-pink-500 text-white text-xs">
                    {session.user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{session.user.name || 'User'}</p>
                  <p className="text-xs text-gray-400 truncate">{session.user.email || ''}</p>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-44 bg-[#2a2f3a] border-white/10 text-gray-200">
              <DropdownMenuItem
                className="cursor-pointer text-red-400 data-[highlighted]:bg-red-500/10 data-[highlighted]:text-red-400"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {tNav('signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
    </>
  );
}
