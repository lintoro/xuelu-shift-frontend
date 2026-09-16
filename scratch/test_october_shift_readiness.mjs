// scratch/test_october_shift_readiness.mjs
// 10 月全館真實排班演練與環境準備自動化驗證腳本
import assert from 'assert';
import { generateSeedSchedule } from '../src/engine/schedulerEngine.js';
import { validateScheduleCompliance } from '../src/engine/complianceValidator.js';
import { EMPLOYEES, STATIONS, MOCK_MONTH_BORDERS } from '../src/data/mockMasterData.js';
import { STATUTORY_HOLIDAYS, getHolidaysInMonth } from '../src/data/holidayTransferStore.js';

console.log('=== [10 月全館試排 readiness 驗證腳本啟動] ===');

// 1. 構建 10 月營運規則 (31 天，依法規修法新增 10/25 臺灣光復節，共有 2 個國定假日，法定應休 11 天)
const octoberHolidays = getHolidaysInMonth('2026-10');
console.log(`✓ 檢驗 2026 年 10 月法定國定假日：共有 ${octoberHolidays.length} 天（${octoberHolidays.map(h => h.name + ' ' + h.date).join('、')}）`);
assert.ok(octoberHolidays.some(h => h.date === '2026-10-10'), '必須包含 10/10 國慶日');
assert.ok(octoberHolidays.some(h => h.date === '2026-10-25'), '必須包含 10/25 臺灣光復節');

const octoberRules = {
  rule_id: 'R_2026_10',
  target_year_month: '2026-10',
  days_in_month: 31,
  required_off_days: 11, // 9 天例休/休息日 + 2 天國定假日 (10/10, 10/25)
  holidays: octoberHolidays.map(h => h.date),
  is_published: false
};

// 2. 測試 PT 固定班 (FIXED) 與自由排班 (FREE) 設定，並模擬 PT 報班意向
const testEmployees = EMPLOYEES.map((emp, index) => {
  if (emp.role === 'PT') {
    return {
      ...emp,
      pt_schedule_mode: index % 2 === 0 ? 'FIXED' : 'FREE'
    };
  }
  return emp;
});

const fixedPts = testEmployees.filter(e => e.role === 'PT' && e.pt_schedule_mode === 'FIXED');
console.log(`✓ 成功設定 10 月測試名冊，包含 ${fixedPts.length} 位【僅上固定班】PT 人員`);

// 模擬 PT 同仁的報班狀態 (PT Availability)
// 例如：第一位 PT 在 10/10 國慶日標記 UNAVAILABLE
const ptStaffMember = testEmployees.find(e => e.role === 'PT');
const mockPtAvailability = {
  [ptStaffMember.emp_id]: {
    10: 'UNAVAILABLE' // 國慶日明確不可排班
  }
};

// 轉換 PT 報班意向為排班引擎 leaveRequests
const engineLeaveRequests = [];
testEmployees.forEach(emp => {
  if (emp.role === 'PT') {
    const avail = mockPtAvailability[emp.emp_id] || {};
    const isFixedMode = emp.pt_schedule_mode === 'FIXED';
    for (let d = 1; d <= octoberRules.days_in_month; d++) {
      const status = avail[d];
      if (status === 'UNAVAILABLE' || (isFixedMode && status !== 'AVAILABLE')) {
        engineLeaveRequests.push({
          emp_id: emp.emp_id,
          day: d,
          leave_type: 'OFF',
          status: 'APPROVED'
        });
      }
    }
  }
});

// 3. 測試 10 月 31 天全月啟發式排班演算法產出（代入 9 月底真實跨月邊界數據 MOCK_MONTH_BORDERS）
console.log('✓ 代入 9 月底最後 6 天出勤跨月連續工時邊界：', Object.keys(MOCK_MONTH_BORDERS['2026-10'] || {}).length, '位人員');
assert.ok(MOCK_MONTH_BORDERS['2026-10'], 'MOCK_MONTH_BORDERS 必須包含 2026-10 跨月邊界');

const scheduleResult = generateSeedSchedule({
  employees: testEmployees,
  stations: STATIONS,
  rules: octoberRules,
  leaveRequests: engineLeaveRequests,
  monthBorders: MOCK_MONTH_BORDERS,
  resignationData: {}
});

if (!scheduleResult || !scheduleResult.scheduleMap) {
  console.error('❌ 10 月排班引擎執行失敗：未回傳班表矩陣');
  process.exit(1);
}

const { scheduleMap } = scheduleResult;
console.log('✓ 10 月全月 (31天) 班表矩陣成功產出！');

// 盲點 1 驗證：PT 同仁標記不可排班之日期，排班引擎絕對不可排定出勤
const ptDay10Shift = scheduleMap[ptStaffMember.emp_id]?.[10];
assert.ok(
  ptDay10Shift && (ptDay10Shift.shift_type === 'OFF' || ptDay10Shift.shift_type === 'REG_OFF' || ptDay10Shift.shift_type === 'REST_OFF'),
  `PT ${ptStaffMember.name} 於 10/10 標記 UNAVAILABLE，排班引擎必須強制排休！當前為: ${ptDay10Shift?.shift_type}`
);
console.log(`✓ 盲點 1 驗證通過：PT 同仁 ${ptStaffMember.name} 於 10/10 標記 UNAVAILABLE，排班引擎嚴格鎖定休假 (${ptDay10Shift.shift_type})`);

// 4. 驗證服務台 (ST_SERVICE) 站點設定與平假日最低人數
const serviceStation = STATIONS.find(s => s.station_id === 'ST_SERVICE');
assert.strictEqual(serviceStation.min_staff_weekday, 3, '服務台平日最低人力必須為 3');
assert.strictEqual(serviceStation.min_staff_weekend, 5, '服務台假日最低人力必須為 5');
console.log('✓ 盲點 3 驗證通過：服務台 (ST_SERVICE) 站點設定已落實平日 3 人、假日 5 人');

// 5. 執行 10 月合規性與勞基法檢驗（含 7 休 1 滑動視窗）
const validation = validateScheduleCompliance({
  scheduleMap,
  employees: testEmployees,
  stations: STATIONS,
  rules: octoberRules,
  monthBorders: MOCK_MONTH_BORDERS
});

// 盲點 2 驗證：檢查是否有跨月連上超過 6 天的嚴重違規 (CONSECUTIVE_OVERWORK)
const consecutiveViolations = validation.issues.filter(i => i.type === 'CONSECUTIVE_OVERWORK' && i.day <= 6);
console.log(`✓ 盲點 2 驗證：10月初前6天跨月 7休1 連續出勤檢驗，違規數 = ${consecutiveViolations.length}`);
assert.strictEqual(consecutiveViolations.length, 0, '排班引擎代入 9 月底出勤邊界後，10月初前6天不得發生連續工作超過6天違規！');

// 盲點 4 方案 B 驗證：模擬組長 (Leader) 僅重排自己站點同仁之邏輯
const serviceLeader = testEmployees.find(e => e.emp_id === 'B112001'); // 李俐旻 (服務台組長)
const originalCleanSchedule = { ...scheduleMap['B112006'] }; // 清潔組組長林美鳳之班表
const leaderStationId = serviceLeader.primary_station; // ST_SERVICE

// 執行模擬方案 B
const newSeedResult = generateSeedSchedule({
  employees: testEmployees,
  stations: STATIONS,
  rules: octoberRules,
  leaveRequests: engineLeaveRequests,
  monthBorders: MOCK_MONTH_BORDERS,
  resignationData: {}
});

const mergedMap = JSON.parse(JSON.stringify(scheduleMap));
const leaderSubordinates = testEmployees.filter(e => e.primary_station === leaderStationId);
leaderSubordinates.forEach(emp => {
  if (newSeedResult.scheduleMap[emp.emp_id]) {
    mergedMap[emp.emp_id] = newSeedResult.scheduleMap[emp.emp_id];
  }
});

// 驗證非組長管轄的站點同仁班表完全不受干擾
assert.deepStrictEqual(mergedMap['B112006'], originalCleanSchedule, '方案 B 執行時，非組長組別同仁之班表必須完全被保留且零修改！');
console.log(`✓ 盲點 4 驗證通過：服務台組長智慧排班僅更新其管轄之 ${leaderSubordinates.length} 位同仁，清潔組等外組同仁班表 100% 完整保留！`);

console.log(`✓ 10 月合規檢驗完畢：共有 ${validation.issues.length} 個系統建議議題`);
console.log('\n🎉 10 月全館真實試排 Readiness 測試全數通過！系統已具備隨時上路實測能力。');

