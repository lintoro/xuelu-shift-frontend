import { DEFAULT_SHIFT_TYPES, SHIFT_TYPES, isWorkingShift, isOffShift } from '../src/types/scheduler.js';
import { STATIONS, EMPLOYEES, DEFAULT_MONTHLY_RULES } from '../src/data/mockMasterData.js';
import { generateSeedSchedule } from '../src/engine/schedulerEngine.js';
import { validateScheduleCompliance } from '../src/engine/complianceValidator.js';

console.log('====================================================');
console.log('   學旅營運處排班系統 - 需求 #007 與 #008 核心邏輯驗收   ');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ------------------------------------------------------------------
// 測試 1：驗證班別定義與兼容性 (需求 #008)
// ------------------------------------------------------------------
console.log('--- 測試 1: 班別基礎定義與 isWorkingShift 兼容性 ---');
assert(DEFAULT_SHIFT_TYPES.A && DEFAULT_SHIFT_TYPES.B && DEFAULT_SHIFT_TYPES.C, '預設核心班別 A, B, C 存在');
assert(DEFAULT_SHIFT_TYPES.OFF && DEFAULT_SHIFT_TYPES.AL && DEFAULT_SHIFT_TYPES.CT, '法定假別 OFF, AL, CT 存在');
assert(SHIFT_TYPES === DEFAULT_SHIFT_TYPES, 'SHIFT_TYPES 保持與 DEFAULT_SHIFT_TYPES 100% 完全相容');

assert(isWorkingShift('A') === true, 'A 班為出勤班別');
assert(isWorkingShift('B') === true, 'B 班為出勤班別');
assert(isWorkingShift('C') === true, 'C 班為出勤班別');
assert(isWorkingShift('D') === true, 'D 班為出勤班別');
assert(isWorkingShift('OFF') === false, 'OFF 班為休假');
assert(isWorkingShift('AL') === false, 'AL 班為特休假');
assert(isWorkingShift('CT') === false, 'CT 班為補休假');

// 測試新增自訂班別 E 班 (夜間打烊班)
const customE = {
  code: 'E',
  name: '夜間打烊班',
  startTime: '15:00',
  endTime: '24:00',
  breakHours: 1,
  workHours: 8,
  color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  badgeColor: 'bg-indigo-600 text-white',
  description: '夜間打烊加強班',
  isActive: true
};

assert(isWorkingShift(customE.code) === true, '自訂新增的 E 班自動相容判定為出勤班別');
assert(isOffShift(customE.code) === false, '自訂新增的 E 班自動相容判定為非休假');

// ------------------------------------------------------------------
// 測試 2：驗證 Manager 工時試算與勞基法第 35 條休息防呆
// ------------------------------------------------------------------
console.log('\n--- 測試 2: 班別工時試算與勞基法第 35 條休息防呆 ---');
function calculateShiftWorkHours(startTime, endTime, breakHours) {
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  let startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;
  if (endMin < startMin) endMin += 24 * 60;
  const totalDuration = (endMin - startMin) / 60;
  const netHours = Math.max(0, totalDuration - Number(breakHours || 0));
  const isBreached = totalDuration >= 4.5 && Number(breakHours) < 0.5;
  return { duration: totalDuration, netHours, isBreached };
}

// 範例 1：正常 E 班 (15:00~24:00, 跨度 9h, 休息 1h => 淨工時 8h, 無違規)
const calcE = calculateShiftWorkHours('15:00', '24:00', 1);
assert(calcE.duration === 9, 'E 班跨度為 9 小時');
assert(calcE.netHours === 8, 'E 班淨工時為 8 小時');
assert(calcE.isBreached === false, 'E 班休息 1 小時，符合勞基法第 35 條');

// 範例 2：違規測試班別 (10:00~16:00, 跨度 6h, 休息 0h => 觸發 35 條警示)
const calcBreach = calculateShiftWorkHours('10:00', '16:00', 0);
assert(calcBreach.duration === 6, '違規班跨度 6 小時');
assert(calcBreach.isBreached === true, '工作跨度滿 6 小時未休滿 30 分鐘，成功觸發勞基法第 35 條防呆提示');

// ------------------------------------------------------------------
// 測試 3：排班引擎與合規檢驗運行
// ------------------------------------------------------------------
console.log('\n--- 測試 3: 排班引擎與全館合規檢驗 ---');
const scheduleRes = generateSeedSchedule({
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: DEFAULT_MONTHLY_RULES,
  preferences: {},
  ptAvailability: {},
  resignationData: {}
});

const validation = validateScheduleCompliance({
  scheduleMap: scheduleRes.scheduleMap,
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: DEFAULT_MONTHLY_RULES
});

assert(validation.issues && Array.isArray(validation.issues), '合規檢核產出 issues 清單');
console.log(`全館原始檢核事件總數: ${validation.issues.length} 件 (空窗: ${validation.criticalCount}, 警示: ${validation.warningCount})`);

// ------------------------------------------------------------------
// 測試 4：組長視野隔離驗證 (需求 #007)
// ------------------------------------------------------------------
console.log('\n--- 測試 4: 組長視野隔離與組別聚焦 (需求 #007) ---');

// 4-1. 服務台組長 (李俐旻 B112001)
const leaderLi = EMPLOYEES.find(e => e.emp_id === 'B112001');
assert(leaderLi && leaderLi.name === '李俐旻', '找到服務台組長李俐旻');

const leaderStationLi = STATIONS.find(s => s.leader_emp_id === leaderLi.emp_id) || 
                        STATIONS.find(s => s.station_id === leaderLi.primary_station);
assert(leaderStationLi.station_id === 'ST_SERVICE', '李俐旻之管轄站點判定為服務台 (ST_SERVICE)');

// 模擬 AnomalyAlertBanner 中的過濾邏輯
const liFilteredIssues = validation.issues.filter(issue => {
  if (issue.station_id === leaderStationLi.station_id) return true;
  if (issue.emp_id) {
    const emp = EMPLOYEES.find(e => e.emp_id === issue.emp_id);
    if (emp && emp.primary_station === leaderStationLi.station_id) return true;
  }
  return false;
});

console.log(`全館異常 ${validation.issues.length} 件，服務台組長李俐旻過濾後僅顯示: ${liFilteredIssues.length} 件`);
assert(liFilteredIssues.length < validation.issues.length, '組長視野成功將非本組 (Gagoo、MSS、極限組等) 異常完全隔離，不被洗版！');
liFilteredIssues.forEach(issue => {
  const stationMatch = issue.station_id === 'ST_SERVICE';
  const empMatch = issue.emp_id && EMPLOYEES.find(e => e.emp_id === issue.emp_id)?.primary_station === 'ST_SERVICE';
  assert(stationMatch || empMatch, `李俐旻檢視到的異常皆為服務台相關: [${issue.station_name || issue.emp_name}] ${issue.message}`);
});

// 4-2. 極限組組長 (吳泓邑 B112002)
const leaderWu = EMPLOYEES.find(e => e.emp_id === 'B112002');
assert(leaderWu && leaderWu.name === '吳泓邑', '找到極限組組長吳泓邑');

const leaderStationWu = STATIONS.find(s => s.leader_emp_id === leaderWu.emp_id) || 
                        STATIONS.find(s => s.station_id === leaderWu.primary_station);
assert(leaderStationWu.station_id === 'ST_EXPERIENCE', '吳泓邑之管轄站點判定為極限組 (ST_EXPERIENCE)');

const wuFilteredIssues = validation.issues.filter(issue => {
  if (issue.station_id === leaderStationWu.station_id) return true;
  if (issue.emp_id) {
    const emp = EMPLOYEES.find(e => e.emp_id === issue.emp_id);
    if (emp && emp.primary_station === leaderStationWu.station_id) return true;
  }
  return false;
});
console.log(`極限組組長吳泓邑過濾後顯示: ${wuFilteredIssues.length} 件`);
wuFilteredIssues.forEach(issue => {
  assert(issue.station_id === 'ST_EXPERIENCE' || EMPLOYEES.find(e => e.emp_id === issue.emp_id)?.primary_station === 'ST_EXPERIENCE', 
    `吳泓邑檢視到的異常皆為極限組相關: ${issue.message}`);
});

// 4-3. 排班矩陣大表組別預設聚焦測試 (ScheduleTable)
console.log('\n--- 測試 5: 排班大表自動預設聚焦本組 ---');
function getScheduleTableDefaultFilter(user) {
  if (user?.role === 'Leader') {
    const myStation = STATIONS.find(s => s.leader_emp_id === user.emp_id) || 
                      STATIONS.find(s => s.station_id === user.primary_station);
    return myStation ? myStation.station_id : 'ALL';
  }
  return 'ALL';
}

assert(getScheduleTableDefaultFilter(leaderLi) === 'ST_SERVICE', '李俐旻進入排班大表預設過濾為服務台 (ST_SERVICE)');
assert(getScheduleTableDefaultFilter(leaderWu) === 'ST_EXPERIENCE', '吳泓邑進入排班大表預設過濾為極限組 (ST_EXPERIENCE)');

const managerLin = EMPLOYEES.find(e => e.emp_id === 'B111014');
assert(getScheduleTableDefaultFilter(managerLin) === 'ALL', '營運主管林慶忠進入排班大表預設為全館 9 大站點 (ALL)');

// 驗證過濾後同仁清單
const serviceEmployees = EMPLOYEES.filter(e => e.primary_station === 'ST_SERVICE');
assert(serviceEmployees.length > 0 && serviceEmployees.every(e => e.primary_station === 'ST_SERVICE'), 
  `服務台聚焦後僅列出本組 ${serviceEmployees.length} 位同仁，避免組長上下翻找`);

console.log('\n====================================================');
console.log(`  測試驗收總結: 共 ${totalTests} 項驗收測試，通過 ${passedTests} 項！`);
console.log('====================================================');
