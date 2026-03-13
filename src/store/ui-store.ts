import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  isChatSidebarCollapsed: boolean;
  isBlockSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  isMobileBlockPanelOpen: boolean;
  setChatSidebarCollapsed: (collapsed: boolean) => void;
  setBlockSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setMobileBlockPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isChatSidebarCollapsed: true,
      isBlockSidebarCollapsed: true,
      isMobileSidebarOpen: false,
      isMobileBlockPanelOpen: false,
      setChatSidebarCollapsed: (collapsed) => set({ isChatSidebarCollapsed: collapsed }),
      setBlockSidebarCollapsed: (collapsed) => set({ isBlockSidebarCollapsed: collapsed }),
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
      setMobileBlockPanelOpen: (open) => set({ isMobileBlockPanelOpen: open }),
    }),
    {
      name: 'blockmind-ui',
      partialize: (state) => ({
        isChatSidebarCollapsed: state.isChatSidebarCollapsed,
        isBlockSidebarCollapsed: state.isBlockSidebarCollapsed,
      }),
    }
  )
);
