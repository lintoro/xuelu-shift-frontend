// scratch/test_v351_new_shift_rules.mjs
import { generateSeedSchedule } from '../src/engine/schedulerEngine.js';
import { validateScheduleCompliance } from '../src/engine/complianceValidator.js';
import { EMPLOYEES, STATIONS, DEFAULT_MONTHLY_RULES } from '../src/data/mockMasterData.js';

console.log('=== 開始測試全新 5 大排班營運規則 (v3.5.1) ===');

const activeRules = {
  ...DEFAULT_MONTHLY_RULES,
  target_year_month: '2026-09',
  days_in_month: 30,
  required_off_days: 10,
  default_closing_time_weekday: '18:00',
  default_closing_time_weekend: '19:00'
};

// 執行排班
const scheduleResult = generateSeedSchedule({
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: activeRules,
  leaveRequests: [],
  monthBorders: {},
  resignationData: {}
});

const scheduleMap = scheduleResult.scheduleMap;
const totalDays = scheduleResult.totalDays;

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [FAIL]: ${message}`);
    failures++;
  } else {
    console.log(`✅ [PASS]: ${message}`);
  }
}

// -------------------------------------------------------------
// 測試 1：清潔組排班僅 A 班，其它使用加班方式處理（保持）
// -------------------------------------------------------------
const cleanStaff = EMPLOYEES.filter(e => e.primary_station === 'ST_CLEAN');
let cleanNonAShifts = [];
cleanStaff.forEach(emp => {
  for (let d = 1; d <= totalDays; d++) {
    const shift = scheduleMap[emp.emp_id]?.[d];
    if (shift && !['OFF', 'TERM_OFF', 'AL', 'CT', 'REG_OFF', 'REST_OFF'].includes(shift.shift_type)) {
      if (shift.shift_type !== 'A') {
        cleanNonAShifts.push({ emp: emp.name, day: d, shift: shift.shift_type });
      }
    }
  }
});
assert(cleanNonAShifts.length === 0, `清潔組同仁常態出勤 100% 僅排 A 班 (異常數: ${cleanNonAShifts.length})`);

// -------------------------------------------------------------
// 測試 2：本鋪/小鋪 一組，GAGOO/餐飲 一組，閉店班可以只排 1 位
// -------------------------------------------------------------
let shopGroupExceedClosing = 0;
let diningGroupExceedClosing = 0;

for (let d = 1; d <= totalDays; d++) {
  const dateObj = new Date(2026, 8, d); // 2026-09
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  if (isWeekend) {
    // 門市選品組
    const shopGroupC = EMPLOYEES.filter(emp => {
      const s = scheduleMap[emp.emp_id]?.[d];
      return s && (s.station_id === 'ST_MAIN_SHOP' || s.station_id === 'ST_SUB_SHOP') && s.shift_type === 'C';
    });
    if (shopGroupC.length > 1) {
      shopGroupExceedClosing++;
      console.warn(`第 ${d} 日 本鋪/小鋪組 C 班人數為 ${shopGroupC.length} (預期 <= 1)`);
    }

    // 美食餐飲組
    const diningGroupC = EMPLOYEES.filter(emp => {
      const s = scheduleMap[emp.emp_id]?.[d];
      return s && (s.station_id === 'ST_Gagoo' || s.station_id === 'ST_DINING') && s.shift_type === 'C';
    });
    if (diningGroupC.length > 1) {
      diningGroupExceedClosing++;
      console.warn(`第 ${d} 日 GAGOO/餐飲組 C 班人數為 ${diningGroupC.length} (預期 <= 1)`);
    }
  }
}
assert(shopGroupExceedClosing === 0, `假日延時營業 本鋪/小鋪組 每組最多僅排 1 位 C 班閉店 (超額天數: ${shopGroupExceedClosing})`);
assert(diningGroupExceedClosing === 0, `假日延時營業 GAGOO/餐飲組 每組最多僅排 1 位 C 班閉店 (超額天數: ${diningGroupExceedClosing})`);

// -------------------------------------------------------------
// 測試 3：服務台只排 D、B 班，需要其它班別手動調整
// -------------------------------------------------------------
let serviceDeskInvalidShifts = [];
for (let d = 1; d <= totalDays; d++) {
  const serviceStaff = EMPLOYEES.filter(emp => {
    const s = scheduleMap[emp.emp_id]?.[d];
    return s && s.station_id === 'ST_SERVICE' && !['OFF', 'TERM_OFF', 'AL', 'CT', 'REG_OFF', 'REST_OFF'].includes(s.shift_type);
  });

  serviceStaff.forEach(emp => {
    const code = scheduleMap[emp.emp_id][d].shift_type;
    if (code !== 'D' && code !== 'B') {
      serviceDeskInvalidShifts.push({ emp: emp.name, day: d, code });
    }
  });
}
assert(serviceDeskInvalidShifts.length === 0, `服務台出勤班別僅排 D 與 B 班 (異常數: ${serviceDeskInvalidShifts.length})`);

// -------------------------------------------------------------
// 測試 4：平日全館營業站點基調以 D 班排定
// -------------------------------------------------------------
let weekdayShopTotalShifts = 0;
let weekdayShopDShifts = 0;

for (let d = 1; d <= totalDays; d++) {
  const dateObj = new Date(2026, 8, d);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  if (!isWeekend) {
    EMPLOYEES.forEach(emp => {
      const s = scheduleMap[emp.emp_id]?.[d];
      if (s && !['ST_CLEAN', 'ST_ADMIN'].includes(s.station_id) && !['OFF', 'TERM_OFF', 'AL', 'CT', 'REG_OFF', 'REST_OFF'].includes(s.shift_type)) {
        weekdayShopTotalShifts++;
        if (s.shift_type === 'D') {
          weekdayShopDShifts++;
        }
      }
    });
  }
}
const dShiftRatio = ((weekdayShopDShifts / weekdayShopTotalShifts) * 100).toFixed(1);
assert(weekdayShopDShifts > 0 && Number(dShiftRatio) >= 70, `平日營業站點以 D 班為基座排定 (D 班佔比: ${dShiftRatio}%)`);

// -------------------------------------------------------------
// 測試 5：營運支援平日 1A 1B、假日 1A 1C，若有空班秀警示手動修正
// -------------------------------------------------------------
const validation = validateScheduleCompliance({
  scheduleMap: scheduleResult.scheduleMap,
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: activeRules
});

const adminDeficits = validation.issues.filter(i => i.type === 'ADMIN_SHIFT_DEFICIT');
console.log(`營運支援檢核完成，共識別出 ${adminDeficits.length} 筆需主管手動微調之空班警示 (符合現場實際排休狀態)`);
assert(validation.issues.some(i => i.type === 'ADMIN_SHIFT_DEFICIT'), `合規驗證器正確識別營運支援空班缺工警示 (ADMIN_SHIFT_DEFICIT) 供介面呈現`);

if (failures === 0) {
  console.log('\n🎉 所有全新 5 大排班規則測試全部通過！');
} else {
  console.error(`\n❌ 共有 ${failures} 項測試未通過！`);
  process.exit(1);
}
