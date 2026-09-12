# 📊 學旅營運處排班系統 - 資料庫分頁與欄位程式對照手冊 (Database Schema & Code Mapping Specification)

本手冊詳細記錄 **Google Sheets (Google Apps Script / Code.gs)** 核心 12 大資料庫分頁之完整欄位結構、資料型態、業務用途，以及前端 UI 元件與後端微服務 API 的映射關係。

---

## 📑 目錄
1. [1. Employees (同仁主檔)](#1-employees-同仁主檔)
2. [2. Stations (9大站點主檔與配額)](#2-stations-9大站點主檔與配額)
3. [3. Shift_Types (營業班別與法定假別主檔)](#3-shift_types-營業班別與法定假別主檔)
4. [4. Rules (全月排班與考勤規則主檔)](#4-rules-全月排班與考勤規則主檔)
5. [5. Quotas (每日休假配額與管制日)](#5-quotas-每日休假配額與管制日)
6. [6. Schedules (月度班表矩陣與發布狀態)](#6-schedules-月度班表矩陣與發布狀態)
7. [7. Leaves (預休劃假與 PT 報班志願表)](#7-leaves-預休劃假與-pt-報班志願表)
8. [8. Swaps (雙階調班與自調挪休申請表)](#8-swaps-雙階調班與自調挪休申請表)
9. [9. Overrides (實勤覆核與微調扣抵紀錄表)](#9-overrides-實勤覆核與微調扣抵紀錄表)
10. [10. Passbooks (特休/補休個人化存摺交易表)](#10-passbooks-特休補休個人化存摺交易表)
11. [11. Settlements (月底考勤簽認與結算對帳表)](#11-settlements-月底考勤簽認與結算對帳表)
12. [12. Audit_Logs (不可抹滅資安稽核日誌)](#12-audit_logs-不可抹滅資安稽核日誌)

---

## 1. Employees (同仁主檔)
- **主要用途**：管理全館所有同仁之基本資料、業務角色、 PIN 碼雜湊、到職日與排班屬性。
- **後端 Code.gs API**：`auth.login`, `schedule.getInitialData`, `admin.savePersonnel`, `admin.syncAll`
- **前端對應組件**：`PersonnelManagement.jsx`, `Header.jsx`, `ChangePasswordModal.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `emp_id` | String | 員工工號主鍵 (如 `B115101`) | `emp.emp_id` |
| **Col B (2)** | `name` | String | 同仁姓名 (如 `陳鵬宇`) | `emp.name` |
| **Col C (3)** | `role` | String | 業務權限角色 (`Manager` / `Leader` / `Staff` / `PT`) | `emp.role` |
| **Col D (4)** | `pin_hash` | String | SHA-256 加鹽雜湊密碼 | `emp.pin_hash` |
| **Col E (5)** | `salt` | String | 密碼隨機鹽值 (如 `9a8b7c6d`) | `emp.salt` |
| **Col F (6)** | `is_admin` | Boolean | 系統管理員權限 (`TRUE` / `FALSE`) | `emp.is_admin` |
| **Col G (7)** | `primary_station` | String | 主屬站點代碼 (如 `ST_SERVICE`) | `emp.primary_station` |
| **Col H (8)** | `supported_stations`| JSON String| 跨組支援站點代碼陣列 (如 `["ST_SERVICE","ST_MSS"]`)| `emp.supported_stations` |
| **Col I (9)** | `solo_stations` | JSON String| 可獨立開關Solo站點清單 (如 `["ST_SERVICE"]`) | `emp.solo_stations` |
| **Col J (10)**| `can_solo` | Boolean | 主屬站點是否具獨立顧站資格 (`TRUE` / `FALSE`) | `emp.can_solo` |
| **Col K (11)**| `hire_date` | Date/String| 同仁正式到職日 (週年特休計算必填，如 `2024-05-01`)| `emp.hire_date` |
| **Col L (12)**| `created_at` | String | 資料建檔時間 (ISO 8601) | `emp.created_at` |
| **Col M (13)**| `status` | String | 在勤生命週期狀態 (`Active`/`Suspended`/`Resigned`) | `emp.status` |
| **Col N (14)**| `pt_schedule_mode` | String | PT 排班模式 (`FREE` 自由排班 / `FIXED` 僅上固定班) | `emp.pt_schedule_mode` |

---

## 2. Stations (9大站點主檔與配額)
- **主要用途**：定義全館 9 大營運站點之名稱、平假日最低營運人力、開班班別與指定站點組長。
- **後端 Code.gs API**：`admin.saveStations`, `admin.saveStationLeader`, `admin.syncAll`
- **前端對應組件**：`StationStatusOverview.jsx`, `MonthlyRulesModal.jsx`, `PersonnelManagement.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `station_id` | String | 站點代碼主鍵 (如 `ST_SERVICE`, `ST_MSS`) | `station.station_id` |
| **Col B (2)** | `station_name` | String | 站點顯示名稱 (如 `服務台`, `MSS`) | `station.station_name` |
| **Col C (3)** | `weekday_min_staff`| Number | 平日全站最低營運人力需求 (如 `2`) | `station.weekday_min_staff` |
| **Col D (4)** | `weekend_min_staff`| Number | 假日全站最低營運人力需求 (如 `4`) | `station.weekend_min_staff` |
| **Col E (5)** | `weekday_open_shifts`| JSON String| 平日開放班別代碼陣列 (如 `["A","B"]`) | `station.weekday_open_shifts` |
| **Col F (6)** | `weekend_open_shifts`| JSON String| 假日開放班別代碼陣列 (如 `["A","B","C"]`) | `station.weekend_open_shifts` |
| **Col G (7)** | `weekday_primary_min`| Number | 平日主屬專責保底人力需求 (如 `1`) | `station.weekday_primary_min` |
| **Col H (8)** | `weekend_primary_min`| Number | 假日主屬專責保底人力需求 (如 `2`) | `station.weekend_primary_min` |
| **Col I (9)** | `leader_id` | String | 當月指定之站點組長員工工號 (如 `B112001`) | `station.leader_emp_id` |

---

## 3. Shift_Types (營業班別與法定假別主檔)
- **主要用途**：維護全館營業班別（A/B/C/D班）與全量勞基法法定假別（例假/休息日/特休/補休/病假/事假等）之起訖時間、工時與視覺色彩。
- **後端 Code.gs API**：`admin.saveShiftTypes`, `schedule.getInitialData`
- **前端對應組件**：`ShiftSettingsModal.jsx`, `ScheduleTable.jsx`, `complianceValidator.js`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `shift_code` | String | 班別/假別代碼主鍵 (如 `A`, `B`, `D`, `REG_OFF`, `AL`) | `shift.code` |
| **Col B (2)** | `shift_name` | String | 班別顯示名稱 (如 `正常班`, `法定例假`, `特休`) | `shift.name` |
| **Col C (3)** | `start_time` | String | 上班時間 (如 `09:30` 或 `-`) | `shift.startTime` |
| **Col D (4)** | `end_time` | String | 下班時間 (如 `18:30` 或 `-`) | `shift.endTime` |
| **Col E (5)** | `break_hours` | Number | 休息時間小時數 (如 `1`) | `shift.breakHours` |
| **Col F (6)** | `work_hours` | Number | 淨實勤工時小時數 (如 `8`) | `shift.workHours` |
| **Col G (7)** | `color_bg` | String | 卡片背景色 Hex/RGB (如 `#f1f5f9`) | `shift.color` |
| **Col H (8)** | `color_text` | String | 文字與徽章顏色 (如 `#334155`) | `shift.textColor` |
| **Col I (9)** | `is_active` | Boolean | 班別是否啟用 (`TRUE` / `FALSE`) | `shift.isActive` |
| **Col J (10)**| `updated_at` | String | 最後修改時間 (ISO 8601) | `shift.updated_at` |

---

## 4. Rules (全月排班與考勤規則主檔)
- **主要用途**：控管各月份之目標年月、法定應休天數、國定假日清單與大檔活動日。
- **後端 Code.gs API**：`schedule.getInitialData`, `admin.syncAll`
- **前端對應組件**：`MonthlyRulesModal.jsx`, `schedulerEngine.js`, `complianceValidator.js`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `rule_id` | String | 規則主鍵 (如 `R_2026_09`) | `rules.rule_id` |
| **Col B (2)** | `year_month` | String | 目標年月 (如 `2026-09`) | `rules.target_year_month` |
| **Col C (3)** | `holidays_json` | JSON String| 當月國定假日日期陣列 (如 `["2026-09-25"]`) | `rules.holidays` |
| **Col D (4)** | `required_off_days`| Number | 全月法定強制應休天數 (如 `10`) | `rules.required_off_days` |
| **Col E (5)** | `overtime_cap_day` | Number | 每日加班上限小時數 (如 `4`) | `rules.overtime_cap_day` |
| **Col F (6)** | `overtime_cap_month`| Number | 每月延長工時上限 (如 `46`) | `rules.overtime_cap_month` |
| **Col G (7)** | `updated_at` | String | 最後更新時間 | `rules.updated_at` |

---

## 5. Quotas (每日休假配額與管制日)
- **主要用途**：設定各站點每日最高同休人數上限，以及尖峰大檔活動管制日。
- **後端 Code.gs API**：`schedule.getInitialData`
- **前端對應組件**：`MonthlyRulesModal.jsx`, `PtAvailabilityPicker.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `quota_id` | String | 配額主鍵 (如 `Q_20260915_ST_SERVICE`) | `quota.quota_id` |
| **Col B (2)** | `station_id` | String | 站點代碼 (如 `ST_SERVICE`) | `quota.station_id` |
| **Col C (3)** | `date` | String | 日期 (如 `2026-09-15`) | `quota.date` |
| **Col D (4)** | `max_off_count` | Number | 當日該站點最高允許同休人數 (如 `2`) | `quota.max_off_count` |
| **Col E (5)** | `notes` | String | 管制日或活動備註 (如 `周年慶大檔限制休假`) | `quota.notes` |

---

## 6. Schedules (月度班表矩陣與發布狀態)
- **主要用途**：儲存全館同仁整月 1 ~ 31 日之每日出勤班別、總工時與大表發布狀態。
- **後端 Code.gs API**：`schedule.getInitialData`, `schedule.saveSchedule`
- **前端對應組件**：`ScheduleTable.jsx`, `MyDashboard.jsx`, `StationStatusOverview.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `schedule_id` | String | 班表紀錄主鍵 (如 `SCH_202609_B115101`) | `sch.schedule_id` |
| **Col B (2)** | `year_month` | String | 目標年月 (如 `2026-09`) | `sch.year_month` |
| **Col C (3)** | `emp_id` | String | 同仁工號 (如 `B115101`) | `sch.emp_id` |
| **Col D~AH (4~34)**| `day_1` ~ `day_31`| String | 第 1 到 31 天之班別代碼 (如 `A`, `B`, `D`, `AL`, `REST_OFF`) | `scheduleMap[emp_id][day].shift_type` |
| **Col AI (35)**| `total_hours` | Number | 全月累計淨實勤工時 (如 `160`) | `sch.total_hours` |
| **Col AJ (36)**| `published_status`| String | 排班審核與發布狀態 (`DRAFT` / `PUBLISHED`) | `sch.published_status` |
| **Col AK (37)**| `updated_at` | String | 最後儲存時間 | `sch.updated_at` |

---

## 7. Leaves (預休劃假與 PT 報班志願表)
- **主要用途**：紀錄正職同仁提出的預休劃假申請，以及 PT 同仁的意願報班日曆。
- **後端 Code.gs API**：`leave.submitPreferences`, `schedule.getInitialData`
- **前端對應組件**：`RegularStaffPicker.jsx`, `PtAvailabilityPicker.jsx`, `LeaveApplicationModal.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `leave_id` | String | 休假申請單號主鍵 (如 `LV_20260901_001`) | `leave.leave_id` |
| **Col B (2)** | `emp_id` | String | 申請人同仁工號 (如 `B115101`) | `leave.emp_id` |
| **Col C (3)** | `leave_type` | String | 假別類型 (`AL`特休, `SL`病假, `PREFER_OFF`劃休, `AVAIL`PT報班) | `leave.leave_type` |
| **Col D (4)** | `start_date` | String | 開始日期 (如 `2026-09-15`) | `leave.start_date` |
| **Col E (5)** | `end_date` | String | 結束日期 (如 `2026-09-15`) | `leave.end_date` |
| **Col F (6)** | `hours` | Number | 請假小時數 (如 `8`) | `leave.hours` |
| **Col G (7)** | `status` | String | 審核狀態 (`APPROVED`, `PENDING`, `REJECTED`) | `leave.status` |
| **Col H (8)** | `reason` | String | 請假事由備註 | `leave.reason` |
| **Col I (9)** | `approved_by` | String | 審核主管工號 | `leave.approved_by` |
| **Col J (10)**| `created_at` | String | 申請送出時間 | `leave.created_at` |

---

## 8. Swaps (雙階調班與自調挪休申請表)
- **主要用途**：管理同仁間的換班、對調與自調挪休，支援組長初審與高管終審雙階審核流。
- **後端 Code.gs API**：`swap.submit`, `swap.review`
- **前端對應组件**：`SwapPortalModal.jsx`, `MyDashboard.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `swap_id` | String | 調班單號主鍵 (如 `SWP_20260910_888`) | `swap.swap_id` |
| **Col B (2)** | `created_at` | String | 申請時間 | `swap.created_at` |
| **Col C (3)** | `type` | String | 調班類型 (`SWAP`對調, `TRANSFER`改班, `SELF_OFF`自調挪休) | `swap.type` |
| **Col D (4)** | `applicant_id` | String | 申請人同仁工號 | `swap.applicant_id` |
| **Col E (5)** | `applicant_name` | String | 申請人姓名 | `swap.applicant_name` |
| **Col F (6)** | `applicant_day` | Number | 申請人原出勤日 (1~31) | `swap.applicant_day` |
| **Col G (7)** | `applicant_shift`| String | 申請人原班別代碼 (如 `A`) | `swap.applicant_shift` |
| **Col H (8)** | `target_id` | String | 對調對象同仁工號 | `swap.target_id` |
| **Col I (9)** | `target_name` | String | 對調對象同仁姓名 | `swap.target_name` |
| **Col J (10)**| `target_day` | Number | 對調對象原出勤日 (1~31) | `swap.target_day` |
| **Col K (11)**| `target_shift` | String | 對調對象原班別代碼 (如 `B`) | `swap.target_shift` |
| **Col L (12)**| `reason` | String | 調班原因事由 | `swap.reason` |
| **Col M (13)**| `status` | String | 審核狀態 (`PENDING_FIRST`, `PENDING_FINAL`, `APPROVED`, `REJECTED`, `ADMIN_ARCHIVED`) | `swap.status` |
| **Col N (14)**| `is_special_case`| Boolean| 是否為專案特殊調班 | `swap.is_special_case` |
| **Col O (15)**| `is_manager_self_declared`| Boolean| 是否為高管自填發起調班 | `swap.is_manager_self_declared` |
| **Col P (16)**| `first_reviewer_id`| String | 組長初審人代碼 | `swap.first_reviewer_id` |
| **Col Q (17)**| `first_review_time`| String | 組長初審時間 | `swap.first_review_time` |
| **Col R (18)**| `final_reviewer_id`| String | 高管終審人代碼 | `swap.final_reviewer_id` |
| **Col S (19)**| `final_review_time`| String | 高管終審時間 | `swap.final_review_time` |
| **Col T (20)**| `admin_verifier_id`| String | Admin 備查歸檔人代碼 | `swap.admin_verifier_id` |
| **Col U (21)**| `admin_verify_time`| String | Admin 備查時間 | `swap.admin_verify_time` |
| **Col V (22)**| `notes` | String | 審核意見與備註 | `swap.notes` |

---

## 9. Overrides (實勤覆核與微調扣抵紀錄表)
- **主要用途**：紀錄主管現場對同仁實勤工時、加班、早退之微調覆核與法規豁免。
- **後端 Code.gs API**：`workhours.override`
- **前端對應組件**：`WorkHoursOverrideModal.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `override_id` | String | 覆核紀錄主鍵 (如 `OVR_20260901_001`) | `ovr.override_id` |
| **Col B (2)** | `year_month` | String | 目標年月 (如 `2026-09`) | `ovr.year_month` |
| **Col C (3)** | `emp_id` | String | 被覆核同仁工號 | `ovr.emp_id` |
| **Col D (4)** | `day` | Number | 覆核日期 (1~31) | `ovr.day` |
| **Col E (5)** | `actual_hours` | Number | 實際核定工時小時數 (如 `9`) | `ovr.actual_hours` |
| **Col F (6)** | `start_time` | String | 實際上班時間 | `ovr.start_time` |
| **Col G (7)** | `end_time` | String | 實際下班時間 | `ovr.end_time` |
| **Col H (8)** | `break_hours` | Number | 實際休息時間小時數 | `ovr.break_hours` |
| **Col I (9)** | `diff_hours` | Number | 視為加班/少勤小時數 | `ovr.diff_hours` |
| **Col J (10)**| `deduction_type`| String | 差額抵扣類型 (`COMP_TIME`補休, `OVERTIME`加班費) | `ovr.deduction_type` |
| **Col K (11)**| `is_labor_violation`| Boolean| 是否含法規豁免備註 | `ovr.is_labor_violation` |
| **Col L (12)**| `reviewer_id` | String | 執行覆核之主管 | `ovr.reviewer_id` |
| **Col M (13)**| `notes` | String | 現場緊急調度事由備註 | `ovr.notes` |
| **Col N (14)**| `updated_at` | String | 覆核時間 | `ovr.updated_at` |

---

## 10. Passbooks (特休/補休個人化存摺交易表)
- **主要用途**：管理同仁週年制特別休假與加班核轉補休之增加、扣抵與結算歷程。
- **後端 Code.gs API**：`schedule.getInitialData`, `workhours.override`
- **前端對應組件**：`LeavePassbookModal.jsx`, `MyDashboard.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `tx_id` | String | 交易主鍵 (如 `TX_20260901_001`) | `tx.tx_id` |
| **Col B (2)** | `timestamp` | String | 交易時間 (ISO 8601) | `tx.timestamp` |
| **Col C (3)** | `emp_id` | String | 同仁工號 | `tx.emp_id` |
| **Col D (4)** | `category` | String | 存摺類別 (`ANNUAL_LEAVE`特休, `COMP_TIME`補休) | `tx.category` |
| **Col E (5)** | `action` | String | 變動動作 (`INCREASE`增加, `DECREASE`扣抵) | `tx.action` |
| **Col F (6)** | `hours_or_days`| Number | 異動數值 (天數或小時數) | `tx.hours_or_days` |
| **Col G (7)** | `balance_after`| Number | 異動後最新餘額 | `tx.balance_after` |
| **Col H (8)** | `title` | String | 異動摘要說明 (如 `排班特休自動扣抵 1 天`) | `tx.title` |
| **Col I (9)** | `operator_id` | String | 經辦主管或系統標誌 | `tx.operator_id` |

---

## 11. Settlements (月底考勤簽認與結算對帳表)
- **主要用途**：紀錄月底同仁對個人月度班表之電子簽認，以及各項給薪假/請假扣款結算。
- **後端 Code.gs API**：`settlement.sign`, `schedule.getInitialData`
- **前端對應組件**：`MonthlySettlementPanel.jsx`, `MyDashboard.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `settlement_id`| String | 結算主鍵 (如 `STL_202609_B115101`) | `settle.settlement_id` |
| **Col B (2)** | `year_month` | String | 目標年月 (如 `2026-09`) | `settle.year_month` |
| **Col C (3)** | `emp_id` | String | 同仁工號 | `settle.emp_id` |
| **Col D (4)** | `is_signed` | Boolean | 同仁是否已電子簽認 (`TRUE` / `FALSE`) | `settle.is_signed` |
| **Col E (5)** | `signed_at` | String | 簽認時間 | `settle.signed_at` |
| **Col F (6)** | `signature_hash`| String | 電子簽署防偽數位雜湊 | `settle.signature_hash` |
| **Col G (7)** | `total_work_hours`| Number | 全月累計出勤工時 | `settle.total_work_hours` |
| **Col H (8)** | `personal_leave_hours`| Number| 事假累計小時數 | `settle.personal_leave_hours` |
| **Col I (9)** | `sick_leave_hours`| Number | 病假累計小時數 | `settle.sick_leave_hours` |
| **Col J (10)**| `comp_time_deduct_hours`| Number| 補休抵扣小時數 | `settle.comp_time_deduct` |
| **Col K (11)**| `annual_leave_deduct_days`| Number| 特休抵扣天數 | `settle.annual_leave_deduct` |
| **Col L (12)**| `updated_at` | String | 結算時間 | `settle.updated_at` |

---

## 12. Audit_Logs (不可抹滅資安稽核日誌)
- **主要用途**：紀錄全系統高風險操作（如班表發布、回滾、強行微調、高管審核）之雙快照歷史紀錄。只允許 Append，嚴禁刪改。
- **後端 Code.gs API**：`audit.rollback`, `logAuditEvent`
- **前端對應組件**：`AuditLogsModal.jsx`

| 欄位位置 | 欄位名稱 (Header) | 資料型態 | 業務用途說明與範例 | 程式碼對應屬性 (JS Key) |
| :--- | :--- | :--- | :--- | :--- |
| **Col A (1)** | `log_id` | String | 日誌主鍵 (如 `LOG_20260912_999`) | `log.log_id` |
| **Col B (2)** | `timestamp` | String | 觸發時間 (ISO 8601) | `log.timestamp` |
| **Col C (3)** | `action_type` | String | 操作類型 (`SCHEDULE_SAVE`, `SWAP_APPROVE`, `ROLLBACK`) | `log.action_type` |
| **Col D (4)** | `operator_id` | String | 操作者工號 | `log.operator_id` |
| **Col E (5)** | `operator_name`| String | 操作者姓名 | `log.operator_name` |
| **Col F (6)** | `notes` | String | 操作日誌說明備註 | `log.notes` |
| **Col G (7)** | `before_snapshot`| JSON String| 變更前資料 JSON 完整快照 | `log.before_snapshot` |
| **Col H (8)** | `after_snapshot` | JSON String| 變更後資料 JSON 完整快照 | `log.after_snapshot` |

---

## 🛠️ 三、 資料庫維護與初始化指南

若欲在 Google Apps Script 中手動建構或重置這 12 大工作表，請開啟 [`Code.gs`](file:///c:/Github/ReactApp/xuelu-shift-frontend/src/backend/Code.gs) 腳本視窗，選擇並執行函式：

```javascript
setupSpreadsheet();
```

系統將會自動檢測並補齊上述全量標頭與 12 大試算表架構！
