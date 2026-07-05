### **產品需求文件 (Product Requirement Document)**

**專案名稱：** AI 寫作伴侶 (AI Writing Companion) - Side-by-Side Edition
**版本：** 0.1 (Draft Pivot)
**狀態：** 待市場驗證 (Pending Market Validation)

---

#### **1. 介紹與轉型策略 (Introduction & Pivot Strategy)**

**1.1 產品定位**
本產品已從「全功能編輯器」轉型為**「AI 寫作伴侶 (Companion App)」**。
它是一個**獨立懸浮視窗 (Floating Window)** 應用程式，旨在與創作者現有的主力寫作軟體（如 Microsoft Word, Scrivener, Obsidian）並排使用。它不試圖取代原本的編輯器，而是提供一個「專屬的第二大腦」，負責管理設定、提供靈感與進行讀者視角的模擬。

**1.2 核心價值主張**
*   **不打斷心流：** 透過「並排顯示」與「置頂」功能，減少視窗切換的認知負擔。
*   **尊重習慣：** 讓作者繼續使用最熟悉的工具寫作，無需遷移成本。
*   **深度整合：** 透過 Clipboard 或簡單的交互，提供 RAG (檢索增強生成) 級別的上下文輔助。

---

#### **2. 解決的核心問題 (Problem Statement)**

我們專注於解決小說創作者的四大痛點，並透過市場調查確認其優先級：

1.  **工作流程割裂 (Workflow Fragmentation)：** *[待驗證優先級]* 
    *   **現狀：** 寫作時需在 Word、筆記軟體、瀏覽器 (查資料/ChatGPT) 之間頻繁切換。
    *   **解法：** 一個永遠在手邊的懸浮視窗，整合知識庫與 AI。
2.  **維持一致性 (Consistency)：** *[待驗證優先級]*
    *   **現狀：** 忘記設定導致前後矛盾。
    *   **解法：** 內建 RAG 知識庫，AI 編劇隨時檢查設定。
3.  **創意枯竭 (Creative Block)：** *[待驗證優先級]*
    *   **現狀：** 卡關時缺乏討論對象。
    *   **解法：** AI 編劇提供具體的情節建議與腦力激盪。
4.  **市場驗證缺乏 (Lack of Validation)：** *[待驗證優先級]*
    *   **現狀：** 不確定讀者反應。
    *   **解法：** AI 讀者提供模擬的讀後感與優缺點分析。

---

#### **3. 產品功能需求 (Product Features)**

**3.1 核心功能 Epic 1：伴侶視窗體驗 (Companion Window Experience)**
*   **US 1.1 懸浮置頂 (Always-on-Top)：** 應用程式需能設定為「最上層顯示」，確保在作者使用 Word/Scrivener 時不會被遮擋。
*   **US 1.2 緊湊模式 (Compact Mode)：** UI 設計需適合長條形視窗（類似手機或側邊欄），字體與按鈕需自動適應。
*   **US 1.3 剪貼簿監聽 (Clipboard Integration) [MVP]：** 當使用者在 Word 複製文字時，伴侶 App 能自動偵測並詢問是否將其作為「上下文」或「輸入」。

**3.2 核心功能 Epic 2：AI 角色互動 (AI Personas)**
*   **US 2.1 AI 編劇 (The Screenwriter)：**
    *   **功能：** 針對選取的知識庫內容進行對話、情節發想。
    *   **特色：** 具備「長期記憶」，能記住專案的特殊名詞與設定。
*   **US 2.2 AI 讀者 (The Reader)：**
    *   **功能：** 針對使用者貼上的小說片段給予評價。
    *   **輸出：** 結構化回饋（整體感受、優點、改進建議）。

**3.3 核心功能 Epic 3：知識庫管理 (Knowledge Base)**
*   **US 3.1 快速參照：** 允許使用者建立與管理角色卡、世界觀設定。
*   **US 3.2 拖選引用：** 在與 AI 對話時，能快速勾選相關的設定作為 Context。

---

#### **4. 技術架構調整 (Technical Pivot)**

*   **前端：** 繼續使用 Next.js，但需針對 Electron 或類似的 WebView 容器進行 RWD 優化，專注於 `Mobile-First` 或 `Sidebar-First` 的佈局設計。
*   **後端：** 繼續使用 Python (FastAPI/Flask) 提供 RAG 與 Gemini API 串接。
*   **交付形式：** 
    *   *Phase 1:* 本地網頁 (Localhost Browser Window，使用者手動調整大小，或配合 Chrome App 模式)。
    *   *Phase 2:* Electron 應用程式 (提供原生視窗管理)。

---

#### **5. 市場調查目標 (Market Research Goals)**

在正式開發前，我們需要透過調查驗證以下假設：
1.  **介面偏好：** 創作者是否接受「手動調整視窗」作為 MVP，還是必須要「自動吸附」？
2.  **AI 價值：** 「AI 讀者」與「AI 編劇」哪個對使用者的付費意願影響更大？
3.  **痛點排序：** 上述四大痛點的真實權重，以決定功能開發順序。
