@echo off
chcp 65001 >nul
echo ======================================================
echo    學旅營運處排班系統 - 異地換機雲端進度同步小幫手
echo ======================================================
echo [1/2] 正在從 GitHub 雲端 (main 分支) 拉取最新進度...
git pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [錯誤] 拉取失敗，請確認網路連線或是否有本地未提交的衝突！
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] 正在檢查並自動補齊 npm 依賴套件...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [警告] npm 依賴安裝異常，請手動檢查！
    pause
    exit /b %errorlevel%
)

echo.
echo ======================================================
echo    🎉 恭喜！最新程式碼與套件已全數同步完成！
echo    您可以直接開始在 Antigravity 中開發了。
echo ======================================================
pause
