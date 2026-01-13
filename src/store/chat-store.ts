import { create } from 'zustand';

interface ChatState {
  input: string;
  setInput: (input: string) => void;
  resetInput: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  input: '',
  setInput: (input) => set({ input }),
  resetInput: () => set({ input: '' }),
}));
