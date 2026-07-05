# 事後反省：background.js 欄位名稱錯誤

> **日期**：2026-02-23  
> **嚴重性**：🔴 Critical — 導致前端核心功能異常  
> **影響範圍**：API Key 狀態偵測、首次使用引導、設定畫面行為

---

## 問題描述

`background.js` 中的 `get-api-key-status` IPC handler 使用 `json.status` 讀取後端回應，但後端端點 `GET /api/config/api-key/status` 實際回傳的 JSON key 是 `is_configured`。

```diff
- return { success: true, data: json.status }       // ❌ 永遠是 undefined
+ return { success: true, data: json.is_configured } // ✅ 正確讀取 boolean
```

**結果**：`json.status` 永遠是 `undefined`，前端無法偵測到 API Key 已設定，設定畫面會在每次輪詢時重複彈出。

---

## 根本原因分析

### 1. 前後端契約未明確定義

後端端點 (`endpoints.py`) 回傳 `{"is_configured": bool}`，但在撰寫 `background.js` IPC handler 時，**憑記憶假設**回傳格式是 `{"status": bool}`，未交叉核對實際的後端程式碼。

### 2. 缺乏共用型別/介面定義

前端 (`page.tsx`) 定義了 `ElectronAPI` TypeScript 介面，但中間層 (`background.js`) 是純 JavaScript，沒有型別檢查。`background.js` 作為 Electron 主程序，無法享受 TypeScript 的編譯期保護。

### 3. 多層轉發掩蓋錯誤

資料流經三層轉發：`Backend → background.js → preload.js → page.tsx`。每一層都只檢查 `success` 和 `data`，不驗證 `data` 的內容結構。當 `data` 為 `undefined` 時，`!!undefined` 是 `false`，不會拋出錯誤，只會產生錯誤的邏輯行為。

### 4. 單元測試僅驗證「有呼叫」，未驗證「資料格式」

現有的 IPC 測試只確認 handler 被註冊與呼叫，未 mock 真實的 Backend 回應來驗證 JSON 欄位是否正確解析。

---

## 改善措施

### 短期（立即可做）

| 措施 | 說明 |
|------|------|
| **共用常數檔** | 建立 `shared/api-contracts.js`，定義 Backend 回應的欄位名稱常數，前後端共用 |
| **IPC 回應 Log** | 在 `background.js` 每個 handler 加入 `console.log` 印出解析後的資料，方便 Debug |
| **整合測試** | 新增測試案例：Mock Backend 回應 → 驗證 IPC handler 回傳值的 `data` 欄位內容 |

### 中期（下一個迭代）

| 措施 | 說明 |
|------|------|
| **background.js → TypeScript** | 將 Electron 主程序遷移至 TypeScript，共用 Backend 回應的型別定義 |
| **端對端契約測試** | 啟動 Backend → 呼叫端點 → 驗證回傳格式是否與前端預期一致 |

### 長期（架構層面）

| 措施 | 說明 |
|------|------|
| **OpenAPI Schema 驅動** | 從 FastAPI 的 OpenAPI spec 自動生成 TypeScript 型別，消除手動同步的風險 |
| **API Gateway 模式** | 在 `background.js` 建立統一的 API 轉發層，集中處理 JSON 解析與欄位驗證 |

---

## 經驗教訓

> **核心教訓**：跨層資料傳遞時，永遠不要假設欄位名稱，必須交叉核對實際的回傳格式。

1. **寫 IPC handler 前，先 `curl` 一次端點**，確認實際回傳的 JSON 結構。
2. **`undefined` 是 JavaScript 中最危險的「靜默錯誤」**，它不會拋出例外，只會讓邏輯走錯分支。
3. **「Build 通過」不等於「功能正確」**，型別安全只能保護有型別定義的範圍。
