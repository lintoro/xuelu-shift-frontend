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
    { month: 11, name: '11 月', statutoryOff: 9, transferOffset: 2, actualOff: 11, note: '春節還假第二檔 (+2天)' },
    { month: 12, name: '12 月', statutoryOff: 8, transferOffset: 2, actualOff: 10, note: '暑期與國慶還假 (+2天)' }
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
export function checkEmployeeHolidayConsent({ empId, yearMonth = '2026-09', scheduleMap = {}, consentsMap = {}, isPt = false }) {
  // 勞基法核心原則：PT 計時人員不適用國定假日調移免雙薪協議 (凡出勤依法直接計給雙薪)
  if (isPt) {
    return { required: false, holidays: [], pendingCount: 0 };
  }

  const monthHolidays = getHolidaysInMonth(yearMonth);
  if (!monthHolidays.length) {
    return { required: false, holidays: [], pendingCount: 0 };
  }

  const empSchedule = scheduleMap[empId] || {};
  const affectedHolidays = [];
  const usedOffDays = new Set();

  monthHolidays.forEach(h => {
    const shift = empSchedule[h.day];
    const shiftType = typeof shift === 'object' ? shift?.shift_type : shift;
    // 若該國定假日排定出勤班別（非休假且非空）
    if (shiftType && isWorkingShift(shiftType)) {
      const consentKey = `${yearMonth}_${h.day}_${empId}`;
      const isConsented = !!consentsMap[consentKey];
      
      // 一對一尋找當月對應的「國」或專屬休假日
      let suggestedOffDay = null;

      // 優先 1：尋找班表上明確標註為該國假調移 (HOLIDAY_OFF) 且 transferredFromDay 吻合之休假
      for (let d = 1; d <= 31; d++) {
        if (usedOffDays.has(d) || d === h.day) continue;
        const dayShift = empSchedule[d];
        if (typeof dayShift === 'object' && dayShift?.shift_type === 'HOLIDAY_OFF' && dayShift?.transferredFromDay === h.day) {
          suggestedOffDay = d;
          break;
        }
      }

      // 優先 2：尋找班表上任何尚未被其他國假綁定的 HOLIDAY_OFF (國) 休假日
      if (!suggestedOffDay) {
        for (let d = 1; d <= 31; d++) {
          if (usedOffDays.has(d) || d === h.day) continue;
          const dayShift = empSchedule[d];
          const dType = typeof dayShift === 'object' ? dayShift?.shift_type : dayShift;
          if (dType === 'HOLIDAY_OFF') {
            suggestedOffDay = d;
            break;
          }
        }
      }

      // 優先 3：若班表未定性出 HOLIDAY_OFF，尋找尚未被佔用的休息日 REST_OFF 或一般 OFF (按距離最近排序)
      if (!suggestedOffDay) {
        const candidates = [];
        for (let d = 1; d <= 31; d++) {
          if (usedOffDays.has(d) || d === h.day) continue;
          const dayShift = empSchedule[d];
          const dType = typeof dayShift === 'object' ? dayShift?.shift_type : dayShift;
          if (!dType || isOffShift(dType)) {
            candidates.push(d);
          }
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => Math.abs(a - h.day) - Math.abs(b - h.day));
          suggestedOffDay = candidates[0];
        }
      }

      if (suggestedOffDay) {
        usedOffDays.add(suggestedOffDay);
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
 * 依據年月動態取得該月份的調移後應排休假總天數 (若查無調移計畫則以曆法週六日計算)
 * @param {string} yearMonth - 格式如 '2026-11'
 * @returns {number} 該月應休天數
 */
export function getMonthActualOffDays(yearMonth) {
  if (!yearMonth) return 10;
  const [yearStr, monthStr] = String(yearMonth).split('-');
  const monthNum = Number(monthStr);
  const plan = ANNUAL_HOLIDAY_PLANS[yearStr];
  if (plan) {
    const item = plan.find(m => m.month === monthNum);
    if (item && item.actualOff) return Number(item.actualOff);
  }
  // 曆法 fallback: 計算該月週六與週日總天數
  const year = Number(yearStr);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  let weekends = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, monthNum - 1, d).getDay();
    if (dow === 0 || dow === 6) weekends++;
  }
  return weekends || 10;
}

/**
 * 取得指定月份真正生效之 PT 國定假日雙薪日期列表 (遵循補假替換制)
 * 核心原則：
 * 1. 逢平日 (週一至週五)：以國定假日當日為雙薪日。
 * 2. 逢週六：依法調整至前一個工作日 (週五) 放假，故以週五為唯一生效雙薪日，週六回歸常態例休不計雙薪。
 * 3. 逢週日：依法調整至次一個工作日 (週一) 放假，故以週一為唯一生效雙薪日，週日回歸常態例休不計雙薪。
 * 4. 杜絕重複計算，國假逢六日者原日絕對不計雙薪。
 * @param {string} yearMonth - '2026-02'
 * @returns {Map<number, Object>} key: 生效日數 (如 27), value: { originHoliday: Object, adjustedDay: number, adjustedDate: string }
 */
export function getEffectiveDoublePayHolidays(yearMonth) {
  const [yearStr, monthStr] = String(yearMonth).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const allHolidays = dynamicHolidaysRegistry;
  const effectiveMap = new Map();

  allHolidays.forEach(h => {
    if (!h.date) return;
    const [hYear, hMonth, hDay] = h.date.split('-').map(Number);
    const hDateObj = new Date(hYear, hMonth - 1, hDay);
    const dayOfWeek = hDateObj.getDay(); // 0: Sun, 6: Sat

    let effDateObj = new Date(hDateObj);
    let isAdjusted = false;

    if (dayOfWeek === 6) {
      // 逢週六：調整至前一日週五放假
      effDateObj.setDate(effDateObj.getDate() - 1);
      isAdjusted = true;
    } else if (dayOfWeek === 0) {
      // 逢週日：調整至次一日週一放假
      effDateObj.setDate(effDateObj.getDate() + 1);
      isAdjusted = true;
    }

    const effYear = effDateObj.getFullYear();
    const effMonth = effDateObj.getMonth() + 1;
    const effDay = effDateObj.getDate();
    const effDateStr = `${effYear}-${String(effMonth).padStart(2, '0')}-${String(effDay).padStart(2, '0')}`;

    // 若調整生效放假日落在查詢年月
    if (effYear === year && effMonth === month) {
      effectiveMap.set(effDay, {
        originHoliday: h,
        originDate: h.date,
        originDay: hDay,
        originDayOfWeek: dayOfWeek,
        isAdjusted,
        effectiveDay: effDay,
        effectiveDate: effDateStr,
        name: isAdjusted ? `${h.name} (調整放假)` : h.name
      });
    }
  });

  return effectiveMap;
}

/**
 * PT 計時人員國定假日 100% 雙薪時數獨立試算
 * 規範：PT 不適用國定假日調移免雙薪，凡於調整放假之生效日實際出勤者，計算 100% 雙薪時數（逢六日原日不計）
 * 備註：此試算加註「（僅供參考，不代表最後數字）」
 */
export function calculatePtHolidayDoublePay({
  ptEmployees = [],
  yearMonth = '2026-09',
  scheduleMap = {},
  actualHoursMap = {}
}) {
  const effectiveHolidayMap = getEffectiveDoublePayHolidays(yearMonth);

  return ptEmployees.map(pt => {
    let doublePayHours = 0;
    const dutyDates = [];

    // 依當月真正生效之調整放假雙薪日進行檢核
    effectiveHolidayMap.forEach((effInfo, day) => {
      const actualRec = actualHoursMap[pt.emp_id]?.[day];
      const schedShift = scheduleMap[pt.emp_id]?.[day];
      const shiftCode = schedShift?.shift_type;

      if (actualRec && Number(actualRec.actual_hours) > 0) {
        const hrs = Number(actualRec.actual_hours);
        doublePayHours += hrs;
        dutyDates.push({
          day,
          date: effInfo.effectiveDate,
          holidayName: effInfo.name,
          originHoliday: effInfo.originHoliday,
          hours: hrs,
          source: 'ACTUAL'
        });
      } else if (shiftCode && isWorkingShift(shiftCode)) {
        const hrs = schedShift?.work_hours || 8;
        doublePayHours += hrs;
        dutyDates.push({
          day,
          date: effInfo.effectiveDate,
          holidayName: effInfo.name,
          originHoliday: effInfo.originHoliday,
          hours: hrs,
          source: 'SCHEDULE'
        });
      }
    });

    // 依日期排序
    dutyDates.sort((a, b) => a.day - b.day);

    return {
      emp_id: pt.emp_id,
      name: pt.name,
      primary_station: pt.primary_station,
      doublePayHours,
      dutyDates,
      disclaimer: '（依法按調整放假出勤時數加發 100% 雙倍工資，僅供參考，不代表最後數字）'
    };
  });
}
