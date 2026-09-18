// src/types/scheduler.js

export const DEFAULT_SHIFT_TYPES = {
  A: {
    code: 'A',
    name: '早班',
    startTime: '08:30',
    endTime: '17:30',
    breakHours: 1,
    workHours: 8,
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    badgeColor: 'bg-sky-500 text-white',
    description: '開門營運、常態行政與環境準備'
  },
  B: {
    code: 'B',
    name: '中早班',
    startTime: '10:00',
    endTime: '19:00',
    breakHours: 1,
    workHours: 8,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    badgeColor: 'bg-emerald-500 text-white',
    description: '尖峰人流主班別'
  },
  C: {
    code: 'C',
    name: '中晚班',
    startTime: '10:30',
    endTime: '19:30',
    breakHours: 1,
    workHours: 8,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    badgeColor: 'bg-amber-500 text-white',
    description: '晚間收尾與打烊交接（平日限制，假日強制專責）'
  },
  D: {
    code: 'D',
    name: '正常班',
    startTime: '09:30',
    endTime: '18:30',
    breakHours: 1,
    workHours: 8,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badgeColor: 'bg-purple-500 text-white',
    description: '常態標準工時班別'
  },
  OFF: {
    code: 'OFF',
    name: '休假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    badgeColor: 'bg-rose-500 text-white',
    description: '例假、休息日、國定假日'
  },
  TERM_OFF: {
    code: 'TERM_OFF',
    name: '離職真空',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-gray-100 text-gray-400 border-gray-200',
    badgeColor: 'bg-gray-400 text-white',
    description: '離職生效後絕對真空，不計產能'
  },
  AL: {
    code: 'AL',
    name: '特休',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    badgeColor: 'bg-amber-600 text-white',
    description: '法定週年制特別休假 (全日 8h)'
  },
  CT: {
    code: 'CT',
    name: '補休',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-purple-50 text-purple-700 border-purple-300',
    badgeColor: 'bg-purple-600 text-white',
    description: '加班核轉彈性補償休假 (全日 8h)'
  },
  SL: {
    code: 'SL',
    name: '病假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-rose-50 text-rose-700 border-rose-300',
    badgeColor: 'bg-rose-600 text-white',
    description: '傷病請假 (一年內未住院 30 日內半薪)'
  },
  PL: {
    code: 'PL',
    name: '事假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    badgeColor: 'bg-slate-600 text-white',
    description: '個人私事請假 (一年內合計不得超過 14 日)'
  },
  ML: {
    code: 'ML',
    name: '婚假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-pink-50 text-pink-700 border-pink-300',
    badgeColor: 'bg-pink-600 text-white',
    description: '法定結婚假別 (8 日，工資照給)'
  },
  FL: {
    code: 'FL',
    name: '喪假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-stone-100 text-stone-700 border-stone-300',
    badgeColor: 'bg-stone-600 text-white',
    description: '親屬喪葬法定假別 (3~8 日，工資照給)'
  },
  MAT: {
    code: 'MAT',
    name: '產假/陪產假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300',
    badgeColor: 'bg-fuchsia-600 text-white',
    description: '分娩產假 (8週) 或 陪產檢及陪產假 (7日)'
  },
  CL: {
    code: 'CL',
    name: '公假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-cyan-50 text-cyan-700 border-cyan-300',
    badgeColor: 'bg-cyan-600 text-white',
    description: '依法給予公假 (兵役/公務出庭，工資照給)'
  },
  REG_OFF: {
    code: 'REG_OFF',
    name: '法定例假',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-rose-600 text-white font-black border border-rose-700',
    badgeColor: 'bg-rose-600 text-white',
    description: '勞基法第36條法定例假 (一例一休剛性保障，不可出勤)'
  },
  REST_OFF: {
    code: 'REST_OFF',
    name: '休息日',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-rose-100 text-rose-700 border border-rose-200',
    badgeColor: 'bg-rose-500 text-white',
    description: '勞基法第36條休息日 (常態輪休/彈性調移)'
  },
  HOLIDAY_OFF: {
    code: 'HOLIDAY_OFF',
    name: '國定假日',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-red-100 text-red-800 font-black border border-red-300',
    badgeColor: 'bg-red-600 text-white',
    description: '法定國定假日 (紀念日及節日放假)'
  },
  PRE_HIRE_OFF: {
    code: 'PRE_HIRE_OFF',
    name: '未到職',
    startTime: '-',
    endTime: '-',
    breakHours: 0,
    workHours: 0,
    color: 'bg-slate-100 text-slate-400 border-dashed border-slate-300',
    badgeColor: 'bg-slate-400 text-white',
    description: '新人尚未報到 (到職前真空，不計工時與休假)'
  }
};

// 保持與既有靜態模組之 100% 完全相容
export const SHIFT_TYPES = DEFAULT_SHIFT_TYPES;

export const NON_WORKING_CODES = ['OFF', 'TERM_OFF', 'PRE_HIRE_OFF', 'AL', 'CT', 'SL', 'PL', 'ML', 'FL', 'MAT', 'CL', 'REG_OFF', 'REST_OFF', 'HOLIDAY_OFF'];

/**
 * 全域假別與班別代碼正規化網關 (Shift & Leave Code Normalizer SSOT)
 * 作用：將所有英文全稱別名、中文假別字串、試算表舊值或高管留白物件，統一標準化為系統官方規範之代碼。
 */
export function normalizeShiftCode(val) {
  if (val === null || val === undefined) return '';

  // 若傳入物件 (例如 { shift_type: 'FL' })
  if (typeof val === 'object') {
    if (val.shift_type !== undefined) return normalizeShiftCode(val.shift_type);
    if (val.code !== undefined) return normalizeShiftCode(val.code);
    return '';
  }

  const str = String(val).trim();
  if (!str) return '';

  // 攔截高階主管自主填寫或試算表字串化之物件殘留
  if (str.includes('高階主管自主填寫') || str.includes('work_hours=') || str.startsWith('{') || str.startsWith('(')) {
    return '';
  }

  const upper = str.toUpperCase();

  // 映射表 (涵蓋 14 大假別之英文全稱、中文別名與縮寫)
  const MAP = {
    // 喪假
    'FUNERAL_LEAVE': 'FL',
    'FL': 'FL',
    '喪': 'FL',
    '喪假': 'FL',

    // 特別休假
    'ANNUAL_LEAVE': 'AL',
    'AL': 'AL',
    '特': 'AL',
    '特休': 'AL',
    '特別休假': 'AL',

    // 補休
    'COMP_TIME': 'CT',
    'COMPENSATION_TIME': 'CT',
    'CT': 'CT',
    '補': 'CT',
    '補休': 'CT',

    // 病假
    'SICK_LEAVE': 'SL',
    'SL': 'SL',
    '病': 'SL',
    '病假': 'SL',
    '傷病假': 'SL',

    // 事假
    'PERSONAL_LEAVE': 'PL',
    'PL': 'PL',
    '事': 'PL',
    '事假': 'PL',

    // 婚假
    'MARRIAGE_LEAVE': 'ML',
    'ML': 'ML',
    '婚': 'ML',
    '婚假': 'ML',

    // 產假/陪產假
    'MATERNITY_LEAVE': 'MAT',
    'PATERNITY_LEAVE': 'MAT',
    'MAT': 'MAT',
    '產': 'MAT',
    '產假': 'MAT',
    '陪產假': 'MAT',

    // 公假
    'CIVIL_LEAVE': 'CL',
    'PUBLIC_LEAVE': 'CL',
    'OFFICIAL_LEAVE': 'CL',
    'CL': 'CL',
    '公': 'CL',
    '公假': 'CL',

    // 法定例假
    'REGULAR_OFF': 'REG_OFF',
    'REG_OFF': 'REG_OFF',
    '例': 'REG_OFF',
    '例假': 'REG_OFF',
    '法定例假': 'REG_OFF',

    // 休息日
    'REST_DAY': 'REST_OFF',
    'REST_OFF': 'REST_OFF',
    '休息日': 'REST_OFF',

    // 常態休假
    'OFF': 'OFF',
    '休': 'OFF',
    '常態休': 'OFF',

    // 國定假日
    'NATIONAL_HOLIDAY': 'HOLIDAY_OFF',
    'HOLIDAY_OFF': 'HOLIDAY_OFF',
    '國': 'HOLIDAY_OFF',
    '國假': 'HOLIDAY_OFF',
    '國定假日': 'HOLIDAY_OFF',

    // 未到職真空
    'PRE_HIRE': 'PRE_HIRE_OFF',
    'PRE_HIRE_OFF': 'PRE_HIRE_OFF',
    '未': 'PRE_HIRE_OFF',
    '未到職': 'PRE_HIRE_OFF',

    // 離退真空
    'TERMINATION_OFF': 'TERM_OFF',
    'TERM_OFF': 'TERM_OFF',
    '空': 'TERM_OFF',
    '離退': 'TERM_OFF',

    // 常見出勤班別
    'A': 'A',
    'B': 'B',
    'C': 'C',
    'D': 'D'
  };

  if (MAP[upper]) return MAP[upper];
  if (MAP[str]) return MAP[str];

  return upper;
}

/**
 * 判定該班別是否為實際到班出勤 (非休假、非真空、非特休/補休/病假/事假等)
 */
export function isWorkingShift(shiftType) {
  const code = normalizeShiftCode(shiftType);
  return !!code && !NON_WORKING_CODES.includes(code);
}

/**
 * 判定該班別是否為各類休假或特定非出勤 (含例休、特休、補休、病假、事假、離職真空等)
 */
export function isOffShift(shiftType) {
  const code = normalizeShiftCode(shiftType);
  return !code || NON_WORKING_CODES.includes(code);
}

export const ALERT_LEVELS = {
  GREEN: {
    level: 'GREEN',
    label: '正常放行',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    icon: 'CheckCircle2'
  },
  YELLOW: {
    level: 'YELLOW',
    label: '機動支援',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    icon: 'AlertTriangle'
  },
  RED: {
    level: 'RED',
    label: '嚴重空窗',
    color: 'text-rose-600 bg-rose-50 border-rose-200',
    icon: 'XCircle'
  }
};

export const WORK_HOUR_MODELS = {
  REGULAR: {
    code: 'REGULAR',
    name: '常態工時 (7休1)',
    shortName: '7休1 (常態)',
    lawRef: '勞基法第36條第1項',
    maxConsecutiveDays: 6,
    biWeeklyMinOffDays: 4,
    description: '每 7 日中應有 2 日休息（1 例 1 休），連續出勤上限 6 天'
  },
  FLEX_2_WEEK: {
    code: 'FLEX_2_WEEK',
    name: '雙週變形工時 (30條第2項)',
    shortName: '雙週變形 (30條2項)',
    lawRef: '勞基法第30條第2項、第36條第2項第1款',
    maxConsecutiveDays: 6, // 勞基法第36條第2項第1款：每7日中至少應有1日之例假，連出勤上限仍為6天
    biWeeklyMinOffDays: 4, // 每2週內例假及休息日至少應有4日
    description: '每 7 日至少 1 例假（連上上限 6 天），每 2 週內例假與休息日至少 4 日（休息日可跨週彈性調移）'
  },
  FLEX_4_WEEK: {
    code: 'FLEX_4_WEEK',
    name: '四週變形工時 (30-1條)',
    shortName: '四週變形 (30-1條)',
    lawRef: '勞基法第30條之1、第36條第2項第2款',
    maxConsecutiveDays: 10,
    biWeeklyMinOffDays: 2, // 2 週內至少 2 例假
    fourWeeklyMinOffDays: 8, // 4 週內至少 8 日例休
    description: '4 週內例假得在 4 週內分配，2 週內至少 2 例假，4 週 4 例 4 休，連上上限 10 天'
  }
};
