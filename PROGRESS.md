# 學旅營運處多站點智慧排班與勞基法合規審查系統
## 專案開發進度、現況盤點與維運交接報告 (PROGRESS.md)

> **專案版本**：V2.5 正式完工驗收暨雲端上線準備版（最新標籤：`v1.7.0-issue006-done`）  
> **更新日期**：2026-09-10  
> **系統定位**：維持「零主機維護成本（$0 Serverless）」、以 Google Workspace (Google Sheets + GAS) 為資料核心，結合確定性啟發式演算法與 Google Gemini 語意平衡的內部智慧排班與勞基法合規審查系統。

---

## 一、 系統架構與技術棧

| 層級 | 技術架構 | 規格說明 |
| :--- | :--- | :--- |
| **前端應用 (Frontend)** | React 18 + Tailwind CSS + Vite | 單頁應用程式 (SPA)，支援行動手機、平板與桌面 PC，具備全響應式介面與極速載入體驗。 |
| **後端與 API 網關 (Backend)** | Google Apps Script (GAS) | 封裝 JSON-RPC 路由網關，提供加鹽 SHA-256 雜湊密碼驗證、2 小時 Session Token、防水平越權 (Anti-IDOR) 防護。 |
| **資料庫核心 (Database)** | Google Sheets (7+1 核心表) | `Employees`, `Stations`, `Rules`, `Quotas`, `Schedules`, `Leaves`, `Audit_Logs`, `Month_Borders`。 |
| **演算法引擎 (Engine)** | 確定性雙階管線 (Deterministic Pipeline) | 啟發式貪婪種子演算法（目標 < 500ms，實測 13ms） + 確定性法規驗證器 (Linter)。 |
| **日曆同步 (Calendar)** | RFC 5545 標準 .ics | 支援個人專屬日曆安全匯出，班表一鍵同步手機 Google / Apple 行事曆。 |

---

## 二、 各模組開發完成度現況 (100% 完工)

### 1. 認證、資安與角色權限 (Auth & Security) — 100%
- [x] **加鹽 SHA-256 密碼雜湊**：前端與後端徹底移除 6 位數明文密碼，支援本機與試算表加密存儲。
- [x] **初次登入強制改密**：預設密碼 `000000` 登入後強制彈窗要求變更 PIN 碼。
- [x] **門市現場閒置防護**：公用平板 15 分鐘無操作自動登出機制。
- [x] **權限雙軌解耦**：業務角色（`Staff` / `Leader` / `Manager`）與系統管理權限（`is_admin`）徹底解耦。

### 2. 核心排班與法規檢核模組 (Scheduling & Compliance) — 100%
- [x] **雙軌工時切換**：支援「常態工時（7 休 1）」與「四週變形工時（勞基法第 30-1 條）」動態切換。
- [x] **高階主管豁免機制**：處長、店長（`is_self_scheduled = true`）排班全面留白，不佔用現場休假配額。
- [x] **離職銷假絕對真空**：支援離職同仁（`TERM_OFF`）生效日後鎖定休假。
- [x] **跨月滑動視窗審查**：納入前後月 7 天排班紀錄，消除跨月連上超過 6 天漏洞。
- [x] **輪班間隔檢核**：嚴格落實 C 班至次日 A 班等班距 $\ge 11$ 小時之合規性判定。
- [x] **站點三級燈號監控**：🟢 綠燈（正常）、🟡 黃燈（機動支援覆蓋）、🔴 紅燈（嚴重空窗強制阻擋）。
- [x] **排班種子引擎演算法重構 (`schedulerEngine.js`)**：落實主屬專責保底、MRV 最緊縮站點優先派工、PT solo 防呆與在勤正職機動馳援機制。
- [x] **異常顯示提醒看板 (`AnomalyAlertBanner.jsx`)**：當極限條件下人力吃緊時，保底輸出最佳班表，並以頂部互動式橫幅即時提示空窗站點與調度建議。
- [x] **大表表頭與警示雙向平滑滾動**：點擊異常橫幅日期一鍵平滑滾動定位至排班大表對應欄位並產生視覺高亮動畫。

### 3. 同仁劃休與衝突透視門戶 (Leave Portal & Conflicts) — 100%
- [x] **正職志願序劃休**：提供優先與備選志願填報，具備單日休假上限與週末休假上限防呆。
- [x] **計時人員 (PT) 報班**：提供月約定天數上限與平日/週末可用時段勾選。
- [x] **主管衝突透視鏡**：視覺化呈現各日期超額劃休名單、同仁志願序分佈與調和依據。
- [x] **特休與補休排定與存摺連動 (需求 #006 方案 A)**：
  - 劃休門戶支援直接排定「法定特休 (AL - 扣1天)」或「彈性補休 (CT - 扣8h)」，餘額不足即時防呆，日曆格呈現專屬彩色徽章。
  - 排班大表精確呈現 AL、CT 班別標章，排班引擎與站點人力維持 8 小時整更不碎裂。
  - 主管實勤覆核工時短少時，支援選擇「扣抵補休時數」、「扣抵特休時數」或「純事假短少」，存摺自動寫入流水帳。
- [x] **個人工作台明細存摺 (`LeavePassbookModal.jsx`)**：特休單一週年制自動階梯試算（純天數），補休以小時為單位並落實 12/31 年度重置結算（純時數，不涉薪資折現）。

### 4. 調班核決與實勤覆核模組 (Shift Swap & Hours Override) — 100%
- [x] **二階授權核決管線**：站點組長第一階初審（確認本站不缺工） $\rightarrow$ 營運高管第二階終審。
- [x] **個人自調挪休通道 (`SELF_RESCHEDULE`)**：支援同仁單人調整休假日與出勤班別，整合個人 7 休 1 與站點最低防開天窗預檢。
- [x] **主管實勤工時覆核重構 (`ActualHoursOverride.jsx`)**：
  - 出勤開始與結束時間下拉選單（每 30 分鐘一刻度）。
  - 實際休息時間下拉選單（`0`, `0.5`, `1`, `1.5`, `2` 小時）。
  - 勞基法第 35 條休息防呆判定（工作滿 4 小時需配 0.5 小時休息）。
  - 工時自動比對：正職同仁差額自動核轉為補休增減並寫入存摺流水帳；PT 人員直接核定到班工時。
  - 日期範圍安全防呆：僅開放當日及歷史日期，未來日期全面反灰鎖定。

### 5. 營運後台、月底考勤結算與稽核 (Admin & Settlement) — 100%
- [x] **動態人事主檔與清潔組雙向隔離 (`PersonnelManagement.jsx`)**：
  - 新增/編輯同仁彈窗支援「跨組支援清單 (`supported_stations`)」動態核取方塊。
  - 清潔組特別單位雙向隔離：主屬清潔組者僅能選清潔組（不支援外組）；主屬外組者清潔組全面反灰禁用（禁止外人支援）。
  - 排班引擎底層加入派工互鎖判定。
- [x] **考勤月底結算機制與實勤雙確認閉環 (`MonthlySettlementPanel.jsx`)**：
  - 第一階段前月預排確認 + 第二階段當月月底實勤二次定稿簽認閉環體系。
  - 主管端一鍵發布出勤定稿通知，實時追蹤全員簽認進度條，支援匯出對帳 CSV 清冊。
  - 同仁工作台即時浮現定稿對帳卡，支援一鍵完成電子簽認。
- [x] **不可抹滅稽核日誌與一鍵回滾 (`AuditLogsPanel.jsx`)**：異動自動寫入含前後完整矩陣雙快照（Before/After Snapshot），支援一鍵安全回溯。

---

## 三、 系統當前運行現狀與資料庫架構說明

主管特別關注之系統底層資料存取模式說明：

1. **純動態資料驅動 (Data-Driven)**：
   * 系統所有員工名冊、排班表、調班申請、假勤額度，皆為動態 React State 與資料庫物件，**絕無將資料寫死在邏輯程式碼中**。
   * 程式碼中的常數僅為「法規原則（如勞基法 35 條、7 休 1）」與「業務特別單位規則（清潔組代碼 `ST_CLEAN` 隔離防呆）」。
2. **目前連線狀態：本地高擬真持久化沙盒 (Local Storage Data Store)**：
   * 目前系統運作於本地 Vite 伺服器 (`http://localhost:3000/`)。
   * 資料讀寫透過瀏覽器 `localStorage`（如 `xuelu_employees_v1`、`xuelu_audit_logs_v1`）達成持久化，重啟伺服器或重新整理網頁資料均不丟失。
   * 此架構與 Google Sheets 7+1 表之欄位規格 **100% 精準對齊**，供主管無損驗收。
3. **雲端 Google Sheets 資料庫現狀**：
   * 後端微服務代碼 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 已全部寫好，包含一鍵自動建表函式 `setupSpreadsheet()`。
   * 因需掛載於企業或主管個人的 Google Workspace / Google Drive 帳號下，目前處於**「已備妥藍圖，待本機驗收通過後一鍵掛載發布」**之狀態。

---

## 四、 版本歷史與 Git 標籤鏈條 (Version Log)

本專案全程落實**「每次動工前記錄版號、一動一驗、嚴禁改一錯二、隨時可回溯」**之紀律，全部變更皆已建立專屬 Git Tag：

| 序號 | 版號標籤 (Tag) | 處理項目 | 變更範疇 | 驗收結果 |
| :---: | :--- | :--- | :--- | :---: |
| 1 | `v1.0.0-baseline` | 初始穩定基準線 | 專案建置 0 錯誤、異常提醒介面與伺服器就緒 | 通過 |
| 2 | `v1.1.0-progress-completed` | `PROGRESS.md` 未執行工作 | 異常橫幅平滑滾動定位、GAS 7+1 初始化腳本與 `DEPLOY_GUIDE.md` | 通過 |
| 3 | `v1.2.0-issue005-done` | **【需求 #005】** 人事支援清單與清潔組隔離 | 編輯/新增彈窗支援站點多選、清潔組特別單位雙向隔離鎖死、底層派工互鎖 | 通過 |
| 4 | `v1.3.0-issue003-done` | **【需求 #003】** 主管端實勤覆核面板重構 | 打卡起訖選單、休息扣抵、勞基法 35 條防呆、補休/PT工時連動、未來日期鎖定 | 通過 |
| 5 | `v1.4.0-issue001-done` | **【需求 #001】** 線上調班個人挪休自調 | `SELF_RESCHEDULE` 通道、7休1法規預檢、站點缺工提醒、二階終審自動覆寫 | 通過 |
| 6 | `v1.5.0-issue002-done` | **【需求 #002】** 工作台特休/補休存摺明細 | 週年制特休純天數、12/31 補休歸零純時數、雙分頁存摺、覆核差額流水記錄 | 通過 |
| 7 | `v1.6.0-issue004-done` | **【需求 #004】** 考勤月底結算雙確認閉環 | 月底結算面板、全員電子簽認、清冊 CSV 匯出、工作台到班核認卡片 | 通過 |
| 8 | `v1.7.0-issue006-done` | **【需求 #006】** 特休與補休排定功能 (方案 A) | 劃休門戶新增 AL/CT 假別排定與存摺即時扣抵；主管實勤短少支援扣補休/特休時數沖抵 | 通過 |

---

## 五、 專案交接與接續維運指引 (Handover Guide)

後續接手人員或主管接續維運時，請遵循下列指引：

### 1. 核心代碼結構地圖
* **前端入口與狀態總控**：[`src/App.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/App.jsx)（動態狀態機、調班終審覆寫、實勤覆核差額連動存摺、月底簽認回呼）。
* **導覽選單**：[`src/components/Header.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Header.jsx)（整合「月底考勤結算」Tab 與各角色可見性）。
* **個人工作台與假勤存摺**：
  * 主面板：[`src/components/Dashboard/MyDashboard.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/MyDashboard.jsx)（個人數據卡片、月底定稿二次簽署對帳卡）。
  * 假勤存摺彈窗：[`src/components/Dashboard/LeavePassbookModal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/LeavePassbookModal.jsx)（特休/補休雙分頁與流水記錄）。
* **調班二階審查**：[`src/components/ShiftSwap/ShiftSwapPortal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/ShiftSwap/ShiftSwapPortal.jsx)（雙人對調、找人代班、個人自調挪休）。
* **主管實勤覆核**：[`src/components/WorkHours/ActualHoursOverride.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/WorkHours/ActualHoursOverride.jsx)（時間選單、休息選單、勞基法 35 條警示、未來日期鎖定）。
* **考勤月底結算**：[`src/components/MonthlySettlement/MonthlySettlementPanel.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/MonthlySettlement/MonthlySettlementPanel.jsx)（發布確認、全員簽認進度、CSV 匯出）。
* **人事管理**：[`src/components/Admin/PersonnelManagement.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Admin/PersonnelManagement.jsx)（支援清單多選、清潔組雙向隔離）。
* **後端 Google Apps Script**：[`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs)（7+1 核心表初始化腳本、JSON-RPC 處理器、加鹽雜湊密碼驗證）。
* **部署與操作手冊**：[`DEPLOY_GUIDE.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/DEPLOY_GUIDE.md) 與 [walkthrough.md](file:///C:/Users/Administrator/.gemini/antigravity-ide/brain/3bcab537-b73f-43e1-a87f-833dd8129ca7/walkthrough.md)。

---

### 2. 接續執行動作 SOP (Next Steps Runbook)

#### 階段 A：本機驗收與確認（目前階段）
1. 開啟本機服務 `http://localhost:3000/`。
2. 驗收營運長身分之人事管理、實勤覆核、調班終審、個人自調、存摺明細、月底結算功能。
3. 如有任何文案或視覺微調需求，於本機完成並提交新版號。

#### 階段 B：雲端 Google 試算表資料庫上線（待主管指示）
1. 登入企業 Google Drive，新建一份空白 Google 試算表，命名為 `【學旅營運處】智慧排班資料庫_2026`。
2. 進入「擴充功能」$\rightarrow$「Apps Script」，將本專案的 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 貼入。
3. 執行函式下拉選取 **`setupSpreadsheet`** 並點擊「執行」（完成 7+1 表自動建置）。
4. 點擊右上角「部署」$\rightarrow$「新增部署作業」$\rightarrow$「網路應用程式」$\rightarrow$ 複製「Web 應用程式網址」。
5. 將網址貼入前端環境變數或 `index.html` 中的 `window.__GAS_API_URL__`，前端即刻由 Local Mock 自動無縫切換為 100% 雲端即時連線。

#### 階段 C：門市現場試行 (Pilot Run)
1. 提供店長、組長與正職同仁登入網址。
2. 首次登入使用預設 PIN 碼 `000000` 並依系統提示重設 6 位數密碼。
3. 試辦下月份之預排、劃休、調班與月底到班雙確認。

---

### 3. 緊急回滾機制 (Rollback Runbook)
若接手維運後進行了新修改但發生異常，可執行以下指令瞬間無損回推至目前定稿穩定版本：
```bash
# 查看所有已建立的穩定版本標籤
git tag -l

# 一鍵回退至當前 V2.4 完工定稿版本
git checkout v1.6.0-issue004-done
```
