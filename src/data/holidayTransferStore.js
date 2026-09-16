// src/data/holidayTransferStore.js
import { isWorkingShift, isOffShift } from '../types/scheduler.js';

/**
 * 全年度國定假日專案調移與平帳管理模組 (Holiday Transfer & Balance Store)
 * 依《勞基法》第 37 條（國定假日）與第 39 條（出勤加倍工資/雙薪免除規範）
 * 服務業（四週變形工時）國假調移免計雙薪之法律核心：
 * 1. 事前經個別勞工同意調移至其他工作日休假。
 * 2. 就算全月休假總天數不移動，只要國定假日有出勤，亦須經同仁確認同意指定調移休假日。
 * 3. 全年法定放假天數動態加總平帳，不再寫死固定天數。
 */

// 2026 年度各月份法定放假天數與借還規劃基準
export const ANNUAL_HOLIDAY_PLANS = {
  '2026': [
    { month: 1, name: '1 月', statutoryOff: 11, transferOffset: 0, actualOff: 11, note: '元旦' },
    { month: 2, name: '2 月', statutoryOff: 15, transferOffset: -5, actualOff: 10, note: '春節檔期專案借假 (少休5天)' },
    { month: 3, name: '3 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '春節還假第一檔 (+2天)' },
    { month: 4, name: '4 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '清明連假常態' },
    { month: 5, name: '5 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '勞動節常態' },
    { month: 6, name: '6 月', statutoryOff: 9, transferOffset: 1, actualOff: 10, note: '端午檔期還假 (+1天)' },
    { month: 7, name: '7 月', statutoryOff: 9, transferOffset: 0, actualOff: 9, note: '常態' },
    { month: 8, name: '8 月', statutoryOff: 10, transferOffset: -1, actualOff: 9, note: '暑期大檔專案借假 (少休1天)' },
    { month: 9, name: '9 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '中秋常態出勤調移' },
    { month: 10, name: '10 月', statutoryOff: 11, transferOffset: -1, actualOff: 10, note: '國慶大檔專案借假 (少休1天)' },
    { month: 11, name: '11 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '春節還假第二檔 (+2天)' },
    { month: 12, name: '12 月', statutoryOff: 10, transferOffset: 2, actualOff: 12, note: '行憲紀念日與暑期國慶還假 (+2天)' }
  ],
  '2027': [
    { month: 1, name: '1 月', statutoryOff: 11, transferOffset: 0, actualOff: 11, note: '元旦' },
    { month: 2, name: '2 月', statutoryOff: 14, transferOffset: -4, actualOff: 10, note: '春節檔期專案借假' },
    { month: 3, name: '3 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '春節還假' },
    { month: 4, name: '4 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '清明' },
    { month: 5, name: '5 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '勞動節' },
    { month: 6, name: '6 月', statutoryOff: 9, transferOffset: 1, actualOff: 10, note: '端午還假' },
    { month: 7, name: '7 月', statutoryOff: 9, transferOffset: 0, actualOff: 9, note: '暑期' },
    { month: 8, name: '8 月', statutoryOff: 10, transferOffset: -1, actualOff: 9, note: '暑假大檔借假' },
    { month: 9, name: '9 月', statutoryOff: 10, transferOffset: 0, actualOff: 10, note: '中秋' },
    { month: 10, name: '10 月', statutoryOff: 11, transferOffset: -1, actualOff: 10, note: '國慶借假' },
    { month: 11, name: '11 月', statutoryOff: 8, transferOffset: 1, actualOff: 9, note: '春節還假' },
    { month: 12, name: '12 月', statutoryOff: 10, transferOffset: 2, actualOff: 12, note: '年底結清還假' }
  ]
};

// 保持向下相容之預設資料
export const INITIAL_ANNUAL_HOLIDAY_PLAN = ANNUAL_HOLIDAY_PLANS['2026'];

// 專案大檔調移借還事件
export const HOLIDAY_ORIGIN_EVENTS = [
  { event_id: 'H_2026_CNY', name: '春節除夕檔期', origin_date: '2026-02-16', borrowed_month: 2, return_mapping: '補於 3月(+2d)、6月(+1d)、11月(+2d)' },
  { event_id: 'H_2026_SUMMER', name: '暑期尖峰大檔', origin_date: '2026-08-15', borrowed_month: 8, return_mapping: '補於 12月(+1d)' },
  { event_id: 'H_2026_NATIONAL', name: '國慶連假大檔', origin_date: '2026-10-10', borrowed_month: 10, return_mapping: '補於 12月(+1d)' }
];

// 法定國定假日清單 (全年度法定應放紀念日與節日，包含小年夜與 9/28 教師節)
export const STATUTORY_HOLIDAYS = [
  { date: '2026-01-01', year: 2026, month: 1, day: 1, name: '中華民國開國紀念日 (元旦)' },
  { date: '2026-02-15', year: 2026, month: 2, day: 15, name: '農曆小年夜' },
  { date: '2026-02-16', year: 2026, month: 2, day: 16, name: '農曆除夕' },
  { date: '2026-02-17', year: 2026, month: 2, day: 17, name: '春節初一' },
  { date: '2026-02-18', year: 2026, month: 2, day: 18, name: '春節初二' },
  { date: '2026-02-19', year: 2026, month: 2, day: 19, name: '春節初三' },
  { date: '2026-02-28', year: 2026, month: 2, day: 28, name: '和平紀念日' },
  { date: '2026-04-04', year: 2026, month: 4, day: 4, name: '兒童節' },
  { date: '2026-04-05', year: 2026, month: 4, day: 5, name: '民族掃墓節 (清明節)' },
  { date: '2026-05-01', year: 2026, month: 5, day: 1, name: '勞動節' },
  { date: '2026-06-19', year: 2026, month: 6, day: 19, name: '端午節' },
  { date: '2026-09-25', year: 2026, month: 9, day: 25, name: '中秋節' },
  { date: '2026-09-28', year: 2026, month: 9, day: 28, name: '孔子誕辰紀念日 (教師節)' },
  { date: '2026-10-10', year: 2026, month: 10, day: 10, name: '國慶日' },
  { date: '2026-10-25', year: 2026, month: 10, day: 25, name: '臺灣光復節' },
  { date: '2026-12-25', year: 2026, month: 12, day: 25, name: '行憲紀念日' }
];

import { generateStatutoryHolidaysByYear } from '../services/holidayApiService.js';

// 動態假日快取註冊庫 (解決每年寫死國定假日問題，自動串接萬年曆與雲端 Holidays 頁籤)
let dynamicHolidaysRegistry = [...STATUTORY_HOLIDAYS];

/**
 * 動態註冊/擴充國定假日 (由 API 或 Google 試算表 Holidays 頁籤即時載入)
 * @param {Array} holidayList 
 */
export function registerDynamicHolidays(holidayList) {
  if (!Array.isArray(holidayList) || holidayList.length === 0) return;
  
  holidayList.forEach(item => {
    if (!item.date) return;
    const year = item.year || parseInt(item.date.split('-')[0], 10);
    const month = item.month || parseInt(item.date.split('-')[1], 10);
    const day = item.day || parseInt(item.date.split('-')[2], 10);
    const name = item.name || '國定假日';

    const existingIndex = dynamicHolidaysRegistry.findIndex(h => h.date === item.date);
    const newItem = { date: item.date, year, month, day, name };

    if (existingIndex >= 0) {
      dynamicHolidaysRegistry[existingIndex] = newItem;
    } else {
      dynamicHolidaysRegistry.push(newItem);
    }
  });

  dynamicHolidaysRegistry.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 取得指定月份之所有國定假日（支援萬年曆動態生成與試算表同步）
 * @param {string} yearMonth - 格式如 '2026-09'
 * @returns {Array} 國定假日清單
 */
export function getHolidaysInMonth(yearMonth = '2026-09') {
  const [yearStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);

  // 若該年份尚未進入記憶庫，觸發萬年曆引擎動態生成
  const existingForYear = dynamicHolidaysRegistry.filter(h => h.year === year);
  if (existingForYear.length === 0) {
    const generated = generateStatutoryHolidaysByYear(year).map(h => {
      const [y, m, d] = h.date.split('-').map(Number);
      return { date: h.date, year: y, month: m, day: d, name: h.name };
    });
    registerDynamicHolidays(generated);
  }

  return dynamicHolidaysRegistry.filter(h => h.date.startsWith(yearMonth));
}

/**
 * 檢查給定日期是否為國定假日 (支援動態萬年曆引擎與自訂節日)
 * @param {string|Date} dateStr - 格式如 '2026-09-25'
 * @returns {Object|null}
 */
export function isStatutoryHoliday(dateStr) {
  if (!dateStr) return null;
  const ds = typeof dateStr === 'string' ? dateStr.substring(0, 10) : dateStr.toISOString().substring(0, 10);
  const [yearStr] = ds.split('-');
  const year = parseInt(yearStr, 10);

  const foundInRegistry = dynamicHolidaysRegistry.find(h => h.date === ds);
  if (foundInRegistry) return foundInRegistry;

  const generated = generateStatutoryHolidaysByYear(year).map(h => {
    const [y, m, d] = h.date.split('-').map(Number);
    return { date: h.date, year: y, month: m, day: d, name: h.name };
  });
  registerDynamicHolidays(generated);

  return dynamicHolidaysRegistry.find(h => h.date === ds) || null;
}

/**
 * 檢查某同仁在給定月份之國假出勤與同意簽署資格
 * @param {Object} params
 * @param {string} params.empId - 員工工號
 * @param {string} params.yearMonth - '2026-09'
 * @param {Object} params.scheduleMap - 排班矩陣
 * @param {Object} params.consentsMap - 已簽署同意紀錄
 * @returns {Object} { required: boolean, holidays: Array, pendingCount: number }
 */
export function checkEmployeeHolidayConsent({ empId, yearMonth = '2026-09', scheduleMap = {}, consentsMap = {} }) {
  const monthHolidays = getHolidaysInMonth(yearMonth);
  if (!monthHolidays.length) {
    return { required: false, holidays: [], pendingCount: 0 };
  }

  const empSchedule = scheduleMap[empId] || {};
  const affectedHolidays = [];

  monthHolidays.forEach(h => {
    const shift = empSchedule[h.day];
    const shiftType = typeof shift === 'object' ? shift?.shift_type : shift;
    // 若該國定假日排定出勤班別（非休假且非空）
    if (shiftType && isWorkingShift(shiftType)) {
      const consentKey = `${yearMonth}_${h.day}_${empId}`;
      const isConsented = !!consentsMap[consentKey];
      
      // 自動尋找當月最靠近的一個休假日作為指定調移休假日
      let suggestedOffDay = null;
      for (let d = 1; d <= 31; d++) {
        const dayShift = empSchedule[d];
        const dayShiftType = typeof dayShift === 'object' ? dayShift?.shift_type : dayShift;
        if ((!dayShiftType || isOffShift(dayShiftType)) && d !== h.day) {
          suggestedOffDay = d;
          break;
        }
      }

      affectedHolidays.push({
        ...h,
        shiftCode: shiftType,
        isConsented,
        consentKey,
        suggestedOffDay: suggestedOffDay || (h.day > 15 ? h.day - 7 : h.day + 7),
        consentData: consentsMap[consentKey] || null
      });
    }
  });

  const pendingCount = affectedHolidays.filter(h => !h.isConsented).length;
  return {
    required: affectedHolidays.length > 0,
    holidays: affectedHolidays,
    pendingCount
  };
}

/**
 * 計算年度平帳總天數與借還淨額
 * @param {Array} plan - 12 個月之調移規劃陣列
 */
export function calculateAnnualBalance(plan) {
  const totalStatutory = plan.reduce((sum, item) => sum + (Number(item.statutoryOff) || 0), 0);
  const totalOffset = plan.reduce((sum, item) => sum + (Number(item.transferOffset) || 0), 0);
  const totalActual = plan.reduce((sum, item) => sum + (Number(item.actualOff) || 0), 0);
  const isBalanced = totalOffset === 0 && totalActual === totalStatutory;

  return {
    totalStatutory,
    totalOffset,
    totalActual,
    isBalanced
  };
}

/**
 * PT 計時人員國定假日 100% 雙薪時數獨立試算
 * 規範：PT 不適用國定假日調移免雙薪，凡於法定國定假日（逢六日依調動休假日算）實際出勤者，計算 100% 雙薪時數
 * 備註：此試算加註「（僅供參考，不代表最後數字）」
 */
export function calculatePtHolidayDoublePay({
  ptEmployees = [],
  yearMonth = '2026-09',
  scheduleMap = {},
  actualHoursMap = {}
}) {
  const monthHolidays = getHolidaysInMonth(yearMonth);
  const holidayDays = new Set(monthHolidays.map(h => h.day));

  // 逢週六日之國假，其調動或補休日亦納入計算
  const adjustedHolidayDays = new Set([...holidayDays]);
  monthHolidays.forEach(h => {
    const [y, m, d] = h.date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      const nextMon = dayOfWeek === 6 ? d + 2 : d + 1;
      if (nextMon <= 31) {
        adjustedHolidayDays.add(nextMon);
      }
    }
  });

  return ptEmployees.map(pt => {
    let doublePayHours = 0;
    const dutyDates = [];

    for (let d = 1; d <= 31; d++) {
      if (adjustedHolidayDays.has(d)) {
        const actualRec = actualHoursMap[pt.emp_id]?.[d];
        const schedShift = scheduleMap[pt.emp_id]?.[d];
        const shiftCode = schedShift?.shift_type;

        if (actualRec && Number(actualRec.actual_hours) > 0) {
          const hrs = Number(actualRec.actual_hours);
          doublePayHours += hrs;
          dutyDates.push({ day: d, hours: hrs, source: 'ACTUAL' });
        } else if (shiftCode && isWorkingShift(shiftCode)) {
          doublePayHours += 8;
          dutyDates.push({ day: d, hours: 8, source: 'SCHEDULE' });
        }
      }
    }

    return {
      emp_id: pt.emp_id,
      name: pt.name,
      primary_station: pt.primary_station,
      doublePayHours,
      dutyDates,
      disclaimer: '（僅供參考，不代表最後數字）'
    };
  });
}
