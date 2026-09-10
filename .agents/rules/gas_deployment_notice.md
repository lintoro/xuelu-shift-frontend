# Google Apps Script (GAS) 雲端部署同步與變更提醒守則

## 核心觸發情境
每當進行任何會影響 Google Apps Script 後端或試算表資料結構的變更時，**必須主動且明確地在回應中提醒使用者需要手動同步至 GAS 雲端**。

## 具體提醒時機：
1. **修改了 `src/backend/Code.gs`**：
   - 包含新增/修改 API Action、修改資料表讀寫邏輯、新增計算演算法等。
   - 提醒事項：需複製更新後的 `Code.gs` 至 Google Apps Script 編輯器，並至「部署 $\rightarrow$ 管理部署作業」建立「新版本」發布。
2. **調整了試算表資料庫架構 (Sheet Columns / Schema)**：
   - 包含 13 張資料表新增欄位、修改工作表名稱、調整初始資料等。
   - 提醒事項：需提醒使用者在 GAS 執行特定的初始化或遷移函式（如 `setupSpreadsheet`）以補齊欄位。
3. **前端 `ApiService.js` API 請求合約異動**：
   - 若新增了前端與後端通訊的 Action 或 Payload 結構，需提醒前後端版號一致性。
