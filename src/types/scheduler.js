// src/types/scheduler.js

export const SHIFT_TYPES = {
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
    name: '專櫃短班',
    startTime: '09:30',
    endTime: '16:30',
    breakHours: 1,
    workHours: 6,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    badgeColor: 'bg-purple-500 text-white',
    description: '專櫃彈性短班'
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
  }
};

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
