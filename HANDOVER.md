# 學旅營運處多站點智慧排班與勞基法合規審查系統
## 專案開發工作交接與架構演進報告 (HANDOVER.md)

- **更新日期**：2026-09-11 00:52 (GMT+8)
- **當前核心版本**：`v2.6.0-cloud-production` (雲端全自動化正式版)
- **前端部署網址 (Vercel)**：已連動 GitHub 倉庫，支援手機 PWA / 桌面瀏覽器 24 小時免開電腦在線運作
- **GitHub 儲存庫**：`https://github.com/lintoro/xuelu-shift-frontend.git`
- **後端資料庫**：Google Sheets 7+1+4 資料庫 + Google Apps Script (GAS) 原生 JSON-RPC 2.0 微服務

---

## 📋 今日重大開發進展與更新紀錄總覽

### 1. 登入後全域白屏 (Runtime Error) 追查與徹底修復
- **問題根因定位**：
  1. `swapStore.js`（調班預檢）：當 `scheduleMap` 為空時，存取 `simMap[applicantId][targetDay]` 發生 `Cannot set properties of undefined`。
  2. `holidayTransferStore.js`（國假簽認）：排班矩陣在升級後單日班別為 `{shift_type, station_id, ...}` 物件，該模組直接做 `shift !== 'OFF'` 並將物件回傳為 React Child，引發 `Objects are not valid as a React child` 崩潰。
- **解決方案**：
  - 加固 `swapStore.js` 之防呆物件初始化。
  - 校正 `holidayTransferStore.js` 嚴格取用 `shift.shift_type` 比對與呈現。
  - 在 `src/main.jsx` 外圍加裝全域 **`ErrorBoundary.jsx`（錯誤邊界保護組件）**，阻絕未來任何非預期錯誤導致全頁白屏，並提供深色診斷卡片與一鍵快取清除按鈕。

### 2. 國定假日專案調移同意書與免計雙薪協議 (勞基法 37/39 條閉環)
- **法規依據**：四週變形工時服務業於國定假日出勤，需事前經勞工個別同意並指定調移休假日，出勤日按平日工時給薪，免計雙薪。
- **實作落地**：
  - 新增 `holidayTransferStore.js` 與 `AnnualHolidayTransfer.jsx`。
  - 全年度各月份法定放假天數動態加總平帳（非寫死 120 天，支援專案借還假調移）。
  - 在同仁專屬工作台（`MyDashboard.jsx`）加裝勞基法第 37/39 條電子合意簽認卡片，完成數位簽核與稽核軌跡。

### 3. GitHub 遠端版本庫託管流程
1. 本地初始化與乾淨提交：排除敏感暫存檔案，以 `feat` 規範提交所有核心模組。
2. 綁定遠端倉庫：
   ```bash
   git remote add origin https://github.com/lintoro/xuelu-shift-frontend.git
   git branch -M main
   ```
3. 透過 Windows Git Credential Manager 完成瀏覽器互動授權驗證，成功推送到 GitHub。

### 4. Vercel 雲端現代化託管與 CI/CD 自動化發布
- **配置 SPA 重導向**：新增 `vercel.json`：
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **Vercel 連動流程**：
  1. 使用 GitHub 帳號註冊/登入 Vercel 平台。
  2. 選擇「Hobby」（免費個人方案，無使用期限）。
  3. 選擇「Import Git Repository」➜ 選擇 `lintoro/xuelu-shift-frontend`。
  4. Framework Preset 自動識別為 `Vite`，點擊「Deploy」一鍵上線。
- **CI/CD 自動發布優勢**：
  - 本地程式碼修改後，只需執行 `git push origin main`，Vercel 在 30 秒內自動拉取代碼、完成打包編譯並無縫部署，完全免手動維護。
  - 產出專屬線上 HTTPS 網址，支援手機 Safari/Chrome「加入主畫面」，脫離必須開著個人電腦的限制。

### 5. Google 試算表與前端雙向連動打通
- **問題分析**：先前在試算表修改員工角色（Staff ➜ Manager）或班表，網頁上無反應，原因是前端先前僅依靠 `localStorage` 快取，未在組件掛載時拉取雲端。
- **解決方案**：
  1. 在 `App.jsx` 加入 `useEffect`：進入系統時自動向 Google Apps Script 發送 `schedule.getInitialData`，拉取試算表最新名冊、角色與班表。
  2. 頂部導航列新增 **「🔄 刷新試算表」** 按鈕：隨時一鍵取得試算表最新欄位，無需重新登入。
  3. 排班總表新增主管專屬：
     - **「🚀 啟動智慧排班」**：0.5 秒重新依 7 休 1 與配額求解最佳班表。
     - **「☁️ 儲存至 Google 試算表」**：一鍵將 37 位同仁整月班表整批寫入試算表 `Schedules` 頁籤！
  4. **後端相容性**：GAS `Code.gs` 後端已具備完整 `schedule.saveSchedule` 與欄位讀寫邏輯，**完全無需重複修改或重新部署 Code.gs**。

### 6. 登入彩蛋升級：「動態角色沙盒切換矩陣」
- **原狀缺點**：原本連點 5 次 Logo 出現的測試卡片寫死了少數人員，若門市人員異動無法彈性測試。
- **全新實作**：
  - 升級為 **「動態角色測試沙盒 (Dynamic Role Sandbox)」**。
  - **4 大身分分頁切換**：高管/Admin、站點組長 (Leader)、正職同仁 (Staff)、計時同仁 (PT)。
  - **動態人員選單**：直接連動目前試算表在職名冊（37人），按身分動態過濾並於下拉選單標註站點與 Solo 資格。
  - **屬性卡片即時預覽**：選擇同仁時，卡片即時展示主屬站點、獨立顧站資格與支援清單。
  - **一鍵快速免密模擬登入**：點擊即可切換至該同仁真實視角，驗證權限、報班門戶與個人工作台。

---

## 🛠️ 系統重要檔案清單與職責索引

| 檔案路徑 | 模組說明 |
| :--- | :--- |
| `src/main.jsx` | React 根入口，掛載 `ErrorBoundary` 保護機制 |
| `src/components/ErrorBoundary.jsx` | 全域錯誤攔截器，防止白屏並呈現錯誤堆疊診斷 |
| `src/App.jsx` | 核心狀態容器，管理雲端自動拉取、排班矩陣與身分導航 |
| `src/components/Header.jsx` | 頂部導航，包含雲端同步指示、月份工時切換與手動刷新按鈕 |
| `src/components/Auth/LoginView.jsx` | 登入門戶，含記住工號功能與連點 5 次 Logo 動態沙盒矩陣 |
| `src/components/ScheduleTable.jsx` | 全館出勤大表，內建組別/角色篩選、一鍵智慧排班與雲端儲存 |
| `src/components/Dashboard/MyDashboard.jsx` | 同仁個人工作台，整合國假調移出勤同意簽署 (37/39條) |
| `src/data/holidayTransferStore.js` | 國定假日調移與年度平帳資料核心，支援個別同意檢查 |
| `src/data/swapStore.js` | 調班申請、合規預檢（防呆加固）與不可抹滅雙快照稽核日誌 |
| `src/services/apiService.js` | 雲端 JSON-RPC 網關，統籌 Google Apps Script 雙向讀寫 |
| `src/backend/Code.gs` | Google Apps Script 原生後端（7+1+4 表結構、加鹽雜湊防護、班表儲存） |
| `vercel.json` | Vercel SPA 路由重導向配置檔 |

---

## 🚀 後續交接維護指引

1. **日常程式更新步驟**：
   ```bash
   cd c:\Github\ReactApp\xuelu-shift-frontend
   git add .
   git commit -m "feat: 說明本次更新內容"
   git push origin main
   ```
   *推送後 Vercel 會自動在 30 秒內完成雲端打包發布，手機與電腦重新整理即可看到最新版。*
2. **Google 試算表資料異動**：
   - 任何人在 Google 試算表編輯員工姓名、角色或站點後，只需在線上網頁點擊上方 **「🔄 刷新試算表」** 即可完成同步。
3. **班表產出與發布**：
   - 在「排班總表」點擊 **「🚀 啟動智慧排班」** ➜ 滿意後點擊 **「☁️ 儲存至 Google 試算表」** 即可全量持久化至 Google Sheets 的 `Schedules` 工作表。
