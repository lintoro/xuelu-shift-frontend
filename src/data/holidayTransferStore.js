// src/data/holidayTransferStore.js

/**
 * 核心決策 15：全年度國定假日專案調移計畫（120天完全平帳）
 * 官方調移借還體系：
 * 2 月 (少休 5 天，補於 3 月 +2、6 月 +1、11 月 +2)
 * 8 月 (少休 1 天，補於 12 月 +1)
 * 10 月 (少休 1 天，補於 12 月 +1)
 * 總調移淨額為 0 天，全年 120 天完全平帳。
 */
export const INITIAL_ANNUAL_HOLIDAY_PLAN = [
  { month: 1, name: '1 月', statutoryOff: 11, transferOffset: 0, actualOff: 11, note: '元旦' },
  { month: 2, name: '2 月', statutoryOff: 15, transferOffset: -5, actualOff: 10, note: '春節檔期專案借假 (少休5天)' },
  { month: 3, name: '3 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '春節還假第一檔 (+2天)' },
  { month: 4, name: '4 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '清明連假常態' },
  { month: 5, name: '5 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '勞動節常態' },
  { month: 6, name: '6 月', statutoryOff: 9, transferOffset: 1, actualOff: 10, note: '端午檔期還假 (+1天)' },
  { month: 7, name: '7 月', statutoryOff: 9, transferOffset: 0, actualOff: 9, note: '常態' },
  { month: 8, name: '8 月', statutoryOff: 10, transferOffset: -1, actualOff: 9, note: '暑期大檔專案借假 (少休1天)' },
  { month: 9, name: '9 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '中秋常態無調移' },
  { month: 10, name: '10 月', statutoryOff: 11, transferOffset: -1, actualOff: 10, note: '國慶大檔專案借假 (少休1天)' },
  { month: 11, name: '11 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '春節還假第二檔 (+2天)' },
  { month: 12, name: '12 月', statutoryOff: 9, transferOffset: 2, actualOff: 11, note: '暑期與國慶還假 (+2天)' }
];

export const HOLIDAY_ORIGIN_EVENTS = [
  { event_id: 'H_2026_CNY', name: '春節除夕檔期', origin_date: '2026-02-16', borrowed_month: 2, returned_months: [3, 6, 11] },
  { event_id: 'H_2026_SUMMER', name: '暑期尖峰大檔', origin_date: '2026-08-15', borrowed_month: 8, returned_months: [12] },
  { event_id: 'H_2026_NATIONAL', name: '國慶連假大檔', origin_date: '2026-10-10', borrowed_month: 10, returned_months: [12] }
];
