// src/data/mockMasterData.js
import { BORDER_DATA_2026_10, SEPTEMBER_2026_SCHEDULE_DATA } from './septemberScheduleData.js';

export { SEPTEMBER_2026_SCHEDULE_DATA };

export const STATIONS = [
  {
    station_id: 'ST_ADMIN',
    station_name: '營運處(支援)',
    leader_emp_id: null, // 營運處支援無基層站點組長 (由營運高管統籌)
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-indigo-500 bg-indigo-50/30',
    description: '樓面管理、巡檢與機動支援'
  },
  {
    station_id: 'ST_SERVICE',
    station_name: '服務台',
    leader_emp_id: null, // 回歸資料庫真相：由 Google Sheets Stations 表或主管介面設定
    min_staff_weekday: 3,
    min_staff_weekend: 5,
    requires_solo_staff: true,
    requires_closing_shift: true,
    closing_min_staff: 1,
    color: 'border-l-blue-500 bg-blue-50/30',
    description: '票務收銀與 DIY 教學'
  },
  {
    station_id: 'ST_EXPERIENCE',
    station_name: '設施體驗組',
    leader_emp_id: null,
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-cyan-500 bg-cyan-50/30',
    description: '體驗設施安全檢查'
  },
  {
    station_id: 'ST_專櫃商品組',
    station_name: '專櫃商品組',
    leader_emp_id: null,
    min_staff_weekday: 2,
    min_staff_weekend: 4,
    requires_solo_staff: true,
    requires_closing_shift: true,
    closing_min_staff: 1,
    color: 'border-l-teal-500 bg-teal-50/30',
    description: '櫃位商品銷售與收銀'
  },
  {
    station_id: 'ST_MAIN_SHOP',
    station_name: '商場零售組',
    leader_emp_id: null,
    min_staff_weekday: 2,
    min_staff_weekend: 3,
    requires_solo_staff: true,
    requires_closing_shift: true,
    closing_min_staff: 1,
    color: 'border-l-emerald-500 bg-emerald-50/30',
    description: '商品陳列與銷售結帳'
  },
  {
    station_id: 'ST_SUB_SHOP',
    station_name: '小鋪',
    leader_emp_id: null,
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-amber-500 bg-amber-50/30',
    description: '商品推廣與現場服務'
  },
  {
    station_id: 'ST_CLEAN',
    station_name: '清潔',
    leader_emp_id: null, // 清潔組若未指派組長則為 null，不預塞假人
    min_staff_weekday: 2,
    min_staff_weekend: 3,
    requires_solo_staff: false,
    requires_closing_shift: true,
    closing_min_staff: 1,
    color: 'border-l-lime-500 bg-lime-50/30',
    description: '環境消毒維護'
  },
  {
    station_id: 'ST_DINING',
    station_name: '餐飲',
    leader_emp_id: null,
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-orange-500 bg-orange-50/30',
    description: '出餐與點餐收銀'
  },
  {
    station_id: 'ST_特展合作組',
    station_name: '特展合作組',
    leader_emp_id: null,
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-purple-500 bg-purple-50/30',
    description: '家具解說與體驗導引'
  }
];


// 核心同仁名冊：落實業務角色 (role) 與系統權限 (is_admin) 雙軌解耦
export const EMPLOYEES = [
  // 營運高階主管 兼 系統管理員 (Admin Manager, 掌管全場人事/國假調移/終審)
  {
    emp_id: 'EMP001',
    name: '陳主管',
    role: 'Manager',
    is_admin: true, // 系統管理員 (Admin) 兼 營運高管 (Manager)
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_ADMIN',
    supported_stations: ['ST_ADMIN', 'ST_SERVICE', 'ST_DINING'],
    can_solo: true,
    solo_stations: ['ST_ADMIN', 'ST_SERVICE'],
    is_self_scheduled: true,
    status: 'Active',
    hire_date: '2019-08-01'
  },
  // 正職同仁 兼 系統管理員 (Admin Staff, 數據總控與技術維護)
  {
    emp_id: 'EMP002',
    name: '林主管',
    role: 'Staff',
    is_admin: true, // 系統管理員 (Admin) 兼 正職同仁 (Staff)
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_ADMIN',
    supported_stations: ['ST_ADMIN', 'ST_SERVICE', 'ST_MAIN_SHOP'],
    can_solo: true,
    solo_stations: ['ST_ADMIN', 'ST_SERVICE'],
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2020-03-01'
  },
  // 站點組長 (Leader, is_admin: false, can_solo = true)
  {
    emp_id: 'EMP101',
    name: '李組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_SERVICE',
    supported_stations: ['ST_SERVICE', 'ST_ADMIN'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-05-15'
  },
  {
    emp_id: 'EMP102',
    name: '吳組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_EXPERIENCE',
    supported_stations: ['ST_EXPERIENCE', 'ST_ADMIN'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-08-01'
  },
  {
    emp_id: 'EMP103',
    name: '陳組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_專櫃商品組',
    supported_stations: ['ST_專櫃商品組', 'ST_MAIN_SHOP', 'ST_特展合作組'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-09-10'
  },
  {
    emp_id: 'EMP104',
    name: '柯組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MAIN_SHOP',
    supported_stations: ['ST_MAIN_SHOP', 'ST_SUB_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-11-20'
  },
  {
    emp_id: 'EMP105',
    name: '陳組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_SUB_SHOP',
    supported_stations: ['ST_SUB_SHOP', 'ST_MAIN_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2022-02-15'
  },
  {
    emp_id: 'EMP106',
    name: '林組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_CLEAN',
    supported_stations: ['ST_CLEAN'],
    can_solo: false,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-01-10'
  },
  {
    emp_id: 'EMP108',
    name: '王同仁',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_DINING',
    supported_stations: ['ST_DINING', 'ST_SERVICE'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2022-04-01'
  },
  {
    emp_id: 'EMP107',
    name: '曾組長',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_特展合作組',
    supported_stations: ['ST_特展合作組', 'ST_專櫃商品組'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2023-06-01'
  },

  // 正職同仁 (Staff)
  {
    emp_id: 'EMP003',
    name: '張主管',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_SERVICE',
    supported_stations: ['ST_SERVICE', 'ST_EXPERIENCE'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2023-08-15'
  },
  {
    emp_id: 'EMP007',
    name: '林主管',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_專櫃商品組',
    supported_stations: ['ST_專櫃商品組', 'ST_MAIN_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-02-01'
  },
  {
    emp_id: 'EMP005',
    name: '劉主管',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MAIN_SHOP',
    supported_stations: ['ST_MAIN_SHOP', 'ST_SUB_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2024-06-01'
  },
  {
    emp_id: 'EMP004',
    name: '白主管',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_CLEAN',
    supported_stations: ['ST_CLEAN'],
    can_solo: false,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2023-03-15'
  },
  {
    emp_id: 'EMP210',
    name: '林同仁',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_特展合作組',
    supported_stations: ['ST_特展合作組', 'ST_專櫃商品組'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-05-10'
  },
  {
    emp_id: 'EMP224',
    name: '許同仁',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_DINING',
    supported_stations: ['ST_DINING', 'ST_SERVICE'],
    can_solo: true,
    solo_stations: ['ST_DINING'],
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-07-01'
  },
  {
    emp_id: 'EMP220',
    name: '郭佩珊',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_EXPERIENCE',
    supported_stations: ['ST_EXPERIENCE', 'ST_SERVICE'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2024-04-15'
  },
  {
    emp_id: 'EMP222',
    name: '趙子齊',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_專櫃商品組',
    supported_stations: ['ST_專櫃商品組', 'ST_MAIN_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-01-15'
  },
  {
    emp_id: 'EMP223',
    name: '黃怡靜',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_CLEAN',
    supported_stations: ['ST_CLEAN'],
    can_solo: false,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-03-01'
  },

  // 計時人員 PT
  {
    emp_id: 'PT010',
    name: '陳同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_SERVICE',
    supported_stations: ['ST_SERVICE', 'ST_DINING', 'ST_ADMIN'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FREE', // 自由排班
    status: 'Active',
    max_monthly_days: 12,
    hire_date: '2025-09-01'
  },
  {
    emp_id: 'PT011',
    name: '林同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MAIN_SHOP',
    supported_stations: ['ST_MAIN_SHOP', 'ST_SUB_SHOP'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FIXED', // 僅能上固定班 (例如固定某些平日或週末)
    status: 'Active',
    max_monthly_days: 10,
    hire_date: '2025-10-01'
  },
  {
    emp_id: 'PT012',
    name: '陳同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_EXPERIENCE',
    supported_stations: ['ST_EXPERIENCE'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FREE',
    status: 'Active',
    max_monthly_days: 8,
    hire_date: '2025-11-01'
  },
  {
    emp_id: 'PT013',
    name: '顧同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_CLEAN',
    supported_stations: ['ST_CLEAN'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FREE',
    status: 'Active',
    max_monthly_days: 14,
    hire_date: '2025-08-01'
  },
  {
    emp_id: 'PT014',
    name: '王同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_特展合作組',
    supported_stations: ['ST_特展合作組', 'ST_專櫃商品組'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FIXED', // 固定班
    status: 'Active',
    max_monthly_days: 10,
    hire_date: '2025-12-01'
  },
  {
    emp_id: 'PT015',
    name: '吳同仁(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_特展合作組',
    supported_stations: ['ST_特展合作組', 'ST_專櫃商品組'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FREE',
    status: 'Active',
    max_monthly_days: 8,
    hire_date: '2026-01-01'
  }
];

// 目標月份預設規則 (2026年9月，30天，法定休假 10 天)
export const DEFAULT_MONTHLY_RULES = {
  target_year_month: '2026-09',
  days_in_month: 30,
  required_off_days: 10,
  max_preferred_days: 4,
  max_weekend_days: 1,
  default_daily_quota: 2,
  work_hour_model: 'REGULAR',
  max_overtime_hours: 46,
  overtime_warning_threshold: 40,
  default_closing_time_weekday: '18:00',
  default_closing_time_weekend: '19:00',
  daily_closing_overrides: {} // 格式: { [day]: '18:00' | '19:00' }
};


// 跨月邊界快取（模擬 2026年8月最後 7 天出勤數據）
export const MOCK_MONTH_BORDERS = {
  '2026-09': {
    'EMP101': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP102': { consecutive_work_days_at_end: 3, last_day_shift: 'B', last_day_end_time: '19:00' },
    'EMP103': { consecutive_work_days_at_end: 1, last_day_shift: 'C', last_day_end_time: '19:30' },
    'EMP104': { consecutive_work_days_at_end: 4, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP105': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'EMP106': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP108': { consecutive_work_days_at_end: 1, last_day_shift: 'B', last_day_end_time: '19:00' },
    'EMP107': { consecutive_work_days_at_end: 2, last_day_shift: 'C', last_day_end_time: '19:30' },
    'EMP003': { consecutive_work_days_at_end: 3, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP007': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'EMP005': { consecutive_work_days_at_end: 1, last_day_shift: 'B', last_day_end_time: '19:00' },
    'EMP004': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP001': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'EMP210': { consecutive_work_days_at_end: 1, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP224': { consecutive_work_days_at_end: 2, last_day_shift: 'B', last_day_end_time: '19:00' },
    'EMP220': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'EMP222': { consecutive_work_days_at_end: 1, last_day_shift: 'A', last_day_end_time: '17:30' },
    'EMP223': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' }
  },
  '2026-10': BORDER_DATA_2026_10
};

/**
 * 判斷同仁在指定站點是否具備獨立顧站 (Solo) 能力
 * 依據主管最新規範：支援部門能否獨立由主管在人事主檔中設定
 * 1. 若同仁主檔定義了 solo_stations 陣列，以該陣列是否包含 stationId 為準
 * 2. 若同仁主檔未定義 solo_stations，相容舊版：若 stationId 等於主屬站點且 can_solo 為 true 則視為可獨立
 */
export function canEmployeeSoloAtStation(emp, stationId) {
  if (!emp || !stationId) return false;
  if (Array.isArray(emp.solo_stations)) {
    return emp.solo_stations.includes(stationId);
  }
  // 相容舊資料
  return emp.primary_station === stationId && !!emp.can_solo;
}

