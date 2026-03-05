'use client';

import * as React from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  Settings,
  Pin,
  Folder,
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

type PinnedChat = {
  id: string;
  title: string;
};

type ChatFolder = {
  id: string;
  name: string;
};

const pinnedChats: PinnedChat[] = [];
const folders: ChatFolder[] = [];

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
  const [recentSessions, setRecentSessions] = React.useState<ChatSessionItem[]>([]);
  const t = useTranslations('chatSidebar');

  // 세션 목록 로드 (sessionId가 바뀔 때마다 갱신)
  React.useEffect(() => {
    async function loadSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) return;
        const data = (await res.json()) as ChatSessionItem[];
        setRecentSessions(data);
      } catch {
        // 네트워크 오류 시 빈 목록 유지
      }
    }
    void loadSessions();
  }, [sessionId]);

  // 세션 선택: DB에서 메시지 fetch → pendingMessages에 저장 → sessionId 변경
  // chat/page.tsx의 key={sessionId}가 ChatInterface를 리마운트해 메시지 주입
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
          // clientId: AI SDK가 생성한 원본 UUID → messageFilesMap 키 일치에 사용
          id: m.clientId ?? m.id,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
        }));

      // 첨부 파일 메타 복원
      for (const m of data.messages) {
        if (m.role === 'user' && m.files && m.files.length > 0) {
          setMessageFiles(m.clientId ?? m.id, m.files);
        }
      }

      setPendingMessages(converted);
    } catch {
      // fetch 실패 시 빈 상태로 세션 전환
      clearPendingMessages();
    }
    setSessionId(id);
    newMountKey(); // 사용자가 명시적으로 세션을 선택 → ChatInterface 리마운트
  }

  function handleNewChat() {
    clearPendingMessages();
    setSessionId(null);
    newMountKey(); // 새 채팅 → ChatInterface 리마운트
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
          <Button
            variant="ghost"
            size="icon"
            className={iconRailButtonClass}
            title={t('folders')}
            aria-label={t('folders')}
          >
            <Folder className="h-5 w-5" />
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

      {/* Chat Lists */}
      <ScrollArea className="flex-1 px-3">
        {/* Recents */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">
            {t('recents')}
          </h3>
          <div className="space-y-1">
            {recentSessions.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">{t('noRecentChats')}</p>
            )}
            {recentSessions.map((chat) => (
              <button
                key={chat.id}
                onClick={() => void handleSelectSession(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                  sessionId === chat.id
                    ? 'bg-blue-600/20 text-white'
                    : 'text-gray-300 hover:bg-white/5'
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

        {/* Folders */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
            <Folder className="h-3 w-3" />
            {t('folders')}
          </h3>
          <div className="space-y-1">
            {folders.length === 0 && (
              <p className="px-2 py-1 text-xs text-gray-500">{t('noFolders')}</p>
            )}
            {folders.map((folder) => (
              <button
                key={folder.id}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-gray-300 hover:bg-white/5 transition-colors"
              >
                <Folder className="h-4 w-4 text-gray-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{folder.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </ScrollArea>

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
