import { create } from 'zustand';
import type { SentFileInfo } from '@/components/chat/file-preview-modal';

// useChat의 messages 옵션에 주입할 최소 형태 (UIMessage 호환)
export type RestoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
};

interface ChatState {
  input: string;
  // 세션 복원 시 useChat에 주입할 메시지 목록 (리마운트 후 소비되고 초기화됨)
  pendingMessages: RestoredMessage[];
  // 메시지 ID → 첨부 파일 목록 매핑 (세션 전환 시 리마운트 후에도 카드 유지)
  messageFilesMap: Record<string, SentFileInfo[]>;
  // 세션 이동 후 특정 메시지로 스크롤할 때 사용
  scrollToMessageId: string | null;
  // 새 세션 생성 직후 사이드바 갱신 트리거 (replaceState는 useParams를 트리거하지 않으므로 store로 전달)
  lastCreatedSessionId: string | null;
  setInput: (input: string) => void;
  resetInput: () => void;
  setPendingMessages: (messages: RestoredMessage[]) => void;
  clearPendingMessages: () => void;
  setMessageFiles: (messageId: string, files: SentFileInfo[]) => void;
  setScrollToMessageId: (id: string | null) => void;
  setLastCreatedSessionId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  input: '',
  pendingMessages: [],
  messageFilesMap: {},
  scrollToMessageId: null,
  lastCreatedSessionId: null,
  setInput: (input) => set({ input }),
  resetInput: () => set({ input: '' }),
  setPendingMessages: (messages) => set({ pendingMessages: messages }),
  clearPendingMessages: () => set({ pendingMessages: [] }),
  setMessageFiles: (messageId, files) =>
    set((state) => ({
      messageFilesMap: { ...state.messageFilesMap, [messageId]: files },
    })),
  setScrollToMessageId: (id) => set({ scrollToMessageId: id }),
  setLastCreatedSessionId: (id) => set({ lastCreatedSessionId: id }),
}));
// persist 제거 — URL(/chat/[sessionId])이 sessionId의 단일 소스(source of truth)
