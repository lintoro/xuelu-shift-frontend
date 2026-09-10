# 學旅營運處多站點智慧排班系統 - Google Sheets 與 GAS 部署對接指南 (DEPLOY_GUIDE.md)

> **架構定位**：$0 Serverless 極限架構（Google Sheets + Google Apps Script + React 18 + Vite）  
> **更新日期**：2026-09-10  
> **適用版號**：`v2.5.0-gas-cloud-integration-done`

---

## 一、 Google Sheets 7+1+4 核心試算表架構與欄位對照表

本系統採用 Google Sheets 作為永久關聯資料庫，共由 13 張工作表組成，全面對齊近期人事風控需求（#011~#014）：

| 表單名稱 (Sheet Name) | 業務功能定位 | 欄位清單 (Columns Header) | 備註說明 |
| :--- | :--- | :--- | :--- |
| **`Employees`** | 人事組織主檔 | `emp_id`, `name`, `role`, `pin_hash`, `salt`, `is_admin`, `primary_station`, `supported_stations`, `solo_stations`, `can_solo`, `hire_date`, `created_at`, `status` | 支援加鹽雜湊密碼；支援 `solo_stations` 細粒度站點獨立開關 (需求 #012)；`status` 支援離職聯動。 |
| **`Stations`** | 營業站點主檔 | `station_id`, `station_name`, `weekday_min_staff`, `weekend_min_staff`, `weekday_open_shifts`, `weekend_open_shifts`, `weekday_primary_min`, `weekend_primary_min`, `leader_id` | 9 大站點（含清潔組獨立單位），動態指派組長工號。 |
| **`Shift_Types`** | 營業班別定義 | `shift_code`, `shift_name`, `start_time`, `end_time`, `break_hours`, `work_hours`, `color_bg`, `color_text`, `is_active`, `updated_at` | 支援 Manager 動態新增/自訂早中晚班別 (需求 #008)。 |
| **`Rules`** | 排班法規與月曆規則 | `rule_id`, `year_month`, `holidays_json`, `required_off_days`, `overtime_cap_day`, `overtime_cap_month`, `updated_at` | 國定假日清單、四週變形工時、7 休 1 法規門檻。 |
| **`Quotas`** | 站點每日劃休配額 | `quota_id`, `station_id`, `date`, `max_off_count`, `notes` | 每日各站劃休名額上限，防同日劃休過度集中。 |
| **`Schedules`** | 全月排班矩陣表 | `schedule_id`, `year_month`, `emp_id`, `day_1` ~ `day_31`, `total_hours`, `published_status`, `updated_at` | 發布後正式排班矩陣，支援整月工時統計。 |
| **`Leaves`** | 休假意願與請假歷程 | `leave_id`, `emp_id`, `leave_type`, `start_date`, `end_date`, `hours`, `status`, `reason`, `approved_by`, `created_at` | 志願序劃休登記、審核狀態追蹤。 |
| **`Swaps`** | 線上調班申請總表 | `swap_id`, `created_at`, `type`, `applicant_id`, `applicant_name`, `applicant_day`, `applicant_shift`, `target_id`, `target_name`, `target_day`, `target_shift`, `reason`, `status`, `is_special_case`, `is_manager_self_declared`, `first_reviewer_id`, `first_review_time`, `final_reviewer_id`, `final_review_time`, `admin_verifier_id`, `admin_verify_time`, `notes` | 支援雙人對調/自調挪休/Admin 備查歸檔完整狀態機 (需求 #012, #014)。 |
| **`Overrides`** | 實勤工時覆核明細 | `override_id`, `year_month`, `emp_id`, `day`, `actual_hours`, `start_time`, `end_time`, `break_hours`, `diff_hours`, `deduction_type`, `is_labor_violation`, `reviewer_id`, `notes`, `updated_at` | 記錄實勤調整與 4 大假別沖抵 (事假/病假/補休/特休) (需求 #011, #013)。 |
| **`Passbooks`** | 假勤存摺流水帳 | `tx_id`, `timestamp`, `emp_id`, `category`, `action`, `hours_or_days`, `balance_after`, `title`, `operator_id` | 特休與補休額度即時沖抵流水紀錄，防止透支負數 (需求 #011)。 |
| **`Settlements`** | 月底考勤電子簽認 | `settlement_id`, `year_month`, `emp_id`, `is_signed`, `signed_at`, `signature_hash`, `total_work_hours`, `personal_leave_hours`, `sick_leave_hours`, `comp_time_deduct_hours`, `annual_leave_deduct_days`, `updated_at` | 月底考勤定稿簽認與清冊留存 (需求 #004)。 |
| **`Audit_Logs`** | 不可抹滅稽核軌跡 | `log_id`, `timestamp`, `action_type`, `operator_id`, `operator_name`, `notes`, `before_snapshot`, `after_snapshot` | 僅允許 `appendRow`，含前後班表雙快照，支援一鍵回滾。 |
| **`Month_Borders`** | 跨月銜接滑動視窗 | `border_id`, `year_month`, `emp_id`, `prev_month_last_7_days`, `next_month_first_7_days`, `updated_at` | 記錄前後月相鄰 7 天出勤紀錄，消除跨月連上超過 6 天盲區。 |

---

## 二、 Google Apps Script 後端部署三步 SOP

### 第一步：建立 Google 試算表與掛載後端代碼
1. 開啟 [Google Drive](https://drive.google.com/)，建立一份全新的 Google 試算表，命名為：`【學旅營運處】多站點智慧排班資料庫_2026`。
2. 點擊頂部選單的 **「擴充功能」 $\rightarrow$ 「Apps Script」**。
3. 將專案中的 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 內容完整複製並貼入編輯器中取代原代碼。

### 第二步：執行一鍵自動建表與資料初始化 (`setupSpreadsheet`)
1. 在 Apps Script 編輯器上方函式下拉選單中，選擇 **`setupSpreadsheet`**。
2. 點擊 **「執行」**（第一次執行會要求 Google 授權存取試算表，請依指示點擊「允許」）。
3. 執行完成後返回 Google 試算表，系統將自動建立好 13 張具備深色標題凍結列的工作表，並預載 9 大營業站點、自訂營業班別與示範帳號資料。

### 第三步：配置 Gemini AI 金鑰與發布 Web 應用程式
1. **配置 AI 語意調優金鑰 (選用)**：
   - 在 Apps Script 左側側邊欄點擊 **「專案設定 (齒輪圖示)」**。
   - 滾動至「指令碼屬性 (Script Properties)」，點擊「新增指令碼屬性」：
     - 屬性：`GEMINI_API_KEY`
     - 值：輸入您的 Google AI Studio API Key。
2. **部署為 Web 應用程式**：
   - 點擊右上角 **「部署」 $\rightarrow$ 「新增部署作業」**。
   - 類型選擇 **「網路應用程式 (Web app)」**。
   - 設定如下：
     - **說明**：`學旅排班正式發布版 V2.5 (雲端實體驗證版)`
     - **以何人身分執行**：`我 (您的帳號)`
     - **誰可以存取**：`任何人 (Anyone)`（確保門市平板與同仁手機連線順暢）
   - 點擊 **「部署」** 並複製產生的 **Web 應用程式網址 (Web App URL)**。

---

## 三、 前端可視化配置與雙軌連線切換 (免改代碼)

系統現已支援**前端可視化配置**，主管或管理員無需手動修改任何程式碼：

1. **開啟雲端連線中心**：
   - 登入系統後，點擊頂部導覽列右側的 **「☁️ 本地沙盒」** 按鈕。
2. **貼入部署網址並測試**：
   - 在彈出面板中貼入您複製的 Web App URL（以 `/exec` 結尾）。
   - 點擊 **「測試連線」**，系統將自動執行 Ping 檢測並回報 RTT 往返延遲（毫秒）。
3. **儲存並套用**：
   - 點擊「儲存並套用」，系統自動記憶於瀏覽器快取，導覽列即時切換為 **「🟢 雲端同步」** 燈號！
4. **雙向同步工具**：
   - **從試算表重新載入 (Pull)**：點擊即可強制自 Google Sheets 同步最新主檔與班表資料。
   - **一鍵備份至試算表 (Push)**：點擊即可將目前本地沙盒所有主檔與排班矩陣全量備份發布至 Google 試算表。
5. **安全降級保證**：
   - 若網路離線或試算表端點逾時，系統自動優雅回退至本地 LocalStorage 沙盒，確保現場排班營運絕不中斷。
