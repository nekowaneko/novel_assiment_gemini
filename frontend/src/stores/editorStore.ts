// 編輯器狀態管理 Store
// 管理編輯器內容、字數統計等狀態

import { create } from 'zustand'

interface Document {
    id: string
    title: string
    content: string
    type: 'chapter' | 'knowledge'
    lastModified: number
}

interface EditorState {
    // 文件狀態
    documents: Record<string, Document>
    activeDocumentId: string | null

    // 字數統計
    wordCount: number

    // 動作
    setDocument: (id: string, doc: Partial<Document>) => void
    updateContent: (id: string, content: string) => void
    setActiveDocument: (id: string) => void
    getActiveDocument: () => Document | null
    calculateWordCount: (content: string) => number
    addDocument: (doc: Omit<Document, 'lastModified'>) => void
    getChapters: () => Document[]
}

// 計算中文字數 (含中文字元與英文單詞)
const calculateChineseWordCount = (content: string): number => {
    // 移除 HTML 標籤
    const text = content.replace(/<[^>]*>/g, '')

    // 計算中文字元數
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length

    // 計算英文單詞數
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length

    return chineseChars + englishWords
}

export const useEditorStore = create<EditorState>((set, get) => ({
    documents: {
        welcome: {
            id: 'welcome',
            title: '第一章：序幕',
            content: '<p>這是一個故事的開端。在遙遠的東方，有一座被雲霧繚繞的山峰，山頂上矗立著一座古老的塔樓。傳說中，那裡住著一位能夠預知未來的智者。</p><p>多少年來，無數人慕名前來，想要一窺命運的軌跡。然而，能夠登上塔頂的人卻寥寥無幾。</p>',
            type: 'chapter',
            lastModified: Date.now(),
        },
    },
    activeDocumentId: 'welcome',
    // 初始化時計算歡迎文件的字數
    wordCount: calculateChineseWordCount('<p>這是一個故事的開端。在遙遠的東方，有一座被雲霧繚繞的山峰，山頂上矗立著一座古老的塔樓。傳說中，那裡住著一位能夠預知未來的智者。</p><p>多少年來，無數人慕名前來，想要一窺命運的軌跡。然而，能夠登上塔頂的人卻寥寥無幾。</p>'),

    setDocument: (id, doc) =>
        set((state) => ({
            documents: {
                ...state.documents,
                [id]: { ...state.documents[id], ...doc, lastModified: Date.now() },
            },
        })),

    updateContent: (id, content) => {
        const wordCount = calculateChineseWordCount(content)
        set((state) => ({
            documents: {
                ...state.documents,
                [id]: { ...state.documents[id], content, lastModified: Date.now() },
            },
            wordCount,
        }))
    },

    setActiveDocument: (id) => {
        const doc = get().documents[id]
        if (doc) {
            set({
                activeDocumentId: id,
                wordCount: calculateChineseWordCount(doc.content),
            })
        }
    },

    getActiveDocument: () => {
        const { documents, activeDocumentId } = get()
        return activeDocumentId ? documents[activeDocumentId] : null
    },

    calculateWordCount: calculateChineseWordCount,

    // 新增文件
    addDocument: (doc) => {
        const newDoc: Document = {
            ...doc,
            lastModified: Date.now(),
        }
        set((state) => ({
            documents: {
                ...state.documents,
                [doc.id]: newDoc,
            },
            activeDocumentId: doc.id,
            wordCount: calculateChineseWordCount(doc.content),
        }))
    },

    // 取得所有章節文件
    getChapters: () => {
        const { documents } = get()
        return Object.values(documents).filter((doc) => doc.type === 'chapter')
    },
}))

