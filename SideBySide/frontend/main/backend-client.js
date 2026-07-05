// Backend HTTP client — 純 Node 模組（不依賴 Electron），供 background.js 使用
// 抽離成獨立模組是為了讓 Vitest 能直接 require 進行行為測試
// （background.js 有頂層 require('electron') 副作用，無法在測試中載入）

const http = require('http')

// 必須用 127.0.0.1 而非 localhost：Electron 主程序的 Node (v17+) 會把
// localhost 優先解析成 IPv6 的 ::1，但 uvicorn 只綁 IPv4，
// 導致 http.request 出現 ECONNREFUSED ::1:8000。
// （渲染程序的 fetch 走 Chromium 網路層會自動回退 IPv4，所以狀態燈是綠的）
const BACKEND_BASE = 'http://127.0.0.1:8000'

// POST 並以串流方式接收回應。
// 每收到一塊資料就呼叫 onChunk(chunk)（僅在 HTTP 200 時），
// 結束時 resolve { status, body }，body 為完整累積文字。
// setEncoding('utf8') 內部使用 StringDecoder，
// 確保多位元組字元（中文）被 TCP 分段切開時不會產生亂碼。
const postToBackendStream = (apiPath, body, onChunk, base = BACKEND_BASE) => {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const url = new URL(apiPath, base)

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        res.setEncoding('utf8')
        let responseBody = ''
        res.on('data', (chunk) => {
          responseBody += chunk
          if (res.statusCode === 200 && onChunk) {
            onChunk(chunk)
          }
        })
        res.on('end', () => {
          resolve({ status: res.statusCode, body: responseBody })
        })
      }
    )

    req.on('error', (err) => {
      reject(err)
    })

    req.write(data)
    req.end()
  })
}

// POST 並一次取得完整回應（非串流端點使用）
const postToBackend = (apiPath, body, base = BACKEND_BASE) => {
  return postToBackendStream(apiPath, body, null, base)
}

const getFromBackend = (apiPath, base = BACKEND_BASE) => {
  return new Promise((resolve, reject) => {
    const url = new URL(apiPath, base)

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
      },
      (res) => {
        res.setEncoding('utf8')
        let responseBody = ''
        res.on('data', (chunk) => {
          responseBody += chunk
        })
        res.on('end', () => {
          resolve({ status: res.statusCode, body: responseBody })
        })
      }
    )

    req.on('error', (err) => {
      reject(err)
    })

    req.end()
  })
}

// 將 Backend 回應轉為 IPC 統一格式 { success, data | error }。
// 非 200 一律視為失敗，取 FastAPI 的 { detail } 作為錯誤訊息——
// 過去 handler 不檢查狀態碼，4xx/5xx 會被誤判成功（見 postmortem）。
// mapData 用於從 JSON 中挑出特定欄位（如 analysis、is_configured）。
const toIpcResult = (result, mapData = (json) => json) => {
  let json = null
  try {
    json = JSON.parse(result.body)
  } catch (e) {
    // 純文字回應（如串流全文）不是錯誤
  }

  if (result.status !== 200) {
    const detail = (json && json.detail) || result.body || `HTTP ${result.status}`
    return {
      success: false,
      error: typeof detail === 'string' ? detail : JSON.stringify(detail),
    }
  }

  return { success: true, data: json !== null ? mapData(json) : result.body }
}

module.exports = { BACKEND_BASE, postToBackend, postToBackendStream, getFromBackend, toIpcResult }
