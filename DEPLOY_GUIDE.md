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

---

## 四、 地端與雲端異動同步注意事項與速查表 (Local vs Cloud Sync Guide)

排班系統採用前端（地端/託管）與後端（GAS 雲端試算表）解耦架構。在地端開發或微調過程中，各層級檔案的異動對應之雲端同步規則如下：

### 1. 異動對照速查表

| 地端修改項目 | 影響雲端對象 | 是否需手動同步？ | 具體操作方式 |
| :--- | :--- | :--- | :--- |
| **`src/backend/Code.gs`** | Google Apps Script 後端 | **是 (必要)** | 複製最新代碼貼入 GAS 編輯器，並至「管理部署作業」選擇「新版本 (New version)」重新發布。 |
| **手動修改本地 Mock 初始資料**<br>(`mockMasterData.js` 等) | Google Sheets 試算表 | **是**<br>(若希望覆蓋雲端) | 啟動前端，點擊頂部「☁️ 雲端同步」面板中之 **「一鍵備份至試算表 (Push)」**，將地端最新資料推送至試算表。 |
| **在前端 UI 新增/編輯人員與班別** | Google Sheets 試算表 | **否 (自動)** | 系統即時透過 API 自動雙向寫入 Google Sheets，無需手動同步。 |
| **試算表欄位結構 (Schema) 擴充** | Google Sheets 試算表表頭 | **是 (必要)** | 至 GAS 編輯器再次執行 **`setupSpreadsheet`** 自動補齊欄位，或手動在試算表第 1 列右側補上新英文欄位名稱。 |
| **前端 React 介面/演算法更新** | 同仁手機 / 平板端 | **是**<br>(正式發布時) | 執行 `npm run build` 打包 `dist/`，並推送到前端靜態託管空間（如 GitHub Pages、Vercel、Cloudflare Pages）。 |
| **新增 AI 功能或更換 API Key** | GAS 指令碼屬性 | **是** | 在 GAS 左側「專案設定 (齒輪圖示)」 $\rightarrow$ 「指令碼屬性」設定 `GEMINI_API_KEY`。 |

---

### 2. 重點情境深入操作指引

#### 📌 情境 A：修改了 `src/backend/Code.gs`（最關鍵）
- **常見失誤**：很多開發者在 GAS 貼上代碼並按儲存後，以為雲端就更新了，但前端測試依然無效。
- **正確流程**：
  1. 複製最新代碼貼入 GAS 編輯器，按 `Ctrl + S` 存檔。
  2. 點擊右上角 **「部署」 $\rightarrow$ 「管理部署作業」**。
  3. 點選右上方 **鉛筆圖示（編輯）**。
  4. **「版本」下拉選單務必切換為「新版本」 (New version)**！
  5. 點擊「部署」，這樣原有的 Web App URL 才會真正生效最新代碼。

#### 📌 情境 B：地端 Mock 初始資料覆蓋至雲端
- **適用時機**：在本地程式碼直接擴充了大量初始同仁名單、特殊權限或新站點，希望整份倒入雲端試算表時。
- **操作流程**：
  1. 在地端啟動開發伺服器 (`npm run dev`)。
  2. 確保右上角連線燈號為「🟢 雲端同步」。
  3. 點開連線面板，點擊 **「一鍵備份至試算表 (Push)」**。
  4. 系統將自動把本地所有最新員工清單、排班矩陣與主檔覆寫至 Google Sheets 試算表。

#### 📌 情境 C：外網與同仁手機存取（前端靜態發布）
- **適用時機**：地端開發完成，欲開放門市全體同仁於手機、平板登入系統劃休與調班。
- **操作方式**：請參閱下方「第五章：前端雲端發布與 CI/CD 自動化建置部署（GitHub + Vercel SOP）」。

---

## 五、 前端雲端發布與 CI/CD 自動化建置部署（GitHub + Vercel 完整 SOP）

本系統前端現已全面接入現代化 **GitHub + Vercel CI/CD 自動化發布流水線**，同仁手機與平板可 24 小時免開電腦隨時存取，本地代碼只要推送到 GitHub，30 秒內全自動編譯發布上線。

### 1. GitHub 遠端儲存庫建立與首次推送

1. **在 GitHub 建立 Repository**：
   - 登入 [GitHub](https://github.com/) ➜ 點選右上角「+」➜「New repository」。
   - **Repository name**：輸入 `xuelu-shift-frontend`。
   - **Visibility**：可設為 Public 或 Private。
   - ⚠️ **重要**：**不要勾選** README、.gitignore 或 License（保持完全空白）。
2. **本地綁定與推送到遠端**：
   ```powershell
   cd c:\Github\ReactApp\xuelu-shift-frontend
   git remote add origin https://github.com/lintoro/xuelu-shift-frontend.git
   git branch -M main
   git push -u origin main
   ```
   *若彈出 Windows 憑證授權視窗，選擇「Sign in with your browser」完成登入授權即可。*

---

### 2. Vercel 免費雲端託管與一鍵部署流程

1. **註冊/登入 Vercel**：
   - 前往 [Vercel 官網](https://vercel.com/signup)，點擊 **「Continue with GitHub」** 授權登入。
   - 方案選擇：**`I'm working on personal projects (Hobby)`**（完全免費、無使用期限、無須綁定信用卡）。
   - 若詢問 2FA 雙重認證，可點擊「Skip securing my account」跳過。
2. **匯入現有倉庫 (Import Project)**：
   - 進入 Vercel Dashboard 首頁，點擊右上角 **「Add New...」 $\rightarrow$ 「Project」**。
   - 在左側「Import Git Repository」清單中，找到 **`lintoro/xuelu-shift-frontend`**，點擊其右側的 **「Import」**。
3. **確認設定並發布**：
   - **Framework Preset**：Vercel 自動識別為 **`Vite`**（維持預設）。
   - **Root Directory**：`./`（維持預設）。
   - 直接點擊最下方藍色 **「Deploy」** 按鈕！
4. **取得專屬 HTTPS 線上網址**：
   - 約 30～45 秒打包編譯完成後，點擊「Continue to Dashboard」。
   - 在專案頂部 **「DOMAINS」** 即可獲得專屬公網網址（例如：`https://xuelu-shift-frontend.vercel.app`）。

---

### 3. SPA 路由重寫設定 (`vercel.json`)

為了防止使用者在瀏覽器子路徑重新整理時出現 404 錯誤，專案根目錄已建立並維護 `vercel.json`：
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### 4. 日常開發與一鍵 CI/CD 自動發布 SOP

未來本地有任何代碼修改（修復 Bug、微調排班規則或界面優化），**完全不需要手動打包上傳**，只要執行標準 Git 三部曲：

```powershell
cd c:\Github\ReactApp\xuelu-shift-frontend
git add .
git commit -m "feat: 說明本次更新內容"
git push origin main
```

- **自動化流水線 (CI/CD)**：GitHub 收到 Push 後會自動觸發 Vercel Webhook，Vercel 在 30 秒內自動完成雲端 `npm run build` 並無縫熱更新。
- 全體同仁只要重新整理瀏覽器即可享有最新版功能！

---

### 5. 手機與平板 PWA 體驗（免開電腦 24 小時在線）

1. **同仁手機開啟**：使用 iPhone Safari 或 Android Chrome 開啟 Vercel 正式網址。
2. **加入主畫面 (Add to Home Screen)**：
   - iOS：點擊瀏覽器底部分享按鈕 $\rightarrow$ 選擇 **「加入主畫面」**。
   - Android：點擊右上角三點選單 $\rightarrow$ 選擇 **「安裝應用程式」** 或 **「加到主畫面」**。
3. 手機桌面上將呈現「雪鹿排班」獨立 App 圖示，點擊即可全螢幕原生體驗，隨時隨地查看班表、申請調班與簽署國假同意書！

---

## 六、 v3.4.0 營運核心升級與 Google Apps Script (Code.gs) 重新發布備忘

在 `v3.4.0-operations-consolidation-done` 版本中，針對後端 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 進行了重大核心修復與端點擴充。**強烈建議至 GAS 編輯器更新代碼並發布「新版本」**：

### 1. 後端關鍵更新清單
1. **修正現有人事更新漏存 `role` Bug (`handleSavePersonnel`)**：
   - 修正試算表 `Employees` 更新時未寫入第 3 欄 (`role`) 的嚴重問題，使 PT/Staff/Leader/Manager 職等升遷能在 Google 試算表中持久化。
2. **新增密碼 Hash 雲端持久化 API (`auth.updatePasswordHash`)**：
   - 路由：`auth.updatePasswordHash`
   - 功能：接收 `emp_id`、`pin_hash`、`salt`，精準定位同仁在 `Employees` 表格中的列，更新第 9 欄與第 10 欄，確保使用者修改密碼後不因刷新或上下傳資料而失效。
3. **初始名冊回傳保留密碼與鹽值 (`handleGetInitialData`)**：
   - 修正初始名冊拉取時將 `pin_hash` 與 `salt` 設為空值導致前端覆蓋本機已改密碼的瑕疵。
4. **班別時間字串淨化**：
   - 時間解析全面轉為 `HH:mm` 台灣標準時區格式，杜絕 Google Sheets 導出 Date 物件時序列化為 `1899-12-30T...` 之歷史幽靈時間問題。

### 2. GAS 重新發布 SOP
1. 開啟 Google 試算表 $\rightarrow$ 擴充功能 $\rightarrow$ **Apps Script**。
2. 複製本地最新 [`src/backend/Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 內容，全部覆蓋 GAS 編輯器，按 `Ctrl + S` 儲存。
3. 點擊右上角 **「部署」 $\rightarrow$ 「管理部署作業」**。
4. 點選現有 Web 應用程式右上方 **鉛筆圖示（編輯）**。
5. **「版本」下拉選單務必選取「建立新版本 (New version)」**，並填寫說明（如：`v3.4.0 密碼持久化與職等同步修正`）。
6. 點擊 **「部署」** 完成，前端系統即全面連通最新後端功能。


