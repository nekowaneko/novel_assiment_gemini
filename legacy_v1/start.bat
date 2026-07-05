@echo off
chcp 65001 > nul
echo ====================================
echo   AI 寫作伴侶 - 啟動中...
echo ====================================
echo.

:: 取得腳本所在目錄
cd /d "%~dp0"

:: 開啟瀏覽器 (5秒後)
echo 5秒後開啟瀏覽器...
start "" cmd /c "timeout /t 5 /nobreak > nul && start http://localhost:3000"

:: 啟動前後端服務
echo 啟動前後端服務...
npm run dev
