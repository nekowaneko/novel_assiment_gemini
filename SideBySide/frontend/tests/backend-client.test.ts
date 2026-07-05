import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer, Server, IncomingMessage, ServerResponse } from 'http'
import { AddressInfo } from 'net'

// ──────────────────────────────────
// 測試策略：行為驗證（postmortem 的教訓 — 不只驗證「有呼叫」，
// 更要驗證「資料內容正確」）。
// backend-client.js 是純 Node 模組（無 electron 副作用），
// 可直接 require 並對著本機測試伺服器實測串流行為。
// ──────────────────────────────────

const { postToBackend, postToBackendStream, getFromBackend, toIpcResult } = require('../main/backend-client')

let server: Server
let base: string

// 依路徑模擬不同的 Backend 行為
const routes: Record<string, (req: IncomingMessage, res: ServerResponse) => void> = {
    // 模擬 /api/analyze 的 StreamingResponse：分三塊送出，中間有延遲
    '/stream': (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.write('第一段建議。')
        setTimeout(() => {
            res.write('第二段建議。')
            setTimeout(() => {
                res.write('第三段建議。')
                res.end()
            }, 20)
        }, 20)
    },

    // 模擬中文字（UTF-8 三位元組）被 TCP 分段從中切開
    '/split-multibyte': (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
        const buf = Buffer.from('小說創作', 'utf-8') // 12 bytes
        res.write(buf.subarray(0, 4)) // 「小」+「說」的前 1 byte
        setTimeout(() => {
            res.write(buf.subarray(4))
            res.end()
        }, 20)
    },

    // 模擬 FastAPI HTTPException 的錯誤回應
    '/error': (_req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ detail: 'Gemini API 錯誤' }))
    },

    // 模擬 GET /api/config/api-key/status
    '/status': (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ is_configured: true }))
    },
}

beforeAll(async () => {
    server = createServer((req, res) => {
        const handler = routes[req.url ?? '']
        if (handler) {
            handler(req, res)
        } else {
            res.writeHead(404)
            res.end()
        }
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address() as AddressInfo
    base = `http://127.0.0.1:${port}`
})

afterAll(async () => {
    await new Promise((resolve) => server.close(resolve))
})

describe('postToBackendStream 串流行為', () => {
    it('應逐塊呼叫 onChunk，且累積內容與完整回應一致', async () => {
        const chunks: string[] = []
        const result = await postToBackendStream('/stream', { text: 'hi' }, (chunk: string) => {
            chunks.push(chunk)
        }, base)

        expect(result.status).toBe(200)
        // 逐塊推送：至少收到多於一塊（伺服器分三次、有延遲送出）
        expect(chunks.length).toBeGreaterThan(1)
        // 資料完整性：chunk 串起來 === 完整 body
        expect(chunks.join('')).toBe('第一段建議。第二段建議。第三段建議。')
        expect(result.body).toBe('第一段建議。第二段建議。第三段建議。')
    })

    it('中文字被 TCP 分段切開時不應產生亂碼', async () => {
        const chunks: string[] = []
        const result = await postToBackendStream('/split-multibyte', {}, (chunk: string) => {
            chunks.push(chunk)
        }, base)

        expect(result.body).toBe('小說創作')
        expect(chunks.join('')).toBe('小說創作')
        // 每一塊都必須是合法字串（不含 U+FFFD 替換字元）
        for (const chunk of chunks) {
            expect(chunk).not.toContain('�')
        }
    })

    it('非 200 回應不應觸發 onChunk，並完整回傳錯誤 body', async () => {
        const chunks: string[] = []
        const result = await postToBackendStream('/error', {}, (chunk: string) => {
            chunks.push(chunk)
        }, base)

        expect(result.status).toBe(500)
        expect(chunks).toHaveLength(0)
        expect(JSON.parse(result.body)).toEqual({ detail: 'Gemini API 錯誤' })
    })

    it('連線失敗時應 reject', async () => {
        // 埠 1 幾乎必然拒絕連線
        await expect(
            postToBackendStream('/stream', {}, null, 'http://127.0.0.1:1')
        ).rejects.toThrow()
    })
})

describe('toIpcResult — Backend 回應轉 IPC 格式', () => {
    it('200 + JSON 應回傳 success 與解析後的資料', () => {
        const result = toIpcResult({ status: 200, body: '{"status":"success","count":3}' })
        expect(result).toEqual({ success: true, data: { status: 'success', count: 3 } })
    })

    it('200 + mapData 應挑出指定欄位（如 is_configured）', () => {
        const result = toIpcResult(
            { status: 200, body: '{"is_configured":true}' },
            (json: any) => json.is_configured
        )
        expect(result).toEqual({ success: true, data: true })
    })

    it('200 + 純文字（串流全文）應原樣回傳', () => {
        const result = toIpcResult({ status: 200, body: '這是串流全文' })
        expect(result).toEqual({ success: true, data: '這是串流全文' })
    })

    it('500 + FastAPI detail 應回傳 success: false 與錯誤訊息', () => {
        const result = toIpcResult({ status: 500, body: '{"detail":"Gemini API 錯誤"}' })
        expect(result).toEqual({ success: false, error: 'Gemini API 錯誤' })
    })

    it('400 應為失敗 — 過去不檢查狀態碼導致 4xx 被誤判成功', () => {
        const result = toIpcResult({ status: 400, body: '{"detail":"API Key cannot be empty"}' })
        expect(result.success).toBe(false)
        expect(result.error).toBe('API Key cannot be empty')
    })

    it('非 200 且 body 非 JSON 時應以原文作為錯誤訊息', () => {
        const result = toIpcResult({ status: 502, body: 'Bad Gateway' })
        expect(result).toEqual({ success: false, error: 'Bad Gateway' })
    })
})

describe('postToBackend / getFromBackend（非串流）', () => {
    it('postToBackend 應回傳完整 body', async () => {
        const result = await postToBackend('/stream', { text: 'hi' }, base)
        expect(result.status).toBe(200)
        expect(result.body).toBe('第一段建議。第二段建議。第三段建議。')
    })

    it('getFromBackend 應正確取得 JSON（欄位名 is_configured，見 postmortem）', async () => {
        const result = await getFromBackend('/status', base)
        expect(result.status).toBe(200)
        expect(JSON.parse(result.body).is_configured).toBe(true)
    })
})
