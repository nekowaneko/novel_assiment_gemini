// Side-by-Side Companion — Electron 主程序
// 使用 CommonJS（Electron 主程序不支援 ESM）
// 這就像 Python 的 main.py，是整個桌面應用的入口

const { app, BrowserWindow, ipcMain, clipboard } = require('electron')
const path = require('path')
const { postToBackend, postToBackendStream, getFromBackend, toIpcResult } = require('./backend-client')

let mainWindow = null
let lastClipboardText = ''
let clipboardPollId = null

// ──────────────────────────────────
// 視窗建立（類似 Python 的 __init__）
// ──────────────────────────────────
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 320,
    height: 80,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // 確保視窗始終在最上層
  mainWindow.setAlwaysOnTop(true, 'screen-saver')

  // 判斷開發/正式環境（取代 ESM-only 的 electron-is-dev）
  const isDev = !app.isPackaged
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../out/index.html')}`

  mainWindow.loadURL(startUrl)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ──────────────────────────────────
// 剪貼簿監控（內嵌，避免 ESM import 問題）
// 每 1 秒輪詢一次，偵測到變化就透過 IPC 推送
// ──────────────────────────────────
const startClipboardPoll = () => {
  lastClipboardText = clipboard.readText()

  clipboardPollId = setInterval(() => {
    const text = clipboard.readText()
    if (text !== lastClipboardText) {
      lastClipboardText = text
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard-update', text)
      }
    }
  }, 1000)
}

const stopClipboardPoll = () => {
  if (clipboardPollId) {
    clearInterval(clipboardPollId)
    clipboardPollId = null
  }
}

// ──────────────────────────────────

// IPC Handlers — 渲染程序的 API 代理
// 封裝為函式，在 app ready 後才註冊（確保 ipcMain 已初始化）
// ──────────────────────────────────
const registerIpcHandlers = () => {
  // 調整視窗大小
  ipcMain.on('resize-window', (_event, { width, height }) => {
    if (mainWindow) {
      mainWindow.setSize(width, height)
    }
  })

  // 分析文字（串流轉發至 Backend /api/analyze）
  // Backend 以 StreamingResponse 回傳純文字；每收到一塊就透過
  // 'analyze-chunk' 事件推給渲染程序，結束後回傳完整全文。
  ipcMain.handle('analyze-text', async (event, { text, history }) => {
    try {
      const result = await postToBackendStream('/api/analyze', { text, history }, (chunk) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('analyze-chunk', chunk)
        }
      })

      if (result.status !== 200) {
        // 錯誤時 Backend 回傳 JSON { detail: ... }（見 endpoints.py 的 HTTPException）
        let detail = result.body
        try {
          detail = JSON.parse(result.body).detail || result.body
        } catch (e) {
          // 非 JSON 就原樣回傳
        }
        return { success: false, error: detail }
      }

      return { success: true, data: result.body }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 匯入知識庫（轉發至 Backend /api/ingest）
  ipcMain.handle('ingest-text', async (_event, { documents }) => {
    try {
      const result = await postToBackend('/api/ingest', { documents })
      return toIpcResult(result)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 讀者 AI 分析
  ipcMain.handle('reader-analyze', async (_event, { text }) => {
    try {
      const result = await postToBackend('/api/reader', { text })
      return toIpcResult(result, (json) => (json.analysis !== undefined ? json.analysis : json))
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 設定 API Key
  ipcMain.handle('set-api-key', async (_event, { apiKey }) => {
    try {
      const result = await postToBackend('/api/config/api-key', { api_key: apiKey })
      return toIpcResult(result)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })

  // 取得 API Key 狀態
  ipcMain.handle('get-api-key-status', async () => {
    try {
      const result = await getFromBackend('/api/config/api-key/status')
      // Backend 回傳 { is_configured: boolean }
      return toIpcResult(result, (json) => json.is_configured)
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}


// ──────────────────────────────────
// 應用程式生命週期
// ──────────────────────────────────
const isSingleInstance = app.requestSingleInstanceLock()

if (!isSingleInstance) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.on('ready', () => {
    registerIpcHandlers()
    createWindow()
    startClipboardPoll()
  })

  app.on('window-all-closed', () => {
    stopClipboardPoll()
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
}

// 匯出供測試使用
module.exports = { createWindow, startClipboardPoll, registerIpcHandlers }

