import { create } from 'zustand';

// useChat의 messages 옵션에 주입할 최소 형태 (UIMessage 호환)
export type RestoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
};

interface ChatState {
  input: string;
  // 현재 활성 채팅 세션 id (DB에 저장된 ChatSession.id)
  // null이면 아직 세션이 생성되지 않은 상태 (첫 메시지 전)
  sessionId: string | null;
  // 세션 복원 시 useChat에 주입할 메시지 목록 (리마운트 후 소비되고 초기화됨)
  pendingMessages: RestoredMessage[];
  // ChatInterface의 key prop으로 사용. 사용자가 명시적으로 세션을 변경할 때만 갱신.
  // onFinish에서 sessionId가 바뀌어도 mountKey는 변경되지 않으므로 리마운트 없음.
  mountKey: string;
  setInput: (input: string) => void;
  resetInput: () => void;
  setSessionId: (id: string | null) => void;
  setPendingMessages: (messages: RestoredMessage[]) => void;
  clearPendingMessages: () => void;
  // 사용자 명시적 액션 시 호출 → ChatInterface 리마운트 유발
  newMountKey: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  input: '',
  sessionId: null,
  pendingMessages: [],
  mountKey: 'initial',
  setInput: (input) => set({ input }),
  resetInput: () => set({ input: '' }),
  setSessionId: (id) => set({ sessionId: id }),
  setPendingMessages: (messages) => set({ pendingMessages: messages }),
  clearPendingMessages: () => set({ pendingMessages: [] }),
  newMountKey: () => set({ mountKey: `mount-${Date.now()}` }),
}));
