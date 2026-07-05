// AI 聊天狀態管理 Store
// 管理聊天歷史、發送狀態等

import { create } from 'zustand'
import {
    type ChatMessage,
    type AIMode,
    type KnowledgeBase,
    sendChatMessage,
    getKnowledgeBases,
    analyzeSelectedText,
} from '@/services'

interface ChatState {
    // 訊息狀態
    messages: Record<AIMode, ChatMessage[]>
    isLoading: boolean

    // 知識庫狀態
    knowledgeBases: KnowledgeBase[]
    selectedKnowledgeBases: string[]

    // 動作
    sendMessage: (content: string, mode: AIMode) => Promise<void>
    analyzeText: (text: string) => Promise<void>
    loadKnowledgeBases: () => Promise<void>
    setSelectedKnowledgeBases: (ids: string[]) => void
    clearMessages: (mode: AIMode) => void
}

// 生成使用者訊息 ID
const generateUserMessageId = (): string =>
    `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

export const useChatStore = create<ChatState>((set, get) => ({
    messages: {
        screenwriter: [],
        reader: [],
    },
    isLoading: false,
    knowledgeBases: [],
    selectedKnowledgeBases: [],

    sendMessage: async (content, mode) => {
        // 新增使用者訊息
        const userMessage: ChatMessage = {
            id: generateUserMessageId(),
            role: 'user',
            content,
            timestamp: Date.now(),
        }

        set((state) => ({
            messages: {
                ...state.messages,
                [mode]: [...state.messages[mode], userMessage],
            },
            isLoading: true,
        }))

        try {
            // 呼叫 Mock API
            const { selectedKnowledgeBases } = get()
            const response = await sendChatMessage(content, mode, selectedKnowledgeBases)

            // 新增 AI 回覆
            set((state) => ({
                messages: {
                    ...state.messages,
                    [mode]: [...state.messages[mode], response.message],
                },
                isLoading: false,
            }))
        } catch (error) {
            console.error('發送訊息失敗:', error)
            set({ isLoading: false })
        }
    },

    analyzeText: async (text) => {
        set({ isLoading: true })

        try {
            const response = await analyzeSelectedText(text)

            set((state) => ({
                messages: {
                    ...state.messages,
                    reader: [...state.messages.reader, response.message],
                },
                isLoading: false,
            }))
        } catch (error) {
            console.error('分析文字失敗:', error)
            set({ isLoading: false })
        }
    },

    loadKnowledgeBases: async () => {
        try {
            const knowledgeBases = await getKnowledgeBases()
            set({ knowledgeBases })
        } catch (error) {
            console.error('載入知識庫失敗:', error)
        }
    },

    setSelectedKnowledgeBases: (ids) => {
        set({ selectedKnowledgeBases: ids })
    },

    clearMessages: (mode) => {
        set((state) => ({
            messages: {
                ...state.messages,
                [mode]: [],
            },
        }))
    },
}))
