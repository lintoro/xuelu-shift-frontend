// src/data/mockMasterData.js

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
    leader_emp_id: 'B112001', // 李俐旻
    min_staff_weekday: 2,
    min_staff_weekend: 4,
    requires_solo_staff: true,
    requires_closing_shift: true,
    closing_min_staff: 1,
    color: 'border-l-blue-500 bg-blue-50/30',
    description: '票務收銀與 DIY 教學'
  },
  {
    station_id: 'ST_EXPERIENCE',
    station_name: '極限組',
    leader_emp_id: 'B112002', // 吳泓邑
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-cyan-500 bg-cyan-50/30',
    description: '體驗設施安全檢查'
  },
  {
    station_id: 'ST_MSS',
    station_name: 'MSS',
    leader_emp_id: 'B112003', // 陳哲胤
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
    station_name: '本鋪',
    leader_emp_id: 'B112004', // 柯又溱
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
    leader_emp_id: 'B112005', // 陳凱婷
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
    leader_emp_id: 'B112006', // 林美鳳
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
    leader_emp_id: 'B112007', // 王鳳珠
    min_staff_weekday: 1,
    min_staff_weekend: 2,
    requires_solo_staff: true,
    requires_closing_shift: false,
    closing_min_staff: 0,
    color: 'border-l-orange-500 bg-orange-50/30',
    description: '出餐與點餐收銀'
  },
  {
    station_id: 'ST_Gagoo',
    station_name: 'Gagoo',
    leader_emp_id: 'B113106', // 曾月薇
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
    emp_id: 'B111155',
    name: '陳鵬宇',
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
    emp_id: 'B111014',
    name: '林慶忠',
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
    emp_id: 'B112001',
    name: '李俐旻',
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
    emp_id: 'B112002',
    name: '吳泓邑',
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
    emp_id: 'B112003',
    name: '陳哲胤',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MSS',
    supported_stations: ['ST_MSS', 'ST_MAIN_SHOP', 'ST_Gagoo'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2021-09-10'
  },
  {
    emp_id: 'B112004',
    name: '柯又溱',
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
    emp_id: 'B112005',
    name: '陳凱婷',
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
    emp_id: 'B112006',
    name: '林美鳳',
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
    emp_id: 'B112007',
    name: '王鳳珠',
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
    emp_id: 'B113106',
    name: '曾月薇',
    role: 'Leader',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_Gagoo',
    supported_stations: ['ST_Gagoo', 'ST_MSS'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2023-06-01'
  },

  // 正職同仁 (Staff)
  {
    emp_id: 'B113089',
    name: '張舒扉',
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
    emp_id: 'B115042',
    name: '林錦達',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MSS',
    supported_stations: ['ST_MSS', 'ST_MAIN_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-02-01'
  },
  {
    emp_id: 'B114081',
    name: '劉宗哲',
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
    emp_id: 'B113028',
    name: '白慧真',
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
    emp_id: 'B115082',
    name: '林家萱',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_Gagoo',
    supported_stations: ['ST_Gagoo', 'ST_MSS'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-05-10'
  },
  {
    emp_id: 'B115090',
    name: '許雅婷',
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
    emp_id: 'B114055',
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
    emp_id: 'B115011',
    name: '趙子齊',
    role: 'Staff',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_MSS',
    supported_stations: ['ST_MSS', 'ST_MAIN_SHOP'],
    can_solo: true,
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2025-01-15'
  },
  {
    emp_id: 'B115012',
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
    emp_id: 'A202601',
    name: '陳盈如(PT)',
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
    emp_id: 'A202602',
    name: '林筠蓁(PT)',
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
    emp_id: 'A202603',
    name: '陳冠妤(PT)',
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
    emp_id: 'A202604',
    name: '顧芷璇(PT)',
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
    emp_id: 'A202605',
    name: '王雅惠(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_Gagoo',
    supported_stations: ['ST_Gagoo', 'ST_MSS'],
    can_solo: false,
    is_self_scheduled: false,
    pt_schedule_mode: 'FIXED', // 固定班
    status: 'Active',
    max_monthly_days: 10,
    hire_date: '2025-12-01'
  },
  {
    emp_id: 'A202606',
    name: '吳梅枝(PT)',
    role: 'PT',
    is_admin: false,
    pin_code: '000000',
    is_default_pin: true,
    failed_attempts: 0,
    lock_until: null,
    primary_station: 'ST_Gagoo',
    supported_stations: ['ST_Gagoo', 'ST_MSS'],
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
    'B112001': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B112002': { consecutive_work_days_at_end: 3, last_day_shift: 'B', last_day_end_time: '19:00' },
    'B112003': { consecutive_work_days_at_end: 1, last_day_shift: 'C', last_day_end_time: '19:30' },
    'B112004': { consecutive_work_days_at_end: 4, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B112005': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'B112006': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B112007': { consecutive_work_days_at_end: 1, last_day_shift: 'B', last_day_end_time: '19:00' },
    'B113106': { consecutive_work_days_at_end: 2, last_day_shift: 'C', last_day_end_time: '19:30' },
    'B113089': { consecutive_work_days_at_end: 3, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B115042': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'B114081': { consecutive_work_days_at_end: 1, last_day_shift: 'B', last_day_end_time: '19:00' },
    'B113028': { consecutive_work_days_at_end: 2, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B111155': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'B115082': { consecutive_work_days_at_end: 1, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B115090': { consecutive_work_days_at_end: 2, last_day_shift: 'B', last_day_end_time: '19:00' },
    'B114055': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' },
    'B115011': { consecutive_work_days_at_end: 1, last_day_shift: 'A', last_day_end_time: '17:30' },
    'B115012': { consecutive_work_days_at_end: 0, last_day_shift: 'OFF', last_day_end_time: '-' }
  }
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

