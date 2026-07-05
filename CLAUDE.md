# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

This repo contains two generations of a "Novel Assistant" (小說創作助手) project:

- **`SideBySide/`** — the active project. An always-on-top desktop companion app for novel writers: Electron + Next.js frontend, Python FastAPI backend, local ChromaDB RAG, Gemini LLM.
- **`legacy_v1/`** — archived first prototype (React + FastAPI). Read-only, reference only. Do not develop here.

⚠️ The root `AGENTS.md` describes an even older Streamlit-based version (`streamlit run app.py`, vitest for a Python app, `docs/stories/`, etc.) — its commands and file paths do **not** apply to `SideBySide/`. Its code-style section (Python 3.10+, type hints, snake_case, isort ordering, explicit exceptions) is still the intended style.

Docs, comments, commit messages, and AI prompts are written in Traditional Chinese (zh-TW); follow that convention.

## Commands

### Frontend (`SideBySide/frontend/`)

```bash
npm install            # rehydrate node_modules (deliberately not committed)
npm run dev            # concurrently: next dev (localhost:3000) + electron
npm test               # vitest run
npx vitest run tests/window.test.ts   # single test file
npm run lint           # ⚠️ broken: no ESLint config exists; hangs on an interactive setup prompt. Use `npx tsc --noEmit -p tsconfig.json` instead
npm run build          # next build → static export to out/ (used by packaged Electron)
```

### Backend (`SideBySide/backend/`)

```bash
pip install -r requirements.txt
# Also used by the code but missing from requirements.txt: markitdown, watchdog, python-dotenv
python -m uvicorn app.main:app --reload --port 8000   # run from backend/ dir
pytest                          # all tests (tests/)
pytest tests/test_rag.py        # single test file
pytest -k <pattern>             # single test by name
```

`SideBySide/start.bat` launches both services in separate windows (backend on :8000, API docs at :8000/docs, frontend on :3000). It activates the `base` conda env first.

## Architecture

Three processes, two IPC hops. Data flows:

```
page.tsx (Next.js renderer)
  → window.electronAPI (preload.js, contextIsolation)
  → ipcMain handlers in main/background.js (Electron main process)
  → HTTP to FastAPI at http://localhost:8000/api/*
  → chroma_service (local vector DB) + gemini_client (Gemini API)
```

### Frontend (`SideBySide/frontend/`)

- **`main/background.js`** is the Electron main process entry (`package.json` `main` field) and is hand-written **CommonJS JavaScript** — the adjacent `background.ts` is not what runs. It owns the frameless, transparent, always-on-top floating window, clipboard polling, and all HTTP calls to the backend via IPC handlers.
- **`app/`** — Next.js App Router pages; `next.config.js` uses `output: 'export'` (static export) so the packaged Electron app loads `out/index.html`; dev mode loads `http://localhost:3000`.
- **`renderer/components/`** — React components (e.g. `FloatingWindow.tsx`).
- **`preload.js`** — bridges renderer ↔ main with `contextIsolation: true`.

### Backend (`SideBySide/backend/app/`)

- **`api/endpoints.py`** — all routes under `/api`: `/ingest`, `/ingest-file` (MarkItDown conversion → chunking → ChromaDB), `/analyze` (RAG retrieval + streaming Gemini response via `StreamingResponse`), `/reader`, `/config/api-key` (+ `/status`).
- **`rag/chroma_service.py`** — ChromaDB `PersistentClient` at `chroma_db/` (relative to the process CWD, hence run uvicorn from `backend/`), collection `novel_context`.
- **`llm/gemini_client.py`** — `gemini-2.5-flash`; two personas: scriptwriter (編劇, streaming multi-turn chat with RAG context) and reader (讀者, single-shot critique). Module-level singletons (`gemini_client`, `chroma_service`, `document_processor`) are instantiated at import time.
- **`services/`** — `document_processor.py` (MarkItDown → Markdown → overlapping chunks; supported extensions defined in `SUPPORTED_EXTENSIONS`) and `file_watcher.py` (watchdog-based re-indexing of a watched folder).

### API key handling

`GEMINI_API_KEY` lives in `backend/.env` (gitignored). It can also be set at runtime via `POST /api/config/api-key`, which updates the env in-memory **and rewrites `backend/.env`**.

## Known pitfall: localhost vs 127.0.0.1

The Electron main process must call the backend at `http://127.0.0.1:8000`, never `http://localhost:8000`: Node 17+ resolves `localhost` to IPv6 `::1` first, but uvicorn binds IPv4 only, so every main-process request fails with `ECONNREFUSED ::1:8000` — while the renderer's `fetch` (Chromium network stack) still succeeds, making the status dot green and the failure look mysterious. `BACKEND_BASE` lives in `main/backend-client.js`.

Related: `backend/.env` must stay UTF-8 **without BOM**. A BOM once broke `update_api_key()`'s `startswith("GEMINI_API_KEY=")` match, causing duplicate key lines on every save (the writer now reads `utf-8-sig` and dedupes, but don't reintroduce BOMs — PowerShell 5.1 `Set-Content -Encoding utf8` writes one; use `[IO.File]::WriteAllText` with `UTF8Encoding($false)` instead).

## Known pitfall: cross-layer field names

A past critical bug (`docs/postmortem_background_js_field_mismatch.md`): `background.js` assumed the backend returned `{status: ...}` when the actual field was `is_configured`. Because `background.js` is untyped JS and every layer only checks `success`/`data`, a wrong field name silently becomes `undefined`. When touching IPC handlers, verify the exact JSON shape against `endpoints.py` (or curl the endpoint) rather than assuming field names.

## Housekeeping

Never commit `node_modules/`, `.next/`, `out/`, `__pycache__/`, or `.pytest_cache/` — the repo was once 1.4GB because of these (see `restructure_plan.md`).
