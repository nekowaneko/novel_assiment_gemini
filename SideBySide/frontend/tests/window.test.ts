
import { describe, it, expect, vi } from 'vitest'

// ──────────────────────────────────
// 測試策略：驗證 Electron 視窗設定與 IPC 結構
//
// background.js 是 CJS 模組且有頂層副作用（require('electron')），
// Vitest 的 vi.mock 無法完全攔截 CJS require 的解構賦值。
// 因此我們採用「設定驗證」策略而非「行為驗證」：
// 直接讀取原始碼，確認關鍵設定值正確。
// ──────────────────────────────────

const fs = require('fs')
const path = require('path')

const backgroundSource = fs.readFileSync(
    path.join(__dirname, '../main/background.js'),
    'utf-8'
)

describe('Background.js 設定驗證', () => {
    it('視窗設定應包含 alwaysOnTop: true', () => {
        expect(backgroundSource).toContain('alwaysOnTop: true')
    })

    it('視窗尺寸應為 320x80（精簡模式）', () => {
        expect(backgroundSource).toContain('width: 320')
        expect(backgroundSource).toContain('height: 80')
    })

    it('應使用 app.isPackaged 而非 electron-is-dev', () => {
        expect(backgroundSource).toContain('app.isPackaged')
        // 確認沒有 require 或 import electron-is-dev（註解中的提及不算）
        expect(backgroundSource).not.toContain("require('electron-is-dev')")
        expect(backgroundSource).not.toContain("from 'electron-is-dev'")
    })

    it('應啟用 contextIsolation 並停用 nodeIntegration', () => {
        expect(backgroundSource).toContain('contextIsolation: true')
        expect(backgroundSource).toContain('nodeIntegration: false')
    })

    it('應有 frame: false 和 transparent: true（無邊框浮動效果）', () => {
        expect(backgroundSource).toContain('frame: false')
        expect(backgroundSource).toContain('transparent: true')
    })
})

describe('IPC Handler 註冊驗證', () => {
    it('應註冊 resize-window IPC 監聽器', () => {
        expect(backgroundSource).toContain("ipcMain.on('resize-window'")
    })

    it('應註冊 analyze-text IPC handler', () => {
        expect(backgroundSource).toContain("ipcMain.handle('analyze-text'")
    })

    it('應註冊 ingest-text IPC handler', () => {
        expect(backgroundSource).toContain("ipcMain.handle('ingest-text'")
    })

    it('analyze-text 應以串流方式轉發至 /api/analyze', () => {
        expect(backgroundSource).toContain("postToBackendStream('/api/analyze'")
    })

    it('analyze-text 應透過 analyze-chunk 事件推送串流片段', () => {
        expect(backgroundSource).toContain("send('analyze-chunk'")
    })

    it('ingest-text 應轉發至 /api/ingest', () => {
        expect(backgroundSource).toContain("postToBackend('/api/ingest'")
    })

    it('應註冊 reader-analyze IPC handler', () => {
        expect(backgroundSource).toContain("ipcMain.handle('reader-analyze'")
    })

    it('應註冊 set-api-key IPC handler', () => {
        expect(backgroundSource).toContain("ipcMain.handle('set-api-key'")
    })

    it('應註冊 get-api-key-status IPC handler', () => {
        expect(backgroundSource).toContain("ipcMain.handle('get-api-key-status'")
    })

    it('非串流 handler 應透過 toIpcResult 檢查 HTTP 狀態碼（避免 4xx/5xx 誤判成功）', () => {
        // ingest-text、reader-analyze、set-api-key、get-api-key-status 四個 handler
        const count = (backgroundSource.match(/toIpcResult\(result/g) || []).length
        expect(count).toBeGreaterThanOrEqual(4)
    })

    it('串流 handler 應檢查 result.status', () => {
        expect(backgroundSource).toContain('result.status !== 200')
    })
})

describe('剪貼簿監控驗證', () => {
    it('應包含 clipboard.readText 輪詢邏輯', () => {
        expect(backgroundSource).toContain('clipboard.readText()')
    })

    it('應透過 IPC 推送剪貼簿更新', () => {
        expect(backgroundSource).toContain("clipboard-update")
    })

    it('輪詢間隔應為 1 秒', () => {
        expect(backgroundSource).toContain('1000')
    })
})

describe('應用程式生命週期驗證', () => {
    it('應使用 requestSingleInstanceLock 防止多開', () => {
        expect(backgroundSource).toContain('requestSingleInstanceLock')
    })

    it('ready 事件應呼叫 registerIpcHandlers、createWindow、startClipboardPoll', () => {
        // 取得 ready handler 的內容
        const readyMatch = backgroundSource.match(/app\.on\('ready',\s*\(\)\s*=>\s*\{([^}]+)\}/)
        expect(readyMatch).not.toBeNull()
        const readyBody = readyMatch![1]
        expect(readyBody).toContain('registerIpcHandlers()')
        expect(readyBody).toContain('createWindow()')
        expect(readyBody).toContain('startClipboardPoll()')
    })
})
