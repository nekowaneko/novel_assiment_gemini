# 實作計畫 (Implementation Plan): Side-by-Side Companion App

**目標：** 建立一個與主要寫作軟體並排運行的懸浮視窗 AI 伴侶。
**核心技術：** Electron (前端) + Python FastAPI (後端/RAG) + Google Gemini 2.5 Flash (LLM)。

## User Review Required (需使用者確認)
> [!IMPORTANT]
> **本地 RAG 數據隱私**
> 我們將使用本地 ChromaDB 存儲用戶的寫作設定。請確認這符合您對「離線優先」的期待。

> [!WARNING]
> **Gemini 2.5 Flash**
> 根據您的要求，我們將使用 `Gemini 2.5 Flash` 模型。請確保您已申請相應的 API Key。

---

## Proposed Changes (實作步驟)

### Phase 1: 專案初始化與骨架搭建 (Scaffolding)
建立 Monorepo 結構，確保 Python 與 Node.js 環境隔離但能協同工作。

#### [NEW] `SideBySide/`
- 根目錄，包含 `frontend/` 與 `backend/`。

#### [NEW] `SideBySide/frontend/` (Electron + Next.js)
- `package.json`: 定義 Electron 與 Next.js 依賴。
- `main/`: Electron 主進程代碼 (負責視窗管理、Python 後端啟動)。
- `renderer/`: Next.js 前端代碼 (負責 UI)。

#### [NEW] `SideBySide/backend/` (Python FastAPI)
- `pyproject.toml` (Poetry): 依賴管理 (FastAPI, LangChain, ChromaDB)。
- `main.py`: API 入口點。
- `app/`: 核心邏輯 (RAG, Gemini Client)。

---

### Phase 2: 前端核心功能 - "The Float" (懸浮視窗)
實作「永遠置頂」與「剪貼簿監聽」。

#### [NEW] `frontend/main/background.ts`
- 實作 `BrowserWindow` 設定：`alwaysOnTop: true`, `frame: false` (無邊框), `transparent: true`。
- 實作由 Electron 啟動 Python FastAPI subprocess 的邏輯。

#### [NEW] `frontend/renderer/components/FloatingWindow.tsx`
- 實作緊湊型 UI (Compact Mode)。
- 實作「拖曳區域 (Drag Region)」以允許移動無邊框視窗。

#### [NEW] `frontend/shared/clipboard-monitor.ts`
- 實作剪貼簿監聽邏輯，當偵測到文字變更且 App 處於「監聽模式」時，自動發送至後端。

---

### Phase 3: 後端核心功能 - "The Brain" (RAG & Gemini)
實作本地知識庫與 AI 對話。

#### [NEW] `backend/app/rag/chroma_service.py`
- 實作 ChromaDB 初始化與文件嵌入 (Embeddings)。
- 建立 `Collection` 用於存儲角色卡與世界觀。

#### [NEW] `backend/app/llm/gemini_client.py`
- 整合 `google-generativeai` SDK。
- 設定 Model 為 `gemini-2.5-flash`。
- 實作 System Prompt 模板 (編劇/讀者/編輯)。

#### [NEW] `backend/app/api/endpoints.py`
- `POST /analyze`: 接收前段文字，執行 RAG 檢索，並呼叫 Gemini 回傳建議。
- `POST /ingest`: 掃描指定資料夾，建立/更新 RAG 索引。

---

### Phase 4: 雙向同步 (Dual-Sync)
實作檔案監聽與動態更新。

#### [NEW] `backend/app/services/file_watcher.py`
- 使用 `watchdog` 庫監聽目標資料夾。
- 當檔案變更時，觸發 `ingest` 流程更新 Vector DB。

---

## Verification Plan (驗證計畫)

### Automated Tests
- **Backend:** `pytest` 測試 FastAPI endpoints (Mock Gemini API)。
- **Frontend:** `vitest` 測試 React components。

### Manual Verification (手工驗證)
1.  **啟動測試：** 執行 `npm run dev`，確認 Electron 視窗彈出，且 Python 後端成功啟動 (Port 8000)。
2.  **置頂測試：** 打開 Word，確認 Side-by-Side 視窗懸浮在 Word 之上，且不會被遮擋。
3.  **剪貼簿測試：** 在 Word 複製一段文字，確認 Side-by-Side 顯示「偵測到新文本」。
4.  **AI 回應測試：** 點擊「詢問 AI」，確認能收到來自 Gemini 2.5 Flash 的回應。
5.  **RAG 測試：** 在「設定檔」中寫入一個特殊角色名，詢問 AI 該角色，確認 AI 能正確回答設定。
