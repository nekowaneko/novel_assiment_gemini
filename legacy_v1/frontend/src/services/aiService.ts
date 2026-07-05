// AI 聊天 API 服務層
// 連接 FastAPI 後端

// API 基礎 URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// 訊息類型定義
export interface ChatMessage {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
}

// 知識庫類型定義
export interface KnowledgeBase {
    id: string
    name: string
    description?: string
}

// AI 模式類型
export type AIMode = 'screenwriter' | 'reader'

// API 回應類型
interface ChatResponse {
    message: ChatMessage
    success: boolean
}

// 生成唯一 ID
const generateId = (): string =>
    `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

/**
 * 發送編劇 AI 訊息 (SSE 串流)
 */
export const sendScreenwriterMessage = async (
    message: string,
    history: Array<{ role: string; parts: Array<{ text: string }> }>,
    knowledgeBases: string[] = [],
    onChunk: (chunk: string) => void
): Promise<string> => {
    const response = await fetch(`${API_BASE_URL}/api/chat/screenwriter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message,
            history,
            knowledge_base_names: knowledgeBases,
        }),
    })

    if (!response.ok) {
        throw new Error(`API 錯誤：${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''

    if (reader) {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const text = decoder.decode(value)
            const lines = text.split('\n')

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6)
                    if (data === '[DONE]') {
                        break
                    } else if (data.startsWith('[ERROR]')) {
                        throw new Error(data.slice(8))
                    } else {
                        fullResponse += data
                        onChunk(data)
                    }
                }
            }
        }
    }

    return fullResponse
}

/**
 * 發送聊天訊息 (相容舊介面)
 */
export const sendChatMessage = async (
    message: string,
    mode: AIMode,
    knowledgeBases: string[] = []
): Promise<ChatResponse> => {
    if (mode === 'reader') {
        return analyzeSelectedText(message)
    }

    // 編劇 AI - 非串流版本
    let fullContent = ''
    await sendScreenwriterMessage(
        message,
        [],
        knowledgeBases,
        (chunk) => { fullContent += chunk }
    )

    return {
        message: {
            id: generateId(),
            role: 'assistant',
            content: fullContent,
            timestamp: Date.now(),
        },
        success: true,
    }
}

/**
 * 獲取知識庫列表
 */
export const getKnowledgeBases = async (): Promise<KnowledgeBase[]> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`)

        if (!response.ok) {
            throw new Error(`API 錯誤：${response.status}`)
        }

        const data = await response.json()

        // 轉換 API 格式為前端格式
        return data.knowledge_bases.map((kb: { name: string }) => ({
            id: kb.name,
            name: kb.name,
        }))
    } catch (error) {
        console.error('取得知識庫列表失敗:', error)
        // 回傳空陣列避免前端崩潰
        return []
    }
}

/**
 * 分析選取文字 (讀者 AI)
 */
export const analyzeSelectedText = async (
    text: string
): Promise<ChatResponse> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/reader`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        })

        if (!response.ok) {
            throw new Error(`API 錯誤：${response.status}`)
        }

        const data = await response.json()

        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: data.analysis,
                timestamp: Date.now(),
            },
            success: true,
        }
    } catch (error) {
        console.error('讀者 AI 分析失敗:', error)
        return {
            message: {
                id: generateId(),
                role: 'assistant',
                content: `分析失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
                timestamp: Date.now(),
            },
            success: false,
        }
    }
}

/**
 * 建立知識庫
 */
export const createKnowledgeBase = async (
    name: string,
    files: File[]
): Promise<{ success: boolean; message: string }> => {
    try {
        const formData = new FormData()
        formData.append('name', name)

        for (const file of files) {
            formData.append('files', file)
        }

        const response = await fetch(`${API_BASE_URL}/api/knowledge-bases`, {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || `API 錯誤：${response.status}`)
        }

        const data = await response.json()
        return {
            success: true,
            message: data.message,
        }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '建立知識庫失敗',
        }
    }
}

/**
 * 同步知識庫到 AI (相容舊介面)
 */
export const syncKnowledgeBase = async (
    knowledgeBaseId: string
): Promise<{ success: boolean; message: string }> => {
    // 知識庫已透過 RAG 自動整合，此函式保留相容性
    return {
        success: true,
        message: `知識庫「${knowledgeBaseId}」已就緒`,
    }
}

/**
 * 上傳 .docx 檔案並讀取內容
 */
export const uploadDocx = async (
    file: File
): Promise<{ content: string; filename: string; characterCount: number }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || `上傳失敗：${response.status}`)
    }

    const data = await response.json()
    return {
        content: data.content,
        filename: data.filename,
        characterCount: data.character_count,
    }
}

/**
 * 匯出文字為 .docx 檔案
 */
export const exportDocx = async (
    content: string,
    filename: string = 'my_novel.docx'
): Promise<Blob> => {
    const response = await fetch(`${API_BASE_URL}/api/files/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || `匯出失敗：${response.status}`)
    }

    return await response.blob()
}

/**
 * 刪除知識庫
 */
export const deleteKnowledgeBase = async (
    name: string
): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/knowledge-bases/${encodeURIComponent(name)}`, {
            method: 'DELETE',
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || `刪除失敗：${response.status}`)
        }

        const data = await response.json()
        return {
            success: true,
            message: data.message,
        }
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '刪除知識庫失敗',
        }
    }
}

