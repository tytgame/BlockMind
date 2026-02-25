'use client';

import * as React from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

type RecentChat = {
  id: string;
  title: string;
  icon: string;
};

type PinnedChat = {
  id: string;
  title: string;
};

type ChatFolder = {
  id: string;
  name: string;
};

const recentChats: RecentChat[] = [];
const pinnedChats: PinnedChat[] = [];
const folders: ChatFolder[] = [];

export function ChatSidebar() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeChat, setActiveChat] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-[#1a1d21] text-white">
      {/* Header - Logo & Workspace */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-sm">BlockMind</h1>
            <p className="text-xs text-gray-400">Pro Plan Workspace</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
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
            Recents
          </h3>
          <div className="space-y-1">
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                  activeChat === chat.id
                    ? 'bg-blue-600/20 text-white'
                    : 'text-gray-300 hover:bg-white/5'
                )}
              >
                <span className="text-lg">{chat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Pinned */}
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
            <Pin className="h-3 w-3" />
            Pinned
          </h3>
          <div className="space-y-1">
            {pinnedChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors',
                  activeChat === chat.id
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
            Folders
          </h3>
          <div className="space-y-1">
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
        {/* Settings */}
        <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left text-gray-300 hover:bg-white/5 transition-colors">
          <Settings className="h-4 w-4" />
          <span className="text-sm">Settings</span>
        </button>

        {/* User Profile */}
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
