# 技術決策分析：Markdown 轉換工具比較

**文件目的**：評估 `microsoft/markitdown` 與 `kysfans/docxtomd` 兩個開源專案，應用於 Side-by-Side 專案（SideBySide Companion App）後端知識庫匯入功能的可行性、優勢與劣勢。

## 1. Microsoft MarkItDown

*   **GitHub**: [microsoft/markitdown](https://github.com/microsoft/markitdown)
*   **性質**: 微軟官方開源的 Python 函式庫，專為 LLM (大型語言模型) 數據前處理設計。

### 在本專案的技術可行性
*   **極高**。
*   它是一個標準的 Python Library，可以直接透過 `pip` 安裝並整合進我們的 FastAPI 後端 (`backend`)。
*   程式碼範例：
    ```python
    from markitdown import MarkItDown
    md = MarkItDown()
    result = md.convert("story_draft.docx")
    print(result.text_content)
    ```
*   完全符合我們 Phase 3 & 4 需要在後端自動化處理使用者檔案的需求。

### 優勢 (Pros)
1.  **多格式支援 (All-in-One)**：不只支援 Word (`.docx`)，還原生支援 Excel (`.xlsx`)、PowerPoint (`.pptx`)、PDF、HTML 甚至圖片 (OCR) 和音訊。這對於「世界聖經 (World Bible)」功能至關重要，因為編劇/小說家的設定集往往散落在各種檔案格式中。
2.  **針對 LLM 優化**：輸出的 Markdown 格式經過設計，保留了對 LLM 理解有幫助的語意結構 (Semantic Structure)，這能直接提升我們 RAG (ChromaDB) 的檢索品質。
3.  **官方維護與擴充性**：由微軟維護，穩定性較高，且架構設計允許我們撰寫自定義的 Converter (例如自定義如何解析劇本格式)。

### 劣勢 (Cons)
1.  **依賴較重**：為了支援 OCR 和各種格式，安裝時可能會引入較多依賴套件 (如 `pdfminer`, `pytesseract` 等)，可能會稍微增加 Docker Image 的大小。
2.  **專案較新**：API 可能會隨版本更新而有變動。

---

## 2. kysfans/docxtomd

*   **GitHub**: [kysfans/docxtomd](https://github.com/kysfans/docxtomd)
*   **性質**: 一個基於 Python 的輕量級工具，主要提供 GUI 介面供使用者批次轉換。

### 在本專案的技術可行性
*   **中等偏低**。
*   這個專案的設計初衷是「終端使用者工具 (End-user Tool)」，它提供了一個圖形介面 (GUI) 讓使用者手動選檔案轉換。
*   如果要整合進我們的自動化後端，我們需要剝離它的 GUI 程式碼，只提取核心轉換邏輯（通常是包裝 `pandoc` 或類似函式庫），這會增加整合的複雜度與維護成本。

### 優勢 (Pros)
1.  **單一功能專精**：如果只需處理 `.docx`，它的邏輯相對單純。
2.  **提供 GUI**：如果是要開發給使用者「手動下載並在自己電腦轉檔」的獨立小工具，這是一個不錯的參考範本。

### 劣勢 (Cons)
1.  **功能單一**：僅支援 `.docx`。若使用者上傳 PDF 設定集或 Excel 時間軸，我們需要另外尋找解決方案。
2.  **整合困難**：缺乏作為「函式庫 (Library)」被其他程式呼叫的設計接口。
3.  **維護狀態不明**：屬於個人專案，長期維護與更新頻率不如微軟官方專案有保障。

---

## 綜合比較表

| 比較項目 | Microsoft MarkItDown | kysfans/docxtomd |
| :--- | :--- | :--- |
| **整合方式** | Python Library (直接 import) | GUI/Script (需修改原始碼整合) |
| **支援格式** | Word, Excel, PPT, PDF, Image, Audio | Word (.docx) 僅限 |
| **RAG 適用性** | **高** (專為 LLM Context 設計) | 中 (通用 Markdown) |
| **維護/穩定性** | **高** (Microsoft) | 低 (個人開發者) |
| **適用場景** | **自動化後端服務、AI 數據管線** | 個人桌面轉檔小工具 |

## 結論與建議

**建議採用：Microsoft MarkItDown**

**理由**：
Side-by-Side 的核心目標是成為創作者的 AI 輔助中心。使用者的「知識庫」來源非常雜亂（可能是寫在 Excel 的時間軸、PPT 的分鏡表、或是 PDF 的參考資料）。MarkItDown 能以統一的介面處理所有這些格式，且易於整合進現有的 Python 後端，是目前最符合專案長遠發展的技術選擇。
