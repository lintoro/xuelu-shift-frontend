# 專案 Agent 行為與資安守則 (Project Rules & Security Principles)

## 核心資安守則 (Strict Security Policy)
1. **機密檔案零追蹤**：`.env`, `.env.*`, `*.pem`, `*.key` 等敏感設定檔嚴禁納入 Git 追蹤。
2. **Git Commit 防護**：執行任何版控提交前，必須檢查 `git ls-files` 確保無任何敏感檔案被誤加。
3. **無硬編碼金鑰**：程式碼中嚴禁硬編碼任何密碼、私鑰或未授權資產。
4. **語言規範**：所有說明與產出必須遵守「繁體中文（台灣）」語言原則。
