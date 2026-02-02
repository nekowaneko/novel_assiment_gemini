# 原始碼目錄結構 (Source Tree)

本文件定義了「AI 寫作伴侶」專案採用 Python 生態系後的標準目錄結構。所有開發都將遵循此結構，以實現最快的開發時程。

## 1. 高層次結構

```
novel-assiment-gemini/
├── .env                  # 環境變數檔案，用於儲存 API 金鑰等敏感資訊。
├── requirements.txt      # Python 專案依賴列表。
├── app.py                # 專案核心文件，Streamlit 應用程式的進入點。
├── src/                  # 應用程式原始碼目錄。
│   ├── utils/
│   │   ├── file_handler.py   # 處理 .docx 檔案的讀取與寫入。
│   │   ├── gemini_client.py  # 封裝 Gemini API 呼叫與 LangChain 邏輯。
│   │   └── __init__.py
│   └── __init__.py
├── docs/                 # 文件檔案，可保留原樣。
└── README.md             # 專案說明文件，指導使用者安裝與運行。
```

## 2.  目錄說明

*   novel-assiment-gemini/
    *  專案根目錄。

*  requirements.txt
    *  這個檔案取代了原有的 package.json，用於列出所有 Python 依賴套件，例如 streamlit、langchain、google-generativeai、python-docx。使用者只需執行 pip install -r requirements.txt 即可安裝所有所需環境。

*  app.py
    *  這是新架構的核心。它取代了原有的 src/main 和 src/renderer 兩個目錄。
    *  所有的使用者介面（UI）元件、事件處理邏輯、以及對後端函式的呼叫，都將整合在一個 Streamlit 腳本中。
    *  當使用者運行此檔案時，它將啟動一個本地網頁伺服器，並在瀏覽器中顯示應用程式。

*  src/
    *  專案的原始碼目錄。我們將原先分散在 main 和 renderer 中的邏輯，依照功能重新組織到這個目錄下的不同檔案。
    *  src/utils/
        *  一個用於存放通用輔助函式的小型模組。
        *  file_handler.py：這取代了原有的 FileSystemManager.ts。它將專門處理 .docx 檔案的讀取與寫入，以及與本地檔案系統的互動。
        *  gemini_client.py：這取代了原有的 GeminiAPIService.ts 和 ChatHistoryManager.ts。它將封裝與 Gemini API 的所有互動，並透過 LangChain 模組來管理多輪對話的歷史（ChatHistoryManager 的功能）。

*  docs/
    *  文件目錄，您可以保留原有的 .md 文件，例如 architecture.md 和 source-tree.md，因為它們是語言中立的。

*  README.md
    *  專案的入口文件，提供專案簡介、安裝步驟與運行方式。
