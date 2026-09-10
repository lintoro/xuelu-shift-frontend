// scratch/test_holiday_consent_and_login.mjs
import assert from 'assert';
import { 
  ANNUAL_HOLIDAY_PLANS, 
  STATUTORY_HOLIDAYS, 
  calculateAnnualBalance,
  getHolidaysInMonth,
  isStatutoryHoliday,
  checkEmployeeHolidayConsent 
} from '../src/data/holidayTransferStore.js';

console.log('🧪 開始執行【登入正式化、國假動態平帳與出勤同意機制】自動化測試...\n');

// 測試 1: 全年度法定放假天數動態加總與平帳演算法（不限 120 天）
console.log('▶ 測試 1: 全年度法定放假天數動態加總平帳檢驗');
{
  const plan2026 = ANNUAL_HOLIDAY_PLANS['2026'];
  const balance2026 = calculateAnnualBalance(plan2026);

  assert.strictEqual(balance2026.totalStatutory, 120, '2026 年度法定應休總天數應為 120 天');
  assert.strictEqual(balance2026.totalOffset, 0, '2026 年度調移淨額應為 0 天完全平帳');
  assert.strictEqual(balance2026.totalActual, 120, '2026 年度實排總天數應為 120 天');
  assert.strictEqual(balance2026.isBalanced, true, '2026 年度應判定為完全平帳放行');

  // 測試 2027 年度或非 120 天之情境 (例如法定 116 天)
  const mockPlan116 = [
    { month: 1, statutoryOff: 10, transferOffset: 0, actualOff: 10 },
    { month: 2, statutoryOff: 14, transferOffset: -4, actualOff: 10 },
    { month: 3, statutoryOff: 8, transferOffset: 2, actualOff: 10 },
    { month: 4, statutoryOff: 9, transferOffset: 0, actualOff: 9 },
    { month: 5, statutoryOff: 10, transferOffset: 0, actualOff: 10 },
    { month: 6, statutoryOff: 9, transferOffset: 1, actualOff: 10 },
    { month: 7, statutoryOff: 9, transferOffset: 0, actualOff: 9 },
    { month: 8, statutoryOff: 10, transferOffset: -1, actualOff: 9 },
    { month: 9, statutoryOff: 9, transferOffset: 0, actualOff: 9 },
    { month: 10, statutoryOff: 10, transferOffset: -1, actualOff: 9 },
    { month: 11, statutoryOff: 9, transferOffset: 1, actualOff: 10 },
    { month: 12, statutoryOff: 9, transferOffset: 2, actualOff: 11 }
  ];
  const balance116 = calculateAnnualBalance(mockPlan116);
  assert.strictEqual(balance116.totalStatutory, 116, '動態年度法定總天數應為 116 天');
  assert.strictEqual(balance116.totalOffset, 0, '動態年度調移淨額應為 0');
  assert.strictEqual(balance116.totalActual, 116, '動態年度實排天數應為 116 天');
  assert.strictEqual(balance116.isBalanced, true, '非 120 天時只要無淨額偏差依然應判定為完全平帳！');

  // 測試不平帳偏差警告
  const mockImbalanced = [
    { month: 1, statutoryOff: 10, transferOffset: 2, actualOff: 12 }, // 多排 2 天未還
    { month: 2, statutoryOff: 10, transferOffset: 0, actualOff: 10 }
  ];
  const balanceImbalanced = calculateAnnualBalance(mockImbalanced);
  assert.strictEqual(balanceImbalanced.isBalanced, false, '有借還淨額偏差時應正確判定為不平帳！');
  assert.strictEqual(balanceImbalanced.totalOffset, 2, '偏移量應精準計算為 +2 天');

  console.log('  ✓ 全年度法定天數動態加總平帳演算法 100% 正確！\n');
}

// 測試 2: 法定國定假日日期檢驗 (中秋、國慶、元旦、春節)
console.log('▶ 測試 2: 法定國定假日查詢與判定檢驗');
{
  const sep2026Holidays = getHolidaysInMonth('2026-09');
  assert.strictEqual(sep2026Holidays.length, 1, '2026 年 9 月份應包含 1 個國定假日 (中秋節)');
  assert.strictEqual(sep2026Holidays[0].day, 25, '2026 年中秋節應為 9 月 25 日');
  assert.strictEqual(sep2026Holidays[0].name, '中秋節');

  const oct2026Holidays = getHolidaysInMonth('2026-10');
  assert.strictEqual(oct2026Holidays.length, 1, '2026 年 10 月份應包含 1 個國定假日 (國慶日)');
  assert.strictEqual(oct2026Holidays[0].day, 10, '國慶日應為 10 月 10 日');

  const checkMidAutumn = isStatutoryHoliday('2026-09-25');
  assert.ok(checkMidAutumn, 'isStatutoryHoliday 應正確識別 2026-09-25 為中秋節');

  const checkNormalDay = isStatutoryHoliday('2026-09-26');
  assert.strictEqual(checkNormalDay, null, '2026-09-26 非國定假日應回傳 null');

  console.log('  ✓ 法定國定假日查詢與日期比對 100% 正確！\n');
}

// 測試 3: 同仁國定假日出勤調移同意簽署資格檢核
console.log('▶ 測試 3: 國假出勤調移同意簽認檢驗（服務業免雙薪法律閉環）');
{
  // 情境 A: 李俐旻在 9/25 中秋節排定 B 班出勤
  const mockSchedule = {
    'B112001': {
      1: 'OFF',
      25: 'B',   // 中秋節當天出勤
      28: 'OFF'  // 指定調移休假日
    },
    'B113089': {
      1: 'B',
      25: 'OFF', // 中秋節當天本來就休假
      28: 'B'
    }
  };

  // 1. 李俐旻在 9/25 出勤，尚未簽署
  const consentA1 = checkEmployeeHolidayConsent({
    empId: 'B112001',
    yearMonth: '2026-09',
    scheduleMap: mockSchedule,
    consentsMap: {}
  });

  assert.strictEqual(consentA1.required, true, '國假當天有排上班之同仁應標記為必須簽認同意書');
  assert.strictEqual(consentA1.pendingCount, 1, '尚未簽署前待簽認數量應為 1');
  assert.strictEqual(consentA1.holidays[0].name, '中秋節');
  assert.strictEqual(consentA1.holidays[0].shiftCode, 'B');
  assert.strictEqual(consentA1.holidays[0].suggestedOffDay, 1, '應自動比對出最近之休假 OFF 日作為調移指定日');

  // 2. 李俐旻完成簽署
  const consentKey = consentA1.holidays[0].consentKey;
  const mockConsentsMap = {
    [consentKey]: {
      emp_id: 'B112001',
      holiday_name: '中秋節',
      holiday_date: '2026-09-25',
      transferred_off_date: '2026-09-01',
      signed_at: '2026-09-10 22:30:00'
    }
  };

  const consentA2 = checkEmployeeHolidayConsent({
    empId: 'B112001',
    yearMonth: '2026-09',
    scheduleMap: mockSchedule,
    consentsMap: mockConsentsMap
  });
  assert.strictEqual(consentA2.required, true);
  assert.strictEqual(consentA2.pendingCount, 0, '簽署完成後待簽認數量應為 0');
  assert.strictEqual(consentA2.holidays[0].isConsented, true, '應標記為已簽認');

  // 情境 B: 張舒扉在 9/25 中秋節排定休假 (OFF)，無出勤
  const consentB = checkEmployeeHolidayConsent({
    empId: 'B113089',
    yearMonth: '2026-09',
    scheduleMap: mockSchedule,
    consentsMap: {}
  });
  assert.strictEqual(consentB.required, false, '國假當天排休假之同仁無須簽署調移出勤同意書，精準排除！');

  console.log('  ✓ 國定假日出勤調移同仁精準判定與免雙薪簽署閉環 100% 正確！\n');
}

console.log('🎉 所有【登入正式化、國假動態平帳與出勤同意機制】自動化測試全數通過！\n');
