# 專案 Agent 行為與資安守則 (Project Rules & Security Principles)

## 核心資安守則 (Strict Security Policy)
1. **機密檔案零追蹤**：`.env`, `.env.*`, `*.pem`, `*.key` 等敏感設定檔嚴禁納入 Git 追蹤。
2. **Git Commit 防護**：執行任何版控提交前，必須檢查 `git ls-files` 確保無任何敏感檔案被誤加。
3. **無硬編碼金鑰**：程式碼中嚴禁硬編碼任何密碼、私鑰或未授權資產。
4. **語言規範**：所有說明與產出必須遵守「繁體中文（台灣）」語言原則。

## 版控與發布節奏守則 (Git Push & Deployment Timing)
- **平時不頻繁推送**：單項功能完成或局部調校時，地端作業即可，不需要每次都推送到遠端。
- **限定推送與打包發布時機**：
  1. **交接或下線時**：當階段性任務完成、準備進行交接手冊撰寫或準備離線時，統一執行資安檢查、Commit 與 `git push origin main`。
  2. **使用者明確下達發布/部署指令時**：依您的指示立即執行推送與發布。

---

## ⚡ 核心踩坑教訓與架構防錯守則 (Critical Lessons Learned & Error Prevention)

本專案在實作 Google Sheets 雲端資料庫、Google Apps Script (GAS) 微服務與 React 前端連動時，經歷以下重大坑點，所有 Agent 與維護人員**必須嚴格遵守**下列防錯鐵律：

### 1. 人事真實性與高管排班呈現鐵律 (Personnel Identity & Rendering SSOT)
- **鐵律**：**嚴禁為了配合排班演算法或前端顯示，而隨意篡改同仁的真實職稱或降低其職等！**
- **背景事實**：營運處核心主管（陳鵬宇、白慧真、張舒扉、劉宗哲、林錦達、戴晉弘等）在組織架構中確實為營運高階主管（`Manager` / `is_self_scheduled: true`），其職稱必須忠實反映。
- **渲染邏輯真相**：
  - 前端 `ScheduleTable.jsx` 邏輯為：`if (isEmpManager && !effectiveCode) label = '留白'`。
  - 高管之所以呈現「留白」，是因為「資料庫查無班別（空值）」所致。
  - **只要資料庫內存有班別（A/B/C/D/例/休/國），前端就會 100% 正常渲染出色塊膠囊！**
  - **行動方針**：遇到高管留白，應排查資料庫是否有寫入成功與 API 查詢邏輯，**絕對不可降轉主管為基層 Staff**。

### 2. Google Sheets 日期型別陷阱與年月正規化 (Date Object Pitfall)
- **陷阱**：Google Sheets 會自動將 `2026-09` 這類「YYYY-MM」字串識別並強制轉換為 JavaScript `Date` 物件（如 `Wed Sep 01 2026 ...`）。
- **後果**：GAS 後端以 `row[1] === ym` 比對時必定回傳 `false`，導致：
  1. 讀取班表時明明資料庫有資料，卻回傳空物件 `{}`。
  2. 刪除與覆寫時無法命中舊資料，造成資料越疊越多或無法清理。
- **防錯規範**：
  - 後端 `Code.gs` **必須在全域範疇 (Global Scope)** 定義 `normalizeYm(val)` 函式。
  - 嚴禁將 `normalizeYm` 宣告在單一函式局部內部，避免其他 API 調用時噴出 `ReferenceError`。
  - 凡涉及 `year_month` 比對，一律強制使用：
    ```javascript
    function normalizeYm(val) {
      if (!val) return '';
      if (val instanceof Date) return Utilities.formatDate(val, 'GMT+8', 'yyyy-MM');
      var s = String(val).trim();
      return s.length >= 7 ? s.slice(0, 7) : s;
    }
    // 比對時：
    if (normalizeYm(row[col]) === ym) { ... }
    ```

### 3. 多列覆寫與批次讀取防抹除機制 (ScheduleMap Aggregation Safety)
- **陷阱**：`Schedules` 試算表若因歷史重試產生多筆同工號資料，若讀取迴圈直接寫 `scheduleMap[empId] = {}`，後方的空列會直接覆蓋並清空前方已有有效排班的資料。
- **防錯規範**：
  - 讀取組裝時必須使用防覆蓋邏輯：
    ```javascript
    if (!scheduleMap[empId]) scheduleMap[empId] = {};
    if (shift !== undefined && shift !== null && String(shift).trim() !== '') {
      scheduleMap[empId][d] = String(shift).trim();
    }
    ```
  - 僅非空班別才寫入，確保有效資料不被空列意外沖銷。

### 4. 本地快取覆寫 (LocalStorage Overrides) 與雲端班表優先級
- **陷阱**：前端 `App.jsx` 的 `effectiveScheduleMap` 會將 `scheduleOverrides[currentMonth]` 疊加在基礎班表之上。若使用者曾在本機點擊過「自填本人班表（A班）」，LocalStorage 快取會強制覆蓋雲端發布的真實班表，導致陳鵬宇全月顯示為整片 A 班。
- **防錯規範**：
  - 畫面異常時，務必檢查 LocalStorage 之 `xuelu_schedule_overrides_v1` 快取。
  - 當拉取到雲端正式發布的班表時，應優先保證雲端真實數據權威（SSOT），提供使用者清除覆寫快取的機制。

### 5. Google Apps Script Web App 通訊協定 (CORS & 302 Redirect)
- **陷阱**：Node 或前端直接 POST `application/json` 至 Google Apps Script 時，常因 Google 跨域 302 重新導向至 `script.googleusercontent.com` 失敗，而回傳 HTML 錯誤頁面（「很抱歉，目前無法開啟這個檔案」）。
- **防錯規範**：
  - 跨網域呼叫 GAS Web App 必須使用：
    ```javascript
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    redirect: 'follow',
    body: JSON.stringify({ jsonrpc: '2.0', method: '...', params: { ... } })
    ```
  - 依 Google 官方規範，使用 `application/x-www-form-urlencoded` 能 100% 保證順利觸發 `doPost(e)` 並正確取得 JSON-RPC 回應。

### 6. Clasp 部署前語法完整性驗證 (Pre-deploy AST Check)
- **鐵律**：修改 `src/backend/Code.gs` 後，**嚴禁直接發布未經驗證的程式碼**。
- **防錯規範**：
  - 每次執行 `npm run gas:deploy` 前，必須先執行地端 AST 語法檢驗（例如以 `@babel/parser` 解析），確保所有花括號 `{}` 成對閉合、無語法中斷錯誤後，方可執行部署。

### 7. Google Apps Script 雲端發布全自動執行鐵律 (Zero-Manual GAS Deployment)
- **鐵律**：凡修改 `src/backend/Code.gs` 或後端邏輯，**AI 必須自主執行 `npm run gas:deploy` 一鍵完成「代碼推送 + 部署版本更新」**。
- **嚴禁行為**：**絕對禁止指示使用者打開網頁瀏覽器手動複製貼上程式碼或手動點擊部署版本！**
- **自動化流水線機制**：專案已綁定 `clasp push && clasp deploy -i AKfycby9XuPnF1F3U3Sb0ZUlLgjjj1z0waj4CGjyQSFBM0FZTWFEIZdgpWil1AhV6r0icbzJ -d "IDE一鍵發布"`，必須由 AI 全程自動發布並自動進行四段 API 驗證。
