# 資料夾結構瘦身與重構計畫 (Directory Restructuring Plan)

目前的 `novel_assiment_gemini` 資料夾大小高達 1.4GB，主要是因為包含了多個獨立專案的依賴庫 (`node_modules`) 與建置快取 (`.next`, `__pycache__`)。此外，舊專案 (v1) 與新專案 (`SideBySide`) 混合在同一層級，導致結構混亂。

本計畫旨在透過**結構分離**與**依賴清理**來達到瘦身與管理的目標。

## 1. 現狀分析 (Current Status)

目前結構混雜了 v1 專案與 SideBySide 專案：

```text
novel_assiment_gemini/ (Root)
├── node_modules/         <-- [V1] 重複的依賴 (佔用大量空間)
├── package.json          <-- [V1] 依賴定義
├── backend/              <-- [V1] 舊後端
├── frontend/             <-- [V1] 舊前端 (內含 node_modules, .next)
├── vitest_pass.png       <-- v1 相關圖檔
├── SharedScreenshot.jpg  <-- v1 相關圖檔
└── SideBySide/           <-- [New] 獨立專案
    ├── frontend/         <-- [New] 前端 (內含 node_modules, .next) - 這些可以刪除！
    └── backend/          <-- [New] 後端 (內含 pycache 等)
```

**空間佔用主因：**
1.  **三重 `node_modules`**：Root 層級、V1 Frontend、SideBySide Frontend (和 Root) 各有一份，極度浪費空間。
2.  **建置快取**：`.next` 資料夾與 Python `__pycache__`、`.pytest_cache`。

---

## 2. SideBySide 依賴處理 (Dependency Management)

針對您正在開發的 `SideBySide` 專案，以下是**「刪除 vs 保留」**的明確準則：

### ❌ 應該刪除 (Delete) - 為了瘦身
這些**只是下載來的副本**或**編譯產生的檔案**，刪除後隨時可以重新產生。
*   `SideBySide/frontend/node_modules/` (最佔空間的元兇)
*   `SideBySide/frontend/.next/`
*   `SideBySide/backend/.pytest_cache/`
*   `SideBySide/backend/__pycache__/`
*   `SideBySide/frontend/.turbo/` (如果有)

### ✅ 必須保留 (Keep) - 為了開發
這些是**定義檔**，告訴程式需要下載哪些依賴。**絕對不能刪除**。
*   `SideBySide/frontend/package.json` (清單：React, Electron, Next.js 等)
*   `SideBySide/frontend/package-lock.json` (鎖定版本，確保一致性)
*   `SideBySide/backend/requirements.txt` (清單：FastAPI, Uvicorn 等)
*   `SideBySide/backend/pyproject.toml` (若有)

---

## 3. 建議的新結構 (Proposed Structure)

將舊專案歸檔至 `legacy_v1`，並將 `SideBySide` 確保獨立。

```text
novel_assiment_gemini/
├── .gitignore              # 全域忽略檔 (防止再次提交垃圾檔案)
├── README.md               # 專案總說明
├── restructure_plan.md     # 本計畫檔案
│
├── legacy_v1/              # [歸檔] 原本散落在根目錄的專案 (v1)
│   ├── backend/            # 原本的 backend/
│   ├── frontend/           # 原本的 frontend/
│   ├── package.json        # 原本根目錄的 package.json
│   └── ... (其他舊檔)
│
└── SideBySide/             # [主專案] 結構不變，但乾淨了
    ├── frontend/
    │   ├── package.json    # [保留] 
    │   └── src/            # [保留]
    ├── backend/
    │   ├── requirements.txt# [保留]
    │   └── app/            # [保留]
    └── docs/
```

---

## 4. 執行與恢復步驟 (Action & Rehydration)

若您同意此計畫，順序如下：

**Step 1: 清理與移動 (Clean & Move)**
1.  刪除所有 `node_modules` 與 `.next` 資料夾 (含 SideBySide 內的)。
2.  建立 `legacy_v1` 並移動舊專案檔案 (參見前版計畫)。

**Step 2: 恢復 SideBySide 開發環境 (Rehydrate)**
移動完畢後，您需要做一次性的「重新安裝」來恢復開發環境：

**Frontend:**
```bash
cd novel_assiment_gemini/SideBySide/frontend
npm install  # 這會根據 package.json 重新下載乾淨的 node_modules
```

**Backend:**
```bash
cd novel_assiment_gemini/SideBySide/backend
pip install -r requirements.txt
```

這不僅能大幅減少空間 (刪除了沒用到的依賴)，還能確保 `SideBySide` 擁有一個全新且乾淨的環境。
