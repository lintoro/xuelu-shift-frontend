import assert from 'assert';
import { STATIONS, DEFAULT_MONTHLY_RULES, EMPLOYEES } from '../src/data/mockMasterData.js';
import { generateSeedSchedule } from '../src/engine/schedulerEngine.js';

console.log('🧪 Starting v3.5.0 Unit Tests...');

// 1. 測試方洲算理：STATIONS 設定
console.log('1. Checking Station Closing Shift attributes:');
const infoDesk = STATIONS.find(s => s.station_id === 'ST_SERVICE');
const giftShop = STATIONS.find(s => s.station_id === 'ST_MAIN_SHOP');
const cleanStation = STATIONS.find(s => s.station_id === 'ST_CLEAN');
const handsOn = STATIONS.find(s => s.station_id === 'ST_EXPERIENCE');

assert.strictEqual(infoDesk.requires_closing_shift, true, '服務台必須設為有閉店班');
assert.strictEqual(giftShop.requires_closing_shift, true, '本鋪收銀必須設為有閉店班');
assert.strictEqual(cleanStation.requires_closing_shift, true, '清潔組必須設為有閉店班');
assert.strictEqual(handsOn.requires_closing_shift, false, '體驗DIY站點平日/假日皆無閉店班');
console.log('✅ Station attributes verified.');

// 2. 測試排班引擎方洲算理：平日 18:00 不排 C 班，假日延時排 C 班
console.log('2. Testing Scheduler Engine Fangzhou Logic...');
const rules = {
  ...DEFAULT_MONTHLY_RULES,
  target_year_month: '2026-09',
  days_in_month: 30,
  default_closing_time_weekday: '18:00',
  default_closing_time_weekend: '19:00',
  special_closing_dates: {
    '2026-09-02': '19:00' // 週三特殊延時
  }
};

const result = generateSeedSchedule({
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: rules,
  leaveRequests: []
});

assert.ok(result.scheduleMap, '排班計算必須產出 scheduleMap');
const { scheduleMap } = result;

// 檢查 Day 1（2026-09-01 週二，常態平日，18:00 閉店）
let day1_C_shifts = 0;
EMPLOYEES.forEach(emp => {
  const shift = scheduleMap[emp.emp_id]?.[1];
  if (shift && shift.shift_type === 'C') {
    day1_C_shifts++;
  }
});
console.log(`Day 1 (2026-09-01 Weekday 18:00) C-shifts count: ${day1_C_shifts}`);
assert.strictEqual(day1_C_shifts, 0, '平日 18:00 閉店時，全館不得排 C 班！');

// 檢查 Day 5（2026-09-05 週六，假日 19:00 閉店）
let day5_C_shifts = 0;
EMPLOYEES.forEach(emp => {
  const shift = scheduleMap[emp.emp_id]?.[5];
  if (shift && shift.shift_type === 'C') {
    day5_C_shifts++;
    const st = STATIONS.find(s => s.station_id === shift.station_id);
    assert.strictEqual(st?.requires_closing_shift, true, `站點 ${shift.station_id} 排了 C 班但未設定 requires_closing_shift`);
  }
});
console.log(`Day 5 (2026-09-05 Weekend 19:00) C-shifts count: ${day5_C_shifts}`);
assert.ok(day5_C_shifts > 0, '假日 19:00 延時閉店時，具備閉店需求的站點應排 C 班！');

// 檢查 Day 2（2026-09-02 週三，特殊延時 19:00 閉店）
let day2_C_shifts = 0;
EMPLOYEES.forEach(emp => {
  const shift = scheduleMap[emp.emp_id]?.[2];
  if (shift && shift.shift_type === 'C') {
    day2_C_shifts++;
    const st = STATIONS.find(s => s.station_id === shift.station_id);
    assert.strictEqual(st?.requires_closing_shift, true, `站點 ${shift.station_id} 排了 C 班但未設定 requires_closing_shift`);
  }
});
console.log(`Day 2 (2026-09-02 Special Weekday 19:00) C-shifts count: ${day2_C_shifts}`);
assert.ok(day2_C_shifts > 0, '特殊延時平日應依延時規則指派 C 班！');

console.log('✅ Fangzhou Solver closing shift logic passed all assertions!');
