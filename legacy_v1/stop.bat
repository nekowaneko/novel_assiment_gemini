@echo off
chcp 65001 > nul
echo ====================================
echo   AI 寫作伴侶 - 停止服務
echo ====================================
echo.

:: 結束 Node.js 程序 (前端)
echo [1/2] 停止前端服務...
taskkill /f /im node.exe 2>nul
if %errorlevel%==0 (
    echo       前端已停止
) else (
    echo       前端未運行
)

:: 結束 Python 程序 (後端)
echo [2/2] 停止後端服務...
taskkill /f /im python.exe 2>nul
if %errorlevel%==0 (
    echo       後端已停止
) else (
    echo       後端未運行
)

echo.
echo ====================================
echo   所有服務已停止
echo ====================================
echo.
pause
