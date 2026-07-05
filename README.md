# Novel Assistant & Side-by-Side Project

本資料夾包含 **Novel Assistant (小說創作助手)** 的開發歷程，分為最新與舊版兩個主要部分。

## 📂 資料夾結構 (Directory Structure)

### 🚀 `SideBySide/` (Active Project)
**目前正在開發的主要專案**。這是一個結合 Electron (桌面端)、Next.js (前端) 與 Python (後端) 的應用程式，旨在實現「並排寫作輔助」體驗。

*   **Status**: 🟢 Active Development
*   **Tech Stack**: Electron, Next.js, React, TailwindCSS, Python (FastAPI/Uvicorn)
*   **Setup (Rehydration)**:
    因為我們已清理了肥大的 `node_modules`，初次下載或重構後請執行以下指令恢復環境：
    ```bash
    # 1. 還原前端依賴
    cd SideBySide/frontend
    npm install

    # 2. 還原後端依賴
    cd ../backend
    pip install -r requirements.txt
    ```

### 🏛️ `legacy_v1/` (Archived)
**第一版原型的封存檔**。包含了早期的前後端實作。僅供參考與查詢舊程式碼使用。

*   **Status**: 🔴 Archived (Read-only)
*   **Content**: 舊版 Frontend (React), Backend (FastAPI).

---

## 🛠️ 維護說明 (Maintenance)

為了保持專案輕量化 (避免 1.4GB+ 的情況復發)，請注意：

1.  **不要提交 `node_modules` 或 `.next`**：根目錄已設定 `.gitignore` 來過濾這些檔案。
2.  **定期清理**：若不再開發 v1，可考慮完全刪除 `legacy_v1` 資料夾。
