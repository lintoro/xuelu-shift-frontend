// src/data/leaveStore.js
import { EMPLOYEES } from './mockMasterData.js';

// 特休與補休存摺資料（落實週年制整數與補休小時制）
export const INITIAL_LEAVE_BALANCES = {
  // 正職組長
  'B112001': { annualLeaveDays: 7, compTimeHours: 16 }, // 李俐旻
  'B112002': { annualLeaveDays: 10, compTimeHours: 8 },  // 吳泓邑
  'B112003': { annualLeaveDays: 10, compTimeHours: 24 }, // 陳哲胤
  'B112004': { annualLeaveDays: 7, compTimeHours: 12 },  // 柯又溱
  'B112005': { annualLeaveDays: 7, compTimeHours: 0 },   // 陳凱婷
  'B112006': { annualLeaveDays: 14, compTimeHours: 32 }, // 林美鳳
  'B112007': { annualLeaveDays: 7, compTimeHours: 6 },   // 王鳳珠
  'B113106': { annualLeaveDays: 3, compTimeHours: 4 },   // 曾月薇
  // 正職同仁
  'B113089': { annualLeaveDays: 3, compTimeHours: 8 },   // 張舒扉
  'B115042': { annualLeaveDays: 3, compTimeHours: 0 },   // 林錦達
  'B114081': { annualLeaveDays: 3, compTimeHours: 14 },  // 劉宗哲
  'B113028': { annualLeaveDays: 3, compTimeHours: 0 },   // 白慧真
  'B111155': { annualLeaveDays: 10, compTimeHours: 18 }, // 陳鵬宇
  'B115082': { annualLeaveDays: 3, compTimeHours: 2 },   // 林家萱
  'B115090': { annualLeaveDays: 3, compTimeHours: 0 },   // 許雅婷
  'B114055': { annualLeaveDays: 3, compTimeHours: 8 },   // 郭佩珊
  'B115011': { annualLeaveDays: 3, compTimeHours: 0 },   // 趙子齊
  'B115012': { annualLeaveDays: 3, compTimeHours: 0 },   // 黃怡靜
  // 高管
  'B111014': { annualLeaveDays: 15, compTimeHours: 40 }  // 林慶忠
};

// 每日配額覆蓋（Daily_Quotas，預設每日常態 2 人，管制日 0 人）
export const INITIAL_DAILY_QUOTAS = {
  // 9/15 為全館大檔盤點日，全面禁休 (Quota = 0)
  15: { quota: 0, tag: '全館盤點日', isRestricted: true },
  // 9/25 為中秋連假前夕大檔，名額縮減為 1 人
  25: { quota: 1, tag: '中秋連假尖峰', isRestricted: false }
};

// 初始劃休與報班意向範例
export const INITIAL_PREFERENCES = [
  // 李俐旻 (組長): 9/5 (六, 第1志願), 9/6 (日, 第2志願)
  { emp_id: 'B112001', day: 5, priority: 1, leave_type: '自選例休', note: '家庭聚餐' },
  { emp_id: 'B112001', day: 6, priority: 2, leave_type: '自選例休', note: '備選' },

  // 張舒扉 (正職): 9/12 (六, 第1志願), 9/13 (日, 第2志願)
  { emp_id: 'B113089', day: 12, priority: 1, leave_type: '自選例休', note: '個人行程' },
  { emp_id: 'B113089', day: 13, priority: 2, leave_type: '自選例休', note: '個人行程' },

  // 劉宗哲 (正職): 9/19 (六, 第1志願), 9/20 (日, 第2志願)
  { emp_id: 'B114081', day: 19, priority: 1, leave_type: '特休', note: '返鄉' },
  { emp_id: 'B114081', day: 20, priority: 2, leave_type: '自選例休', note: '備選' },

  // 刻意製造衝突範例：柯又溱 (組長) 也在 9/5 劃第 1 志願，產生 9/5 衝突
  { emp_id: 'B112004', day: 5, priority: 1, leave_type: '自選例休', note: '重要私事' },
  { emp_id: 'B112004', day: 14, priority: 1, leave_type: '補休', comp_hours: 8, note: '補休請假' }
];

// PT 計時同仁出勤意向
export const INITIAL_PT_AVAILABILITY = {
  // 陳盈如(PT): 週末均登記可上班
  'A202601': {
    5: 'AVAILABLE',
    6: 'AVAILABLE',
    12: 'AVAILABLE',
    13: 'AVAILABLE',
    19: 'AVAILABLE',
    20: 'AVAILABLE',
    26: 'AVAILABLE',
    27: 'AVAILABLE',
    15: 'AVAILABLE', // 盤點日正向報班
    8: 'UNAVAILABLE'  // 不可排班日
  },
  'A202602': {
    5: 'AVAILABLE',
    6: 'AVAILABLE',
    15: 'AVAILABLE',
    19: 'UNAVAILABLE'
  }
};
