# Google Apps Script (GAS) 雲端全自動部署守則 (Zero-Manual Deployment)

## 核心原則
每當進行任何會影響 Google Apps Script 後端或試算表資料結構的變更時，**AI 必須自主執行 `npm run gas:deploy` 一鍵完成推送與版本發布，嚴禁指示使用者手動操作**。

## 具體發布與驗證流程：
1. **修改了 `src/backend/Code.gs`**：
   - 先執行 AST 語法檢查確保無語法中斷。
   - 執行 `npm run gas:deploy`（自動完成 `clasp push` 並以指定 Deployment ID 發布新版本）。
   - 自動發送四段 API 測試（Ping、正確 Token、無 Token、錯誤 Token）驗證部署生效。
2. **調整了試算表資料庫架構 (Sheet Columns / Schema)**：
   - 包含 13 張資料表新增欄位、修改工作表名稱、調整初始資料等。
   - 由 AI 透過 API 呼叫初始化端點或全量同步（`admin.syncAll`）更新試算表。
3. **前端 `ApiService.js` API 請求合約異動**：
   - 確認前端 `api_token` 與 GAS 腳本屬性 `APP_SHARED_SECRET` 保持一致。

