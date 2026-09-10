# 學旅營運處多站點智慧排班與考勤審查系統
# 開發維運交接說明書 (HANDOVER.md)

> **交接日期**：2026-09-10  
> **當前系統版本**：`v2.5.0-gas-cloud-integration-done`  
> **開發狀態**：✅ **功能全數完成、自動化測試 100% 通過、生產環境建置 0 錯誤、工作目錄乾淨無未提交檔案**

---

## 一、 專案概述與系統定位

本系統為專門針對「學旅營運處 9 大實體門市站點（服務台、營運處、極限組、MSS、本鋪、小鋪、清潔、餐飲、Gagoo）」打造之智慧排班、法規審查、調班二階審核、實勤工時微調覆核與月底考勤結算平台。

- **架構特點**：堅持「$0 Serverless 零伺服器主機成本」架構，以 React 18 SPA 為前端，以 Google Sheets (7+1+4 核心資料庫) 與 Google Apps Script (GAS) 為無伺服器後端資料核心。
- **排班核心**：確定性啟發式貪婪演算法（目標 < 500ms，實測 13ms），融合勞動基準法常態工時（7 休 1）與四週變形工時雙軌規範。
- **權限設計**：業務角色（`Manager` / `Leader` / `Staff` / `PT`）與系統管理權限（`is_admin`）雙軌徹底解耦。

---

## 二、 近期重大關鍵人事風控與雲端連線功能交接 (#011 ~ #015)

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
- **同組限制（不能跳組）**：站點組長 (Leader) 覆核選單**僅限同組基層人員**，跨組同仁 100% 排除，嚴防跳組越權。
- **利益迴避（不能自我覆核）**：覆核選單一律排除操作者本人，預設帶入第一位合格組員，杜絕球員兼裁判。
- **不可向上覆核**：組長選單排除 Manager 與其他同級 Leader，組長權限嚴格向下。
- **組長實勤出勤向上由 MANAGER 覆核**：營運高管 (Manager) 覆核名單納入各站點組長 (Leader)，並提供高管站點篩選器。
- **調班初審同組檢核**：組長僅能初審所轄站點調班單，跨組調班單按鈕標記鎖定。

### 4. 【需求 #014】最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔機制
- **確立最高決策者 (General Manager / 店長 / 營運總監)**：掌管全場終審裁決權，同級主管與組長調班統一向上由最高主管裁決，打破同級互審人情包袱。
- **最高主管「自主申報 (Self-Declaration)」專屬通道**：最高主管申報調班時，單據標註為 `【最高主管業務裁定 · 待行政合規備查】` (`PENDING_ADMIN_VERIFY`)，免除業務初審與同級審核。
- **ADMIN「檢驗合規並備查歸檔 (Verify & Archive)」專屬機制**：
  - 系統管理員 Admin 操作按鈕正名為 **`【檢驗合規並備查歸檔】`**，職責限縮於形式法規審查（檢核 7 休 1、額度是否充足），不作業務實質准駁，化解下屬審核主管倫理衝突。
  - 即時覆寫排班表，寫入專屬稽核日誌 `SHIFT_SWAP_ADMIN_ARCHIVED`，落實「雙人控制 (Dual Control)」審計防弊。

### 5. 【需求 #015】Google Sheets 與 GAS 雲端實體驗證聯調架構
- **7+1+4 完整雲端資料表架構**：升級 `src/backend/Code.gs`，納入 `Employees` (含 `solo_stations`)、`Stations`、`Shift_Types`、`Rules`、`Quotas`、`Schedules`、`Leaves`、`Swaps`、`Overrides`、`Passbooks`、`Settlements`、`Audit_Logs`、`Month_Borders` 共 13 張資料表。
- **前端可視化配置中心 (`GasConnectionModal.jsx`)**：
  - 頂部導覽列提供「☁️ 雲端狀態」按鈕（🟢 雲端同步 / 🟡 本地沙盒）。
  - 支援於 UI 貼上 Google Apps Script 網路應用程式 URL，自動記憶於瀏覽器快取，免手動修改代碼。
  - 提供 **「測試連線 (Test Ping)」**（顯示伺服器 RTT 毫秒延遲與版本）。
  - 提供 **「從試算表重新載入 (Pull)」** 與 **「一鍵備份至試算表 (Push)」** 雙向全量同步工具。
- **雙模式無縫降級 (Graceful Degradation)**：若網路斷線或 GAS 端點逾時，系統自動優雅回退至本地 LocalStorage 沙盒，確保門市現場作業不中斷。

---

## 三、 系統角色與權限職能矩陣 (RBAC Matrix)

| 角色標籤 | 業務角色 (`role`) | 系統管理權限 (`is_admin`) | 實勤覆核權限 (`HOURS_OVERRIDE`) | 調班初審權限 (`First Review`) | 調班終審與備查權限 (`Final Approve / Archive`) | 雲端同步中心權限 (`Cloud Modal`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **計時同仁 (PT)** | `PT` | `false` | 無（不可進） | 無 | 無 | 檢視連線狀態 |
| **正職同仁 (Staff)** | `Staff` | `false` | 無（不可進） | 無 | 無 | 檢視連線狀態 |
| **站點組長 (Leader)** | `Leader` | `false` | 限同組基層（排除自己與高管） | 僅限所轄站點單據（排除自身調班） | 無 | 檢視連線狀態 |
| **營運高管 (Manager)** | `Manager` | `false` | 全站點同仁與各站組長（排除自己） | 全場調班代初審（排除自身調班） | 全場調班終審覆寫（排除自身調班） | 全功能：Ping、Pull、Push 雙向同步 |
| **系統管理員 (Admin)** | `Staff` (雙軌解耦) | `true` | 全站點同仁、組長與最高主管合規歸檔 | 全場調班代初審 | 一般終審 ＋ **最高主管申報備查歸檔 (Verify & Archive)** | 全功能：Ping、Pull、Push 雙向同步 |

---

## 四、 核心原始碼結構對照表

```
xuelu-shift-frontend/
├── src/
│   ├── App.jsx                                  # 根元件：狀態總控、雲端雙向同步管線、異步持久化、備查歸檔
│   ├── components/
│   │   ├── Cloud/
│   │   │   └── GasConnectionModal.jsx           # [NEW] 雲端連線設定與同步中心 (URL設定、Ping測試、Pull/Push)
│   │   ├── Header.jsx                           # 頂部導覽列：整合「☁️ 雲端狀態」動態燈號與彈窗開關
│   │   ├── Admin/
│   │   │   ├── PersonnelManagement.jsx          # 人事主檔管理：支援站點勾選與「🌟 可獨立 (Solo)」開關
│   │   │   └── ShiftMasterManagement.jsx        # 營業班別主檔管理：Manager 動態新增/自訂班別
│   │   ├── Auth/
│   │   │   └── LoginView.jsx                    # 雙軌權限登入、快速身分切換卡、PIN 碼驗證與防爆破安全鎖
│   │   ├── Dashboard/
│   │   │   └── MyDashboard.jsx                  # 我的工作台：個人班表、自調挪休通道、雙存摺明細、月底電子簽認
│   │   ├── MonthlySettlement/
│   │   │   └── MonthlySettlementPanel.jsx       # 月底考勤結算：全月工時計算、4大假別統計清冊與 CSV 匯出
│   │   ├── ShiftSwap/
│   │   │   └── ShiftSwapPortal.jsx              # 線上調班門戶：雙人對調/自調挪休、特例調班軟性放行、二階審核與 Admin 備查
│   │   └── WorkHours/
│   │       └── ActualHoursOverride.jsx          # 實勤微調覆核：同組限制、利益迴避、4大假別折抵與額度不足剛性阻擋
│   ├── data/
│   │   ├── mockMasterData.js                    # 門市主檔：9 大站點定義、同仁名冊、solo_stations 與 canEmployeeSoloAtStation
│   │   ├── leaveStore.js                        # 假勤與存摺存儲：特休/補休餘額與流水帳紀錄
│   │   └── swapStore.js                         # 換班安全引擎：precheckSwapCompliance 雙向支援與 Solo 對價檢驗
│   ├── services/
│   │   └── apiService.js                        # 統一 API 服務網關：支援動態 URL、Ping 檢測、全量雙向同步與無損降級
│   └── backend/
│       └── Code.gs                              # Google Apps Script 後端：7+1+4 表一鍵建表、JSON-RPC、加鹽雜湊與全量同步
├── scratch/                                     # 自動化單元測試腳本庫
│   ├── test_gas_api_contract.mjs                # [NEW] 需求 #015 測試 (GAS API 契約規範、Ping 與資料序列化)
│   ├── test_manager_self_declared_and_admin_verification.mjs # 需求 #014 測試 (最高主管自主申報與 Admin 備查)
│   ├── test_review_hierarchy_and_station_scope.mjs           # 需求 #013 測試 (同組限制、利益迴避與向上覆核)
│   ├── test_swap_soft_guard_and_solo_switch.mjs              # 需求 #012 測試 (Solo 開關與換班軟性特例放行)
│   └── test_deduction_balance_check.mjs                      # 需求 #011 測試 (假勤額度不足阻擋與 4 大假別)
├── ISSUES_LOG.md                                # 需求與版本歷史追蹤紀錄 (17 項發布版本)
├── PROGRESS.md                                  # 專案進度與規格書
├── DEPLOY_GUIDE.md                              # Google Sheets + GAS 13 張核心表部署對接指南
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

### 2. 執行 5 大自動化單元測試腳本 (全數通過檢驗)
```powershell
# 1. 測試需求 #015：Google Sheets 與 GAS 雲端 API 契約規格
node scratch/test_gas_api_contract.mjs

# 2. 測試需求 #014：最高主管自主申報與 Admin 備查歸檔
node scratch/test_manager_self_declared_and_admin_verification.mjs

# 3. 測試需求 #013：實勤覆核同組限制、嚴禁跳組與利益迴避
node scratch/test_review_hierarchy_and_station_scope.mjs

# 4. 測試需求 #012：支援部門 Solo 開關與互調班軟性特例放行
node scratch/test_swap_soft_guard_and_solo_switch.mjs

# 5. 測試需求 #011：假勤折抵額度不足剛性阻擋與 4 大假別
node scratch/test_deduction_balance_check.mjs
```

### 3. 生產環境打包編譯
```powershell
npm run build
# 打包產物將產出於 dist/ 目錄，確保 0 錯誤、0 警告 (1892 模組編譯，耗時約 13.7s)。
```

---

## 六、 後續規劃狀態說明 (Roadmap)

依主管最新決策：
1. **Google Sheets + GAS 實體驗證聯調**：✅ **已全數實裝完成**（包含後端 13 表 Code.gs、前端可視化配置面板、雙向全量同步與離線降級）。
2. **LINE Notify / Webhook 調班通知推播**：⏸️ **暫不實裝，已妥善規劃技術藍圖供未來接續處理**。
3. **年底未休特休與補休結算結轉**：⛔ **確認不實裝**。

---

**交接人員**：Antigravity Agentic Pair Programmer  
**交接確認狀態**：檔案齊備、版本封裝完成、V2.5 雲端聯調功能全數通過驗收。
