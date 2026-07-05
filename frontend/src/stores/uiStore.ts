// UI 狀態管理 Store
// 管理側邊欄開關、分頁等 UI 狀態

import { create } from 'zustand'

interface Tab {
    id: string
    title: string
    type: 'chapter' | 'knowledge'
    content?: string
}

interface UIState {
    // 側邊欄狀態
    isKnowledgeSidebarOpen: boolean
    isAISidebarOpen: boolean
    activeAIMode: 'screenwriter' | 'reader'

    // 分頁狀態
    tabs: Tab[]
    activeTabId: string | null

    // 動作
    toggleKnowledgeSidebar: () => void
    toggleAISidebar: () => void
    setAIMode: (mode: 'screenwriter' | 'reader') => void
    openTab: (tab: Tab) => void
    closeTab: (tabId: string) => void
    setActiveTab: (tabId: string) => void
}

export const useUIStore = create<UIState>((set) => ({
    // 初始狀態：側邊欄預設隱藏
    isKnowledgeSidebarOpen: false,
    isAISidebarOpen: false,
    activeAIMode: 'screenwriter',

    tabs: [
        { id: 'welcome', title: '歡迎', type: 'chapter' }
    ],
    activeTabId: 'welcome',

    // 動作實作
    toggleKnowledgeSidebar: () =>
        set((state) => ({ isKnowledgeSidebarOpen: !state.isKnowledgeSidebarOpen })),

    toggleAISidebar: () =>
        set((state) => ({ isAISidebarOpen: !state.isAISidebarOpen })),

    setAIMode: (mode) =>
        set({ activeAIMode: mode }),

    openTab: (tab) =>
        set((state) => {
            const exists = state.tabs.find((t) => t.id === tab.id)
            if (exists) {
                return { activeTabId: tab.id }
            }
            return {
                tabs: [...state.tabs, tab],
                activeTabId: tab.id
            }
        }),

    closeTab: (tabId) =>
        set((state) => {
            const newTabs = state.tabs.filter((t) => t.id !== tabId)
            const newActiveId = state.activeTabId === tabId
                ? (newTabs[0]?.id ?? null)
                : state.activeTabId
            return { tabs: newTabs, activeTabId: newActiveId }
        }),

    setActiveTab: (tabId) =>
        set({ activeTabId: tabId }),
}))
