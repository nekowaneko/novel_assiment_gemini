# 編碼標準 (Coding Standards)

本文件概述了「Shopee Auto v2」專案的編碼標準，這些標準嚴格遵循專案的技術偏好，旨在確保程式碼的**現代化、功能性、型別安全、可讀性與可維護性**。

## 1. 程式碼風格與 Pythonic (Code Style & Pythonic)

- **PEP 8 基礎:** 嚴格遵循 [PEP 8 Style Guide for Python Code](https://www.python.org/dev/peps/pep-0008/)。
- **自動格式化:** 建議使用 `black` (行長度 88) 和 `isort` (排序 import) 進行自動格式化，確保風格一致。
- **可讀性與簡潔性:** 優先考慮程式碼的清晰度與易懂性。避免不必要的冗長，但不能犧牲可讀性。擁抱 Python 慣用法 (Idiomatic Python)，例如列表推導式 (list comprehensions)、上下文管理器 (context managers)。
- **命名慣例:**
    - 變數/函式: `snake_case`
    - 常數: `UPPER_SNAKE_CASE`
    - 類別: `PascalCase`

## 2. 功能性程式設計原則 (Functional Programming Paradigms)

- **不可變性 (Immutability):** 優先使用不可變的數據結構。
- **純函式 (Pure Functions):** 函式應盡量避免副作用，對於相同的輸入應產生相同的輸出。
- **高階函式:** 適當利用 `map`, `filter` 或列表推導式來提升程式碼的清晰度與簡潔性。

## 3. 強型別與型別安全 (Strong Typing & Type Safety)

- **型別提示 (Type Hints):** 所有函式簽名、變數宣告及複雜數據結構都必須使用型別提示。
- **Mypy 合規:** 程式碼應通過 `mypy` 的嚴格檢查。
- **數據結構定義:** 優先使用 `dataclasses` 或 `Pydantic` 來定義結構化數據，而非普通的字典或元組。

## 4. 測試驅動開發思維 (Test-Driven Development Mindset)

- **可測試性:** 程式碼設計應考慮易於測試。
- **單元測試:** 每個函式/方法都應有對應的單元測試。
- **清晰斷言:** 測試應包含清晰且具體的斷言。

## 5. 錯誤處理與日誌 (Error Handling & Logging)

- **明確的例外:** 適當使用自定義例外類型。
- **優雅降級:** 系統應設計為能優雅地處理錯誤。
- **日誌記錄:** 使用 Python 的 `logging` 模組記錄有用的訊息。

## 6. 模組化與可重用性 (Modularity & Reusability)

- **小而專注的單元:** 函式和類別應職責單一。
- **清晰的介面:** 模組和類別應有明確定義的 API。

## 7. 文件 (Documentation)

- **清晰的文件字串 (Docstrings):** 所有公開的模組、函式、類別和方法都應有全面性的文件字串，解釋其用途、參數和回傳值。遵循 [PEP 257 Docstring Conventions](https://www.python.org/dev/peps/pep-0257/)。
- **行內註解:** 僅在程式碼本身不夠清晰，需要解釋「為什麼」時使用。

