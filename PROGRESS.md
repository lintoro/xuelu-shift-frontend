# 學旅營運處多站點智慧排班與勞基法合規審查> **專案版本**：V2.4.0 正式完工驗收暨交接封裝版（最新標籤：`v2.4.0-admin-verify-manager-self-declared-done`）  
> **更新日期**：2026-09-10  
> **系統定位**：維持「零主機維護成本（$0 Serverless）」、以 Google Workspace (Google Sheets + GAS) 為資料核心，結合確定性啟發式演算法與 Google Gemini 語意平衡的內部智慧排班與勞基法合規審查系統。
> **完整維運交接說明書**：請參閱專案根目錄之 [`HANDOVER.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/HANDOVER.md)。

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
- [x] **組長視野隔離與組別聚焦 (需求 #007)**：
  - 組長登入時，異常提醒看板 (`AnomalyAlertBanner.jsx`) 自動過濾僅顯示管轄站點事件，避免被其他無關站點洗版；本組若全數合規，呈現專屬綠色「本組排班合規無異常」狀態卡。
  - 排班大表 (`ScheduleTable.jsx`) 增設「站點篩選」下拉選單，組長登入時自動預設聚焦鎖定本組，免去上下翻找。
- [x] **PT 與 STAFF 排班總表面板異常提示隔離 (需求 #009)**：
  - 排班總表面板 (`SCHEDULE`) 嚴格落實角色權限隔離：PT 與一般正職 (Staff) 無調度排班權限，嚴格隱藏異常提醒看板 (`AnomalyAlertBanner`)、演算法引擎除錯卡 (`EngineDebugger`) 與 9 大站點燈號 (`StationStatusOverview`)，僅呈現純淨出勤矩陣大表 (`ScheduleTable`)。
  - 導覽列與調班門戶權限收攏：PT 隱藏調班入口，Staff 呈現「線上調班申請」且鎖定初審/終審審核按鈕，僅 Leader/Manager 可進行初審終審。
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

### 4. 調班核決、個人自調與實勤覆核模組 (Shift Swap & Hours Override) — 100%
- [x] **二階授權核決管線**：站點組長第一階初審（確認本站不缺工） $\rightarrow$ 營運高管第二階終審。
- [x] **個人自調挪休通道 (`SELF_RESCHEDULE`)**：支援同仁單人調整休假日與出勤班別，整合個人 7 休 1 與站點最低防開天窗預檢。
- [x] **工作台個人自調快捷入口 (需求 #010, `MyDashboard.jsx`)**：在個人工作台歡迎卡與日曆頂部增設「🔄 申請個人自調挪休」與「👥 與同事對調班表」一鍵直達按鈕，調班進度清單清晰標示挪休細節。
- [x] **主管實勤工時覆核與法規檢核重構 (需求 #010, `ActualHoursOverride.jsx`)**：
  - 出勤開始與結束時間下拉選單（每 30 分鐘一刻度）。
  - 實際休息時間下拉選單（`0`, `0.5`, `1`, `1.5`, `2` 小時）。
  - **勞基法第 35 條休息累進倍數防呆**：動態計算累積在勤跨度，滿 4h 需 0.5h、滿 8h（跨度 $\ge 8.5$h）需 1.0h、滿 12h（跨度 $\ge 12.5$h）需 1.5h，未達法定累積時數時動態警示。
  - **勞基法第 32 條第 2 項單日工時上限嚴重警告卡**：扣除休息後淨實勤 $> 12$h 或單日加班 $> 4$h 時，獨立紅底警示卡跳出，普通儲存按鈕剛性鎖死。
  - **營運高管現場實況三度確認強制放行機制 (Triple-Confirmation Modal)**：面臨現場突發緊急勤務時，僅限 Manager / Admin 可透過三階安全鎖（1. 違規條款事實核認、2. 法律責任與報表加註宣告、3. 輸入緊急事由並最終授權）強制核定入帳。
  - **加班以計發加班費為法定前提 (需求 #010 語氣修正)**：全面將「自動增加補休」正名為「核定加班 · 依法列加班費核發/依意願換補休」，依《勞基法》第 24 條與第 32-1 條消弭管理語氣爭議。
  - **未來報表違規加註提醒全面連動**：全館 CSV 班表儲存格加註 `[⚠️超時違規]`、尾部輸出高管強制核實專案清單；月底結算名冊顯示紅底標籤 `⚠️ 特准超時`，結算 CSV 新增「法規合規與主管強制核實加註」欄位；個人工作台當日日曆格顯示 `⚠️ 特准實勤 Xh`。
- [x] **未到勤或請假折抵之額度不足檢核與 4 大假別選項 (需求 #011)**：
  - 同仁若欲以「彈性補休」或「法定特休」沖抵短少出勤時數，系統比對存摺可用額度；**若不足以扣抵，立即觸發紅底異常震動卡，儲存按鈕剛性鎖死**。
  - 擴充 4 大請假折抵選項：1. 扣抵彈性補休（全薪）、2. 扣抵法定特休（全薪）、3. 事假/其它（扣全薪）、4. 病假/照顧假（扣半薪）。
  - 月底結算清冊與 CSV 匯出完整連動事假、病假與補休特休沖抵統計。
- [x] **支援部門能否獨立 (Solo) 開關與互調班軟性特例關卡 (需求 #012)**：
  - 人事主檔各支援站點增設「🌟 可獨立 (Solo)」開關，同仁主檔擴充 `solo_stations: string[]`。
  - 換班安全預檢引擎對價關係檢核（A 與 B 互相支援能力、調入站點獨立能力）；若資格不符採**軟性關卡放行（送單不鎖死）**，加註【⚠️ 跨組特例調班】，交由組長初審與高管終審放行。
- [x] **實勤覆核同組限制、嚴禁跳組、嚴禁自我覆核與組長實勤向上覆核 (需求 #013)**：
  - 站點組長 (Leader) 覆核選單**嚴格限定同組基層同仁**（排除跨組、排除本人、排除高管與其他組長）。
  - 利益迴避機制：任何操作者選單排除本人，自動預設合格清單首位同仁，杜絕自我覆核。
  - 組長實勤出勤向上由營運高管 (Manager) 覆核，高管介面提供站點快速篩選器。
  - 調班初審同組檢核：組長僅可初審所轄站點調班單，自身調班單利益迴避由高管向上裁決。
- [x] **最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔機制 (需求 #014)**：
  - 確立最高主管（林慶忠）為最高決策者，同級主管調班向上裁定；最高主管發起調班自動進入【最高主管業務裁定 · 待行政合規備查】（`PENDING_ADMIN_VERIFY`）。
  - 系統管理員 Admin（陳鵬宇）操作按鈕正名為 **`【檢驗合規並備查歸檔】(Verify & Archive)`**，僅做形式法規檢驗，化解「下屬 Staff 審核上司 Manager」之倫理衝突，並落實雙人控制（Dual Control）防弊。
  - 實勤面板開放 Admin 備查最高主管出勤，儲存按鈕切換為 `【檢驗合規並備查歸檔 (Admin Archive)】`。

### 5. 營運後台、月底考勤結算與稽核 (Admin & Settlement) — 100%
- [x] **動態人事主檔與清潔組雙向隔離 (`PersonnelManagement.jsx`)**：
  - 新增/編輯同仁彈窗支援「跨組支援清單 (`supported_stations`)」動態核取方塊。
  - 清潔組特別單位雙向隔離：主屬清潔組者僅能選清潔組（不支援外組）；主屬外組者清潔組全面反灰禁用（禁止外人支援）。
  - 排班引擎底層加入派工互鎖判定。
- [x] **動態班別主檔管理與全系統連動 (需求 #008, `ShiftMasterManagement.jsx`)**：
  - 權限架構明確歸屬 `Manager`（營運處長/店長）直接主導規劃，兼顧商場大檔期與特定活動自訂新班別（如 E 班、F 班）之現場營業調度彈性，IT/Admin 提供基礎維護與預設範本載入。
  - 獨立元件 `ShiftMasterManagement.jsx`，支援班別代碼、名稱、起訖時段、休息時間、淨工時自動計算、8 款色彩徽章選取、勞基法 35 條休息防呆判定（工作跨度滿 6 小時提醒未滿 30 分鐘休息）。
  - 動態班別狀態機與全系統連動（排班大表、調班申請門戶、實勤覆核等均自動載入最新班別選項）。
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
| :---: | :--- | :--- | :--- | :--- | :---: |
| 1 | `v1.0.0-baseline` | 初始穩定基準線 | 專案建置 0 錯誤、異常提醒介面與伺服器就緒 | 通過 |
| 2 | `v1.1.0-progress-completed` | `PROGRESS.md` 未執行工作 | 異常橫幅平滑滾動定位、GAS 7+1 初始化腳本與 `DEPLOY_GUIDE.md` | 通過 |
| 3 | `v1.2.0-issue005-done` | **【需求 #005】** 人事支援清單與清潔組隔離 | 編輯/新增彈窗支援站點多選、清潔組特別單位雙向隔離鎖死、底層派工互鎖 | 通過 |
| 4 | `v1.3.0-issue003-done` | **【需求 #003】** 主管端實勤覆核面板重構 | 打卡起訖選單、休息扣抵、勞基法 35 條防呆、補休/PT工時連動、未來日期鎖定 | 通過 |
| 5 | `v1.4.0-issue001-done` | **【需求 #001】** 線上調班個人挪休自調 | `SELF_RESCHEDULE` 通道、7休1法規預檢、站點缺工提醒、二階終審自動覆寫 | 通過 |
| 6 | `v1.5.0-issue002-done` | **【需求 #002】** 工作台特休/補休存摺明細 | 週年制特休純天數、12/31 補休歸零純時數、雙分頁存摺、覆核差額流水記錄 | 通過 |
| 7 | `v1.6.0-issue004-done` | **【需求 #004】** 考勤月底結算雙確認閉環 | 月底結算面板、全員電子簽認、清冊 CSV 匯出、工作台到班核認卡片 | 通過 |
| 8 | `v1.7.0-issue006-done` | **【需求 #006】** 特休與補休排定功能 (方案 A) | 劃休門戶新增 AL/CT 假別排定與存摺即時扣抵；主管實勤短少支援扣補休/特休時數沖抵 | 通過 |
| 9 | `v1.8.0-issues007-008-done` | **【需求 #007 & #008】** 組長視野隔離 + Manager 動態班別主檔 | 組長異常視野隔離、大表本組自動聚焦、ShiftMasterManagement 班別自訂與全系統連動 | 通過 |
| 10 | `v1.9.0-issue009-done` | **【需求 #009】** PT 與 STAFF 異常提示隔離與調班權限收攏 | 排班總表對 PT/Staff 隱藏異常提醒看板與站點燈號；PT 隱藏調班 Tab，Staff 鎖死審核按鈕 | 通過 |
| 11 | `v2.0.0-hours-override-triple-done` | **【需求 #010】** 勞基法工時核實累進檢驗、高階主管三度確認放行與個人自調挪休強化 | 第 35 條休息累進 (1.5h/1.0h/0.5h)、第 32 條單日工時 12h/加班 4h 獨立警告、Manager 三度確認彈窗、報表違規加註 | 通過 |
| 12 | `v2.0.1-overtime-pay-first-done` | **【需求 #010 語氣修正】** 加班工時依法計發加班費前提正名 | 修正「自動增加補休」之負面觀感，正名為「核定加班 · 依法列加班費核發/依意願換補休」，全系統詞彙合規嚴謹 | 通過 |
| 13 | `v2.1.0-deduction-balance-check-done` | **【需求 #011】** 未到勤或請假折抵額度不足檢驗阻擋 ＋ 4 大假別選項 | 可用額度不足紅底異常卡剛性鎖定儲存按鈕；擴充事假(扣全薪)/病假(扣半薪)/補休/特休4大卡片與月底結算清冊連動 | 通過 |
| 14 | `v2.2.0-swap-soft-guard-solo-switch-done` | **【需求 #012】** 支援部門 Solo 開關 ＋ 互調班軟性特例關卡 | 人事主檔各支援站點 Solo 開關；換班對價雙向檢核，資格不符採軟性放行送單不鎖死，加註特例單據由組長初審高管終審放行 | 通過 |
| 15 | `v2.3.0-review-hierarchy-station-scope-done` | **【需求 #013】** 實勤覆核同組限制、嚴禁跳組、嚴禁自我覆核與組長向上覆核 | 實勤覆核限定同組基層（排除跨組、本人、高管），組長實勤向上由 Manager 覆核並提供站點篩選；調班初審同組檢核與利益迴避 | 通過 |
| 16 | `v2.4.0-admin-verify-manager-self-declared-done` | **【需求 #014】** 最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔 | 最高主管自身調班建立【自主申報 · 待Admin備查】專屬通道；Admin 正名【檢驗合規並備查歸檔】化解倫理衝突落實雙人控制；實勤面板支援最高主管備查 | 通過 |

---

## 五、 專案交接與接續維運指引 (Handover Guide)

本專案已產出完整維運交接手冊，詳情請直接查閱：[`HANDOVER.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/HANDOVER.md)。

### 1. 核心代碼結構地圖
* **前端入口與狀態總控**：[`src/App.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/App.jsx)（動態狀態機、調班終審覆寫、實勤覆核差額連動存摺、班別主檔持久化、月底簽認回呼、最高主管調班與實勤 Admin 備查歸檔）。
* **導覽選單**：[`src/components/Header.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Header.jsx)（整合「月底考勤結算」、「班別主檔管理」Tab 與各角色可見性）。
* **個人工作台與假勤存摺**：
  * 主面板：[`src/components/Dashboard/MyDashboard.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/MyDashboard.jsx)（個人數據卡片、月底定稿二次簽署對帳卡、自調挪休通道入口）。
  * 假勤存摺彈窗：[`src/components/Dashboard/LeavePassbookModal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/LeavePassbookModal.jsx)（特休/補休雙分頁與流水記錄）。
* **排班大表與組別聚焦**：[`src/components/ScheduleTable.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/ScheduleTable.jsx)（站點過濾下拉選單、組長預設自動聚焦本組）。
* **組長異常過濾**：[`src/components/AnomalyAlertBanner.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/AnomalyAlertBanner.jsx)（組長視野隔離、無異常綠色卡片）。
* **班別主檔管理**：[`src/components/Admin/ShiftMasterManagement.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Admin/ShiftMasterManagement.jsx)（Manager 動態新增/編輯/停用班別、工時試算與色彩自訂）。
* **調班二階審查與 Admin 備查**：[`src/components/ShiftSwap/ShiftSwapPortal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/ShiftSwap/ShiftSwapPortal.jsx)（雙人對調、找人代班、個人自調挪休、特例調班軟性放行、組長初審、高管終審、Admin 備查歸檔）。
* **主管實勤覆核面板**：[`src/components/WorkHours/ActualHoursOverride.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/WorkHours/ActualHoursOverride.jsx)（同組基層限制、嚴禁自我覆核、組長向上由 Manager 覆核、4 大假別折抵與額度不足剛性阻擋、Admin 備查最高主管出勤）。
* **考勤月底結算**：[`src/components/MonthlySettlement/MonthlySettlementPanel.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/MonthlySettlement/MonthlySettlementPanel.jsx)（發布確認、全員簽認進度、4 大假別時數統計、CSV 匯出）。
* **人事管理**：[`src/components/Admin/PersonnelManagement.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Admin/PersonnelManagement.jsx)（支援清單多選、支援站點「🌟 可獨立 (Solo)」開關、清潔組雙向隔離）。
* **後端 Google Apps Script**：[`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs)（7+1 核心表初始化腳本、JSON-RPC 處理器、加鹽雜湊密碼驗證）。
* **自動化測試腳本**：`scratch/`（4 大驗證腳本，覆蓋 #011 ~ #014 全部核心情境）。
* **部署與操作手冊**：[`DEPLOY_GUIDE.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/DEPLOY_GUIDE.md) 與 [`HANDOVER.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/HANDOVER.md)。

---

### 2. 測試與建置指令
```powershell
# 執行 4 大自動化單元測試腳本 (全數通過)
node scratch/test_manager_self_declared_and_admin_verification.mjs
node scratch/test_review_hierarchy_and_station_scope.mjs
node scratch/test_swap_soft_guard_and_solo_switch.mjs
node scratch/test_deduction_balance_check.mjs

# 生產環境打包驗證 (確保 0 錯誤)
npm run build
```

---

### 3. 緊急回滾機制 (Rollback Runbook)
若接手維運後進行了新修改但發生異常，可執行以下指令瞬間無損回推至目前定稿穩定版本：
```bash
# 查看所有已建立的穩定版本標籤
git tag -l

# 一鍵回退至當前 V2.4.0 完工定稿版本
git checkout v2.4.0-admin-verify-manager-self-declared-done
```
�則（清潔組代碼 `ST_CLEAN` 隔離防呆）」。
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
| 9 | `v1.8.0-issues007-008-done` | **【需求 #007 & #008】** 組長視野隔離 + Manager 動態班別主檔 | 組長異常視野隔離、大表本組自動聚焦、ShiftMasterManagement 班別自訂與全系統連動 | 通過 |
| 10 | `v1.9.0-issue009-done` | **【需求 #009】** PT 與 STAFF 異常提示隔離與調班權限收攏 | 排班總表對 PT/Staff 隱藏異常提醒看板與站點燈號；PT 隱藏調班 Tab，Staff 鎖死審核按鈕 | 通過 |

---

## 五、 專案交接與接續維運指引 (Handover Guide)

後續接手人員或主管接續維運時，請遵循下列指引：

### 1. 核心代碼結構地圖
* **前端入口與狀態總控**：[`src/App.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/App.jsx)（動態狀態機、調班終審覆寫、實勤覆核差額連動存摺、班別主檔持久化、月底簽認回呼）。
* **導覽選單**：[`src/components/Header.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Header.jsx)（整合「月底考勤結算」、「班別主檔管理」Tab 與各角色可見性）。
* **個人工作台與假勤存摺**：
  * 主面板：[`src/components/Dashboard/MyDashboard.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/MyDashboard.jsx)（個人數據卡片、月底定稿二次簽署對帳卡）。
  * 假勤存摺彈窗：[`src/components/Dashboard/LeavePassbookModal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Dashboard/LeavePassbookModal.jsx)（特休/補休雙分頁與流水記錄）。
* **排班大表與組別聚焦**：[`src/components/ScheduleTable.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/ScheduleTable.jsx)（站點過濾下拉選單、組長預設自動聚焦本組）。
* **組長異常過濾**：[`src/components/AnomalyAlertBanner.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/AnomalyAlertBanner.jsx)（組長視野隔離、無異常綠色卡片）。
* **班別主檔管理**：[`src/components/Admin/ShiftMasterManagement.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/Admin/ShiftMasterManagement.jsx)（Manager 動態新增/編輯/停用班別、工時試算與色彩自訂）。
* **調班二階審查**：[`src/components/ShiftSwap/ShiftSwapPortal.jsx`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/components/ShiftSwap/ShiftSwapPortal.jsx)（雙人對調、找人代班、個人自調挪休、動態班別支援）。
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
