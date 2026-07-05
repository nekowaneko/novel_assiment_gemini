const { contextBridge, ipcRenderer } = require('electron')

// 透過 contextBridge 安全地暴露 API 給渲染程序
// 這就像 Python 的 API Gateway，統一對外介面
contextBridge.exposeInMainWorld('electronAPI', {
  // 調整視窗大小
  resizeWindow: (width, height) => {
    ipcRenderer.send('resize-window', { width, height })
  },

  // 接收剪貼簿更新事件
  onClipboardUpdate: (callback) => {
    ipcRenderer.on('clipboard-update', (_event, text) => callback(text))
  },

  // 分析文字（編劇模式）— 串流轉發至 Backend /api/analyze
  // 回傳的 Promise 在串流結束後 resolve（data 為完整全文）
  analyzeText: (text, history = []) => {
    return ipcRenderer.invoke('analyze-text', { text, history })
  },

  // 接收編劇分析的串流片段（分析進行中逐塊推送）
  onAnalyzeChunk: (callback) => {
    ipcRenderer.on('analyze-chunk', (_event, chunk) => callback(chunk))
  },

  // 匯入知識庫 — 轉發至 Backend /api/ingest
  ingestText: (documents) => {
    return ipcRenderer.invoke('ingest-text', { documents })
  },
  readerAnalyze: (text) => {
    return ipcRenderer.invoke('reader-analyze', { text })
  },
  setApiKey: (apiKey) => {
    return ipcRenderer.invoke('set-api-key', { apiKey })
  },
  getApiKeyStatus: () => {
    return ipcRenderer.invoke('get-api-key-status')
  },
})

