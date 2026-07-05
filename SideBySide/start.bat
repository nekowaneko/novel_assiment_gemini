@echo off
chcp 65001 >nul
title Side-by-Side Companion App

echo ============================================
echo   Side-by-Side Companion App - 啟動中...
echo ============================================
echo.

:: 取得目前 bat 檔所在目錄
set ROOT=%~dp0

:: Conda 啟動指令（確保使用正確的 Python 環境）
set CONDA_ACTIVATE=call conda activate base

:: 啟動 Backend (FastAPI) - 新視窗，先啟動 Conda
echo [啟動] Backend (FastAPI) on http://localhost:8000
start "SideBySide Backend" cmd /k "%CONDA_ACTIVATE% && cd /d %ROOT%backend && python -m uvicorn app.main:app --reload --port 8000"

:: 等待 Backend 啟動
timeout /t 3 /nobreak >nul

:: 啟動 Frontend (Electron + Next.js) - 新視窗
echo [啟動] Frontend (Electron + Next.js)
start "SideBySide Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo ============================================
echo   兩個服務已在獨立視窗中啟動：
echo   - Backend:  http://localhost:8000
echo   - API 文件: http://localhost:8000/docs
echo   - Frontend: http://localhost:3000
echo ============================================
echo.
echo 關閉此視窗不會影響服務運行。
echo 若要停止服務，請關閉對應的 CMD 視窗。
pause
