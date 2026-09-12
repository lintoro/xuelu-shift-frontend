# 專案最高規格資安與敏感資料保護規範 (Strict Security Policy)

## 1. 環境變數與機密檔案零漏洩 (Zero Leakage Rule)
- 嚴禁將任何包含敏感認證、私鑰、密碼或環境變數的檔案（如 `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json` 等）納入 Git 版控。
- 每次新增環境變數或設定檔前，必須強制先確認 `.gitignore` 包含該檔案規格。
- 絕不可以 `git add -f` 強制追蹤經忽略之敏感檔案。

## 2. 程式碼硬編碼金鑰掃描防護 (Hardcoded Secret Protection)
- 嚴禁在 Javascript / React 原始碼中硬編碼寫死資料庫密碼、Token、私鑰或敏感認證。
- 若程式碼中必須存取第三方 API 介面，僅能使用 `import.meta.env.VITE_*` 或環境變數抽象層傳入，且需檢驗前端暴露出網址之風險。

## 3. Git Commit 前強制資安檢核 (Pre-Commit Security Verification)
- 在執行 `git commit` 前，必須自動核對 `git status` 與 `git ls-files`，確認無任何隱密設定檔或 `.env` 被加入 stage 索引中。

## 4. 繁體中文（台灣）權限與隱私溝通
- 任何潛在資安疑慮（如發現舊 commit 含有歷史金鑰或未說明之連線網址），必須主動於繁體中文說明中向使用者提請確認與警示。
