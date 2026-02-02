# Novel Assiment Gemini - 專案架構規劃

本文件旨在規劃 `novel_assiment_gemini` 專案的整體架構。我們將採用現代化的「無頭式架構 (Headless Architecture)」，將前端與後端完全分離，以發揮各自技術棧的最大優勢。

- **前端 (Frontend)**: 使用 **Next.js** 和 **TypeScript**，專注於提供豐富的使用者介面和流暢的互動體驗（特別是富文本編輯器）。
- **後端 (Backend)**: 使用 **Python (FastAPI)**，專注於提供高效的 API 服務、處理核心業務邏輯（例如與 Gemini API 的互動）和數據庫操作。

## 根目錄結構 (`./novel_assiment_gemini/`)

```
novel_assiment_gemini/
├── backend/              # Python FastAPI 後端專案
├── frontend/             # Next.js 前端專案
├── .gitignore            # Git 忽略清單，包含 Python 和 Node.js 的常規忽略項
└── README.md             # 專案的總說明文件
```

### 根目錄文件說明

-   `README.md`: 說明如何設定、安裝依賴、啟動專案，以及前後端的溝通方式 (API 端點)。

---

## 1. 後端專案 (`./backend/`)

後端使用 FastAPI 框架，結構清晰，易於維護和測試。

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── endpoints/
│   │       │   ├── __init__.py
│   │       │   ├── documents.py   # 處理文件相關的 API (CRUD)
│   │       │   └── auth.py        # 處理使用者認證、註冊、登入
│   │       └── api.py             # 組合所有 v1 的路由
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py          # 應用程式設定 (環境變數等)
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py            # SQLAlchemy 模型的基類
│   │   └── session.py         # 資料庫 session 管理
│   ├── models/
│   │   ├── __init__.py
│   │   ├── document.py        # `Document` 資料庫模型
│   │   └── user.py            # `User` 資料庫模型
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── document.py        # `Document` 的 Pydantic-Schema (用於 API 數據驗證)
│   │   └── user.py            # `User` 的 Pydantic-Schema
│   ├── crud/
│   │   ├── __init__.py
│   │   ├── crud_document.py   # 文件相關的資料庫操作
│   │   └── crud_user.py       # 使用者相關的資料庫操作
│   ├── __init__.py
│   └── main.py                # FastAPI 應用程式的進入點
├── tests/                    # 後端測試文件
│   └── ...
├── .env                      # 儲存環境變數 (資料庫密碼, API Keys)
└── requirements.txt          # Python 依賴列表
```

---

## 2. 前端專案 (`./frontend/`)

前端使用 Next.js 框架，並採用最新的 App Router 模式。

```
frontend/
├── app/
│   ├── (main)/               # 登入後的主要佈局
│   │   ├── documents/
│   │   │   ├── [id]/         # 動態路由，對應單一文件
│   │   │   │   └── page.tsx  # 文件編輯頁面 (富文本編輯器在此)
│   │   │   └── page.tsx      # 文件列表頁面
│   │   └── layout.tsx        # 主要佈局 (包含側邊欄、頂部導航)
│   ├── (auth)/               # 認證相關頁面 (登入、註冊)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx        # 認證頁面的佈局
│   ├── globals.css           # 全域 CSS
│   └── layout.tsx            # 根佈局
├── components/
│   ├── ui/                   # 可複用的基礎 UI 元件 (Button, Input, Card)
│   │   └── ...
│   └── editor/
│       ├── RichTextEditor.tsx  # 富文本編輯器核心元件
│       └── Toolbar.tsx         # 編輯器工具欄
├── hooks/
│   ├── useAuth.ts            # 處理使用者認證狀態的 custom hook
│   └── useApi.ts             # 封裝對後端 API 請求的 custom hook
├── lib/
│   ├── api.ts                # 集中管理所有對後端 API 的請求函數
│   └── utils.ts              # 通用工具函數
├── public/                   # 靜態資源 (圖片, icon)
├── .env.local                # 儲存前端的環境變數 (例如後端 API 的 URL)
├── package.json              # Node.js 依賴與腳本
├── tsconfig.json             # TypeScript 設定
└── next.config.mjs           # Next.js 設定
```

## 數據流範例 (儲存文件)

1.  **使用者** 在 `frontend` 的富文本編輯器中寫作，點擊「儲存」。
2.  **`RichTextEditor.tsx`** 元件觸發 `onSave` 事件。
3.  **`app/(main)/documents/[id]/page.tsx`** 頁面調用 `lib/api.ts` 中的 `saveDocument` 函數，並傳入文件內容 (通常是 JSON 或 HTML 格式)。
4.  **`saveDocument`** 函數發送一個 `PUT` 或 `POST` HTTP 請求到 `http://backend:8000/api/v1/documents/{id}` (在 Docker 環境中，服務名稱 `backend` 可被解析)。
5.  **`backend`** 的 FastAPI 應用接收到請求，路由到 `app/api/v1/endpoints/documents.py` 中的對應函式。
6.  該函式使用 `schemas/document.py` 驗證請求的數據格式。
7.  調用 `crud/crud_document.py` 中的函式，將數據寫入 PostgreSQL 資料庫。
8.  後端 API 返回成功的響應。
9.  前端接收到成功響應，向使用者顯示「儲存成功」的提示。

這個架構提供了良好的關注點分離，讓前後端都能使用最適合的工具，同時也具備了優秀的優秀擴展性和可維護性。