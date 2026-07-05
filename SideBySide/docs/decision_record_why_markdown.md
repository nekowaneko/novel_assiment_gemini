# 技術決策答疑：為什麼優先選擇 Markdown 而非 Word？

您提出了一個非常好的問題。我們在架構中優先支援 Markdown/純文字 (例如 Scrivener/Obsidian 的底層格式)，而非直接攻克 Word (.docx)，主要基於以下 **技術 (Technical)** 與 **戰略 (Strategic)** 考量：

## 1. 技術原因：RAG 的準確度 (Data Quality)

*   **信噪比 (Signal-to-Noise Ratio):**
    *   **Markdown:** 是「純淨的文字」。AI 讀取時，能精準抓到標題 (#)、列表 (-) 與內文。這對於 RAG (建立知識庫) 來說是最高品質的飼料。
    *   **Word (.docx):** 底層是複雜的 XML。它包含大量與內容無關的「格式雜訊」(字體大小、顏色、頁碼、段落間距)。若解析不好，AI 容易「吃壞肚子」，導致檢索結果變差（例如把頁碼誤認為數據）。

*   **解析成本 (Parsing Cost):**
    *   Markdown 解析極快，幾乎零延遲。
    *   Word 解析需要專用圖書館 (如 `python-docx`)，且處理大型文檔 (十萬字小說) 時容易變慢或崩潰。

## 2. 戰略原因：避開紅海，進攻利基 (Niche Strategy)

*   **Word 是微軟的主場：** Microsoft 已經在推 Copilot Pro。如果我們的主戰場是 Word，我們就是直接跟微軟硬碰硬。
*   **Markdown 是被遺忘的藍海：** Scrivener、Obsidian、Ulysses 這些「硬核創作者」使用的軟體，官方整合 AI 的速度非常慢（甚至抗拒）。這群 **「文字工匠」** 才是最渴望 Side-by-Side 解決方案的客群。

## 3. 未來路徑
*   **Phase 1 (MVP):** 專注 Markdown/TXT，確保 AI 更聰明。
*   **Phase 2:** 引入 `.docx` 解析器 (使用 `langchain` 的 `UnstructuredWordDocumentLoader`)，相容 Word 使用者。

---
*註：這不代表我們放棄 Word 使用者，Side-by-Side 的懸浮視窗依然可以在 Word 上面運作，只是初期「讀取設定檔 (RAG)」的功能會優先支援 Markdown 格式的筆記。*
