# 學旅營運處多站點智慧排班與考勤審查系統
# 開發維運交接說明書 (HANDOVER.md)

> **交接日期**：2026-09-10  
> **當前系統版本**：`v2.4.0-admin-verify-manager-self-declared-done`  
> **當前 Git 提交**：[`26fc0eb`](file:///c:/Github/ReactApp/xuelu-shift-frontend/.git)  
> **開發狀態**：✅ **功能全數完成、自動化測試 100% 通過、生產環境建置 0 錯誤、工作目錄乾淨無未提交檔案**

---

## 一、 專案概述與系統定位

本系統為專門針對「學旅營運處 9 大實體門市站點（服務台、營運處、極限組、MSS、本鋪、小鋪、清潔、餐飲、Gagoo）」打造之智慧排班、法規審查、調班二階審核、實勤工時微調覆核與月底考勤結算平台。

- **架構特點**：堅持「$0 Serverless 零伺服器主機成本」架構，以 React 18 SPA 為前端，以 Google Sheets (7+1 核心表) 與 Google Apps Script (GAS) 為無伺服器後端資料核心。
- **排班核心**：確定性啟發式貪婪演算法（目標 < 500ms，實測 13ms），融合勞動基準法常態工時（7 休 1）與四週變形工時雙軌規範。
- **權限設計**：業務角色（`Manager` / `Leader` / `Staff` / `PT`）與系統管理權限（`is_admin`）雙軌徹底解耦。

---

## 二、 近期重大關鍵人事風控功能交接 (需求 #011 ~ #014)

近期由營運主管深度指導並全數落地之 4 大核心內控風控機制：

### 1. 【需求 #011】未到勤與請假折抵額度檢核阻擋 ＋ 4 大假別選項
- **假勤存摺額度即時檢驗**：同仁若欲以「彈性補休」或「法定特休」沖抵短少出勤時數，系統比對存摺可用額度；**若不足以扣抵，立即觸發紅底異常震動卡，儲存按鈕剛性鎖死**，嚴防存摺透支為負數。
- **4 大請假折抵選項（明確計薪影響）**：
  1. **扣抵彈性補休 (`COMP_TIME`)**：全薪 (不扣薪)，扣減同仁補休存摺時數。
  2. **扣抵法定特休 (`ANNUAL_LEAVE`)**：全薪 (不扣薪)，折合特休天數沖抵存摺。
  3. **事假 (其它) (`PERSONAL_LEAVE`)**：扣全薪，不扣假勤存摺，依《勞基法》事假期間不給付工資。
  4. **病假 (照顧假) (`SICK_LEAVE`)**：扣半薪，不扣假勤存摺，依《勞工請假規則》折半發薪。
- **月底清冊連動**：月底考勤清冊與 CSV 匯出精確匯總事假時數、病假時數、補休扣抵與特休扣抵。

### 2. 【需求 #012】支援部門能否獨立 (Solo) 開關 ＋ 互調班軟性特例放行機制
- **人事主檔 Solo 專屬開關**：主管在人事主檔中，針對同仁勾選的各支援站點，可獨立設定 **「🌟 可獨立 (Solo)」** 開關，同仁主檔擴充 `solo_stations: string[]`。
- **對價關係軟性關卡（增加調度彈性）**：
  - A 調 B 的班，若雙方缺乏對向支援資格或調入站點缺乏 Solo 資格，系統**不剛性鎖死送單**（送出按鈕維持可用），而是跳出琥珀色特例卡片，單據自動加註【⚠️ 跨組特例調班】。
  - 剛性阻擋僅限法定紅線（《勞基法》第 36 條連續出勤超過 6 天）。
  - 特例單據交由「站點組長初審」與「營運高管終審」裁決放行，並於稽核日誌留下特例調度紀錄。

### 3. 【需求 #013】實勤覆核同組限制、嚴禁跳組、嚴禁自我覆核與組長實勤向上覆核
- **同組限制（不能跳組）**：站點組長 (Leader，如服務台李俐旻) 覆核選單**僅限同組基層人員**，跨組同仁（如餐飲部許雅婷、MSS 林錦達等）100% 排除，嚴防跳組越權。
- **利益迴避（不能自己自我覆核）**：覆核選單一律排除操作者本人，預設帶入第一位合格組員，杜絕球員兼裁判。
- **不可向上覆核**：組長選單排除 Manager 與其他同級 Leader，組長權限嚴格向下。
- **組長實勤出勤向上由 MANAGER 覆核**：營運高管 (Manager，如林慶忠) 覆核名單納入各站點組長 (Leader)，並提供高管站點篩選器。
- **調班初審同組檢核**：組長僅能初審所轄站點調班單，跨組調班單按鈕標記鎖定。

### 4. 【需求 #014】最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔機制
- **確立最高決策者 (General Manager / 店長 / 營運總監)**：掌管全場終審裁決權，同級主管與組長調班統一向上由最高主管裁決，打破同級互審人情包袱。
- **最高主管「自主申報 (Self-Declaration)」專屬通道**：最高主管（林慶忠）申報調班時，單據標註為 `【最高主管業務裁定 · 待行政合規備查】` (`PENDING_ADMIN_VERIFY`)，免除業務初審與同級審核。
- **ADMIN「檢驗合規並備查歸檔 (Verify & Archive)」專屬機制**：
  - 系統管理員 Admin（陳鵬宇）操作按鈕正名為 **`【檢驗合規並備查歸檔】`**，職責限縮於形式法規審查（檢核 7 休 1、額度是否充足），不作業務實質准駁，完美化解「下屬 Staff 審核上司 Manager」之倫理衝突。
  - 即時覆寫排班表，寫入專屬稽核日誌 `SHIFT_SWAP_ADMIN_ARCHIVED`，落實「雙人控制 (Dual Control)」審計防弊。
- **實勤面板 ADMIN 備查最高主管出勤**：Admin 可在實勤覆核面板中選取最高主管林慶忠執行合規歸檔，儲存按鈕切換為 `【檢驗合規並備查歸檔 (Admin Archive)】`。

---

## 三、 系統角色與權限職能矩陣 (RBAC Matrix)

| 角色標籤 | 業務角色 (`role`) | 系統管理權限 (`is_admin`) | 實勤覆核權限 (`HOURS_OVERRIDE`) | 調班初審權限 (`First Review`) | 調班終審與備查權限 (`Final Approve / Archive`) | 排班總表異常看板 (`Anomaly Banner`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **計時同仁 (PT)** | `PT` | `false` | 無（不可進） | 無 | 無 | 隱藏（純排班大表） |
| **正職同仁 (Staff)** | `Staff` | `false` | 無（不可進） | 無 | 無 | 隱藏（純排班大表） |
| **站點組長 (Leader)** | `Leader` | `false` | 限同組基層（排除自己與高管） | 僅限所轄站點單據（排除自身調班） | 無 | 僅看本組異常事件 |
| **營運高管 (Manager)** | `Manager` | `false` | 全站點同仁與各站組長（排除自己） | 全場調班代初審（排除自身調班） | 全場調班終審覆寫（排除自身調班） | 檢視全館異常與燈號 |
| **系統管理員 (Admin)** | `Staff` (雙軌解耦) | `true` | 全站點同仁、組長與最高主管合規歸檔 | 全場調班代初審 | 一般終審 ＋ **最高主管申報備查歸檔 (Verify & Archive)** | 檢視全館異常、除錯卡與燈號 |

---

## 四、 核心原始碼結構對照表

```
xuelu-shift-frontend/
├── src/
│   ├── App.jsx                                  # 根元件：狀態總控、effectiveScheduleMap 合併、handleFinalApprove 與 handleOverrideHours
│   ├── components/
│   │   ├── Admin/
│   │   │   └── PersonnelManagement.jsx          # 人事主檔管理：支援站點勾選與「🌟 可獨立 (Solo)」開關設定
│   │   ├── Auth/
│   │   │   └── LoginView.jsx                    # 雙軌權限登入、快速身分切換卡、PIN 碼驗證與防爆破安全鎖
│   │   ├── Dashboard/
│   │   │   └── MyDashboard.jsx                  # 我的工作台：個人班表、自調挪休通道、個人特休/補休雙存摺明細、月底電子簽認
│   │   ├── MonthlySettlement/
│   │   │   └── MonthlySettlementPanel.jsx       # 月底考勤結算面板：全月工時計算、事假/病假/補休/特休統計清冊與 CSV 匯出
│   │   ├── ShiftSwap/
│   │   │   └── ShiftSwapPortal.jsx              # 線上調班門戶：雙人對調/自調挪休、特例調班琥珀色提示、二階審核與 Admin 備查歸檔
│   │   └── WorkHours/
│   │       └── ActualHoursOverride.jsx          # 實勤微調覆核面板：同組限制、利益迴避、勞基法 32/35 條檢驗、4 大請假選項與 Admin 備查
│   ├── data/
│   │   ├── mockMasterData.js                    # 門市主檔：9 大站點定義、同仁名冊、solo_stations 與 canEmployeeSoloAtStation 函式
│   │   ├── leaveStore.js                        # 假勤與存摺存儲：特休/補休餘額與流水帳紀錄
│   │   └── swapStore.js                         # 換班安全引擎：precheckSwapCompliance 雙向支援與 Solo 對價檢驗
│   └── engine/
│       ├── schedulerEngine.js                   # 確定性啟發式排班種子演算法
│       └── complianceValidator.js               # 勞動基準法規驗證器 (Linter)
├── scratch/                                     # 自動化單元測試腳本庫
│   ├── test_manager_self_declared_and_admin_verification.mjs # 需求 #014 測試 (最高主管自主申報與 Admin 備查歸檔)
│   ├── test_review_hierarchy_and_station_scope.mjs           # 需求 #013 測試 (同組限制、利益迴避與向上覆核)
│   ├── test_swap_soft_guard_and_solo_switch.mjs              # 需求 #012 測試 (Solo 開關與換班軟性特例放行)
│   └── test_deduction_balance_check.mjs                      # 需求 #011 測試 (假勤額度不足阻擋與 4 大假別)
├── ISSUES_LOG.md                                # 需求與版本歷史追蹤紀錄 (16 項發布版本)
├── PROGRESS.md                                  # 專案進度與規格書
├── DEPLOY_GUIDE.md                              # Google Sheets + GAS 雲端部署與初始化指南
└── HANDOVER.md                                  # 本交接說明書
```

---

## 五、 維運、測試與建置指令指南

### 1. 本地開發伺服器啟動
```powershell
# 進入專案目錄
cd c:\Github\ReactApp\xuelu-shift-frontend

# 啟動 Vite 開發伺服器 (預設運行於 http://localhost:3000/)
npm run dev
```

### 2. 執行 4 大自動化單元測試腳本 (全數通過檢驗)
```powershell
# 1. 測試需求 #014：最高主管自主申報與 Admin 備查歸檔
node scratch/test_manager_self_declared_and_admin_verification.mjs

# 2. 測試需求 #013：實勤覆核同組限制、嚴禁跳組與利益迴避
node scratch/test_review_hierarchy_and_station_scope.mjs

# 3. 測試需求 #012：支援部門 Solo 開關與互調班軟性特例放行
node scratch/test_swap_soft_guard_and_solo_switch.mjs

# 4. 測試需求 #011：假勤折抵額度不足剛性阻擋與 4 大假別
node scratch/test_deduction_balance_check.mjs
```

### 3. 生產環境打包編譯
```powershell
npm run build
# 打包產物將產出於 dist/ 目錄，確保 0 錯誤、0 警告 (1890 模組編譯)。
```

---

## 六、 待續功能與未來規劃建議 (Roadmap)

若未來重啟後續迭代開發，建議依序推展以下功能：
1. **Google Sheets GAS 實體驗證聯調**：
   - 依照 [`DEPLOY_GUIDE.md`](file:///c:/Github/ReactApp/xuelu-shift-frontend/DEPLOY_GUIDE.md) 將前端與 Google Apps Script 雲端端點進行正式連線，驗證 7+1 核心表的雲端讀寫持久化。
2. **LINE Notify / Webhook 調班通知推播**：
   - 當同仁送出調班申請或主管完成二階審核/Admin 備查歸檔時，透過 GAS Webhook 自動發送 LINE 訊息通知相關同仁。
3. **年底未休特休與補休結算結轉**：
   - 依《勞基法》第 38 條第 4 項，特休於年度終結未休之日數，提供主管「結算發給工資」或「經勞雇雙方協商遞延至次年度」之批次結轉工具。

---

**交接人員**：Antigravity Agentic Pair Programmer  
**交接確認狀態**：檔案齊備、版本封裝完成、隨時可復工或交接他人維護。
