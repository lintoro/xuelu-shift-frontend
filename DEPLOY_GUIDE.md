# 學旅營運處多站點智慧排班系統 - Google Sheets 與 GAS 部署對接指南 (DEPLOY_GUIDE.md)

> **架構定位**：$0 Serverless 極限架構（Google Sheets + Google Apps Script + React 18 + Vite）  
> **更新日期**：2026-09-10  
> **適用版號**：V2.3 完工維運版

---

## 一、 Google Sheets 7+1 核心試算表架構與欄位對照表

本系統採用 Google Sheets 作為永久關聯資料庫，共由 8 張工作表組成：

| 表單名稱 (Sheet Name) | 業務功能定位 | 欄位清單 (Columns Header) | 備註說明 |
| :--- | :--- | :--- | :--- |
| **`Employees`** | 人事組織主檔 | `emp_id`, `name`, `role`, `pin_hash`, `salt`, `is_admin`, `primary_station`, `supported_stations`, `can_solo`, `hire_date`, `created_at`, `status` | 支援加鹽雜湊密碼，不存明文；`status` 支援離職銷假真空聯動。 |
| **`Stations`** | 營業站點主檔 | `station_id`, `station_name`, `weekday_min_staff`, `weekend_min_staff`, `weekday_open_shifts`, `weekend_open_shifts`, `weekday_primary_min`, `weekend_primary_min`, `leader_id` | 9 大站點（含清潔組特別單位），動態指派組長工號。 |
| **`Rules`** | 排班法規與月曆規則 | `rule_id`, `year_month`, `holidays_json`, `required_off_days`, `overtime_cap_day`, `overtime_cap_month`, `updated_at` | 國定假日清單、四週變形工時、7 休 1 法規門檻。 |
| **`Quotas`** | 站點每日劃休配額 | `quota_id`, `station_id`, `date`, `max_off_count`, `notes` | 每日各站劃休名額上限，防同日劃休過度集中。 |
| **`Schedules`** | 全月排班矩陣表 | `schedule_id`, `year_month`, `emp_id`, `day_1` ~ `day_31`, `total_hours`, `published_status`, `updated_at` | 發布後正式排班矩陣，支援整月工時統計。 |
| **`Leaves`** | 休假意願與請假歷程 | `leave_id`, `emp_id`, `leave_type`, `start_date`, `end_date`, `hours`, `status`, `reason`, `approved_by`, `created_at` | 志願序劃休登記、審核狀態追蹤。 |
| **`Audit_Logs`** | 不可抹滅稽核軌跡 | `log_id`, `timestamp`, `action_type`, `operator_id`, `operator_name`, `notes`, `before_snapshot`, `after_snapshot` | 僅允許 `appendRow`，含前後班表雙快照，支援一鍵回滾。 |
| **`Month_Borders`** | 跨月銜接滑動視窗 | `border_id`, `year_month`, `emp_id`, `prev_month_last_7_days`, `next_month_first_7_days`, `updated_at` | 記錄前後月相鄰 7 天出勤紀錄，消除跨月連上超過 6 天盲區。 |

---

## 二、 Google Apps Script 後端部署三步 SOP

### 第一步：建立 Google 試算表與掛載後端代碼
1. 開啟 [Google Drive](https://drive.google.com/)，建立一份全新的 Google 試算表，命名為：`【學旅營運處】多站點智慧排班資料庫_2026`。
2. 點擊頂部選單的 **「擴充功能」 $\rightarrow$ 「Apps Script」**。
3. 將專案中的 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 內容完整複製並貼入編輯器中取代原代碼。

### 第二步：執行 7+1 表一鍵自動初始化 (`setupSpreadsheet`)
1. 在 Apps Script 編輯器上方函式下拉選單中，選擇 **`setupSpreadsheet`**。
2. 點擊 **「執行」**（第一次執行會要求 Google 授權存取試算表，請依指示點擊「允許」）。
3. 執行完成後返回 Google 試算表，將會看到系統自動建立好 8 張具備深色標題凍結列的工作表，並已預載 9 大營業站點與管理員示範資料。

### 第三步：配置 Gemini AI 金鑰與發布 Web 應用程式
1. **配置 AI 語意調優金鑰**：
   - 在 Apps Script 左側側邊欄點擊 **「專案設定 (齒輪圖示)」**。
   - 滾動至「指令碼屬性 (Script Properties)」，點擊「新增指令碼屬性」：
     - 屬性：`GEMINI_API_KEY`
     - 值：輸入您的 Google AI Studio API Key。
2. **部署為 Web 應用程式**：
   - 點擊右上角 **「部署」 $\rightarrow$ 「新增部署作業」**。
   - 類型選擇 **「網路應用程式 (Web app)」**。
   - 設定如下：
     - **說明**：`學旅排班正式發布版 V2.3`
     - **以何人身分執行**：`我 (您的帳號)`
     - **誰可以存取**：`任何人 (Anyone)`（確保門市平板與外勤人員連線正常）
   - 點擊 **「部署」** 並複製產生的 **Web 應用程式網址 (Web App URL)**。

---

## 三、 前端與 GAS 雙軌連線切換

1. **本機開發與離線模式 (預設)**：
   - 系統開箱自帶完備的 Mock Master Data，無需連網或綁定 GAS 即可在 `http://localhost:3000/` 本機驗收全部功能。
2. **連線至線上 Google Sheets**：
   - 若欲連線線上試算表，只需在前端網頁環境變數或 `index.html` 的 `<head>` 中注入：
     ```html
     <script>
       window.__GAS_API_URL__ = "https://script.google.com/macros/s/您的部署ID/exec";
     </script>
     ```
   - 系統即會自動由 Mock 模式切換為線上實時雙向連線！
