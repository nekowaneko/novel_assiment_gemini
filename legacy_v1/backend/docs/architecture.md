# 專案架構文件 (Architecture Document)
# 專案名稱： AI 寫作伴侶 (AI Writing Companion)

## 1. 專案概述 (Project Overview)
本文件定義「AI 寫作伴侶」專案的技術架構，旨在實作一個專為個人獨立開發者設計、開發時程最短的 LLM 應用。此應用程式將透過深度整合作者的個人創作內容與 Google Gemini 模型，提供無縫的寫作與創意協作體驗。

## 2. 架構選擇 (Architectural Choices)
基於「快速原型開發 (Fast Prototyping)」原則，我們選擇了一個簡潔且高度整合的單體架構 (Monolithic Architecture)。此架構的核心目標是利用單一 Python 語言與相關生態系，來快速實現所有核心功能，以達成最短的開發時程。

* 單體架構： 前端與後端邏輯緊密整合在一個應用程式中。

* 技術選型核心： 採用 Streamlit 作為主要框架，它能用純 Python 快速建立互動式網頁介面，無需額外的網頁開發技術。


## 3. 技術堆疊 (Technical Stack)

| 類別	| 技術/服務	| 選擇原因與用途 |
| :--- | :--- | :--- |
| 應用框架	| Streamlit	| 最短的開發時長。提供豐富的 UI 元件（如檔案上傳、文字編輯器、聊天介面），且易於用 Python 進行狀態管理與邏輯串接。 |
| LLM 邏輯	| LangChain (Python)	| 用於管理複雜的 LLM 互動。特別是其 Memory 模組，能高效地處理多輪對話的上下文（如編劇 AI 的討論），確保開發時程最短且具備模組化。 |
| LLM 服務	| Google AI SDK (Python)	| 作為呼叫 Gemini API 的官方函式庫，確保穩定的連接與高效的資料傳輸。 |
| 文件處理	| python-docx 函式庫	| 用於讀取和寫入 .docx 檔案，實現使用者上傳與編輯功能。 |
| 檔案儲存	| 本地端檔案系統	| 符合 PRD 中「資料必須儲存在使用者本機」的核心隱私原則，無需額外的雲端服務或資料庫。 |


---
## 4. 功能與技術對應 (Feature-to-Tech Mapping)

| PRD 功能	| 技術實作細節 |
| :--- | :--- |
| 1. 使用者上傳與編輯 .docx	| <ul><li>上傳： 使用 st.file_uploader 元件讓使用者上傳 .docx 檔案。</li><li>讀取： 使用 python-docx 函式庫讀取檔案內容，並顯示在 Streamlit 的文字編輯器（如 st.text_area）中。</li><li>編輯： 使用者在 st.text_area 中編輯內容後，應用程式可將修改後的字串存回本地檔案，或提供下載更新後 .docx 的選項。</li></ul> |
| 2. 讀者AI給出讀後評價	| <ul><li>選取： 在 Streamlit 文字編輯器中，使用者選取內容。透過前端互動與後端邏輯，將選取片段作為輸入。</li><li>呼叫： 應用程式後端直接呼叫 Google AI SDK，以選取的片段作為提示（Prompt），向 Gemini API 請求「讀後評價」。</li><li>顯示： 將 AI 回覆內容顯示在介面側邊欄或專用區塊。此為單次呼叫，無需 LangChain。</li></ul> |
| 3. 與編劇AI討論情節設計	| <ul><li>介面： 在 Streamlit 應用中建立一個獨立的聊天介面，類似於 st.chat_message。</li><li>上下文管理： 這是核心！ 使用 LangChain 的 ConversationBufferMemory 或類似模組。使用者每輸入一句話，後端就會將對話紀錄儲存在 LangChain 的記憶體中。</li><li>LLM 呼叫： 每次呼叫 Gemini API 時，將 LangChain 管理的對話歷史與使用者當前輸入一併傳送，確保 AI 具備完整的對話上下文。</li></ul> |
| 4. 複製AI對話並修改小說	| <ul><li>複製： Streamlit 聊天介面會以可選取的文字顯示 AI 回覆。使用者可直接透過瀏覽器功能選取與複製。</li><li>修改： 使用者將複製內容手動貼回 st.text_area 編輯器，以更新小說內容。此為使用者操作流程，無需複雜的程式邏輯。</li></ul> |

本專案將是一個使用 **Electron 框架** 建置的跨平台桌面應用程式。使用者介面將是一個在 Electron 殼層中運行的、用 **React** 開發的單頁應用程式 (SPA)。此架構確保所有功能只需執行一個檔案即可在本地使用。資料將透過 Node.js API 直接儲存在本機檔案系統上，以保障使用者隱私。應用程式僅在需要呼叫 Google Gemini API 時才需要網路連線。

## 5. 非功能性需求考量 (Non-functional Considerations)

*   效能 (Performance): Streamlit 應用會以非同步方式處理 LLM API 請求，避免介面卡頓。同時，可利用 Streamlit 提供的 st.write_stream 功能，以串流方式顯示 AI 的即時回覆，改善使用者體驗。

*   資料隱私與安全 (Data Privacy & Security): 應用程式完全遵循 PRD 要求。所有.docx文件皆儲存在本地端，絕不傳輸到任何雲端。只有使用者「主動選取」的文字片段與「手動輸入」的提問會作為提示，傳送給 Google Gemini API 進行處理。

*   相容性 (Compatibility): Streamlit 應用在主流的現代瀏覽器上均能正常運作，符合 PRD 要求。
