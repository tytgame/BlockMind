import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isChatSidebarCollapsed: boolean;
  isBlockSidebarCollapsed: boolean;
  setChatSidebarCollapsed: (collapsed: boolean) => void;
  setBlockSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isChatSidebarCollapsed: true,
      isBlockSidebarCollapsed: true,
      setChatSidebarCollapsed: (collapsed) => set({ isChatSidebarCollapsed: collapsed }),
      setBlockSidebarCollapsed: (collapsed) => set({ isBlockSidebarCollapsed: collapsed }),
    }),
    {
      name: 'blockmind-ui', // localStorage key
    }
  )
);
