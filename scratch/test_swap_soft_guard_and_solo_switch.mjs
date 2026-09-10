import assert from 'assert';
import { canEmployeeSoloAtStation, EMPLOYEES, STATIONS } from '../src/data/mockMasterData.js';
import { precheckSwapCompliance } from '../src/data/swapStore.js';

console.log('🧪 開始執行【支援部門能否獨立 (Solo) 開關與互調班軟性特例關卡】自動化測試...');

// 測試 1: 測試 canEmployeeSoloAtStation 判斷函式
console.log('▶ 測試 1: canEmployeeSoloAtStation 細粒度站點獨立能力判斷');
const linQC = EMPLOYEES.find(e => e.emp_id === 'B111014'); // 林慶忠
const xuYT = EMPLOYEES.find(e => e.emp_id === 'B115090');  // 許雅婷

assert.strictEqual(canEmployeeSoloAtStation(linQC, 'ST_ADMIN'), true, '林慶忠在營運處應具備 Solo 資格');
assert.strictEqual(canEmployeeSoloAtStation(linQC, 'ST_SERVICE'), true, '林慶忠在服務台應具備 Solo 資格');
assert.strictEqual(canEmployeeSoloAtStation(linQC, 'ST_MAIN_SHOP'), false, '林慶忠在本鋪僅協同支援，應無 Solo 資格');
assert.strictEqual(canEmployeeSoloAtStation(linQC, 'ST_DINING'), false, '林慶忠未支援餐飲，應無 Solo 資格');

assert.strictEqual(canEmployeeSoloAtStation(xuYT, 'ST_DINING'), true, '許雅婷在餐飲應具備 Solo 資格');
assert.strictEqual(canEmployeeSoloAtStation(xuYT, 'ST_SERVICE'), false, '許雅婷在服務台僅協同支援，應無 Solo 資格');
console.log('  ✓ 支援站點獨立能力細粒度開關判斷 100% 正確！');

// 測試 2: 測試雙人對調軟性關卡 (林慶忠無餐飲支援換許雅婷餐飲班)
console.log('▶ 測試 2: 主管情境實測 - 林慶忠換許雅婷 9/9 餐飲 A 班 (軟性特例放行，不剛性阻擋)');

// 構造測試用排班資料
const mockScheduleMap = {
  'B111014': {
    9: { shift_type: 'OFF', station_id: null, work_hours: 0 },
    10: { shift_type: 'OFF', station_id: null, work_hours: 0 }
  },
  'B115090': {
    9: { shift_type: 'A', station_id: 'ST_DINING', work_hours: 8 },
    10: { shift_type: 'OFF', station_id: null, work_hours: 0 }
  }
};

const precheckResult = precheckSwapCompliance({
  scheduleMap: mockScheduleMap,
  applicantId: 'B111014', // 林慶忠
  targetId: 'B115090',    // 許雅婷
  applicantDay: 10,
  targetDay: 9,
  type: 'SWAP',
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: { days_in_month: 30 }
});

assert.strictEqual(precheckResult.isSafe, true, '依主管最新指示：無支援資格不剛性阻止，isSafe 應為 true 允許送出！');
assert.strictEqual(precheckResult.hasSpecialWarning, true, '應標註 hasSpecialWarning = true 啟動特例審核！');
assert.strictEqual(
  precheckResult.specialWarningList.some(w => w.includes('未具備「餐飲」之常規支援資格')),
  true,
  'warnings 清單應精確提示未具備餐飲常規支援資格'
);
console.log('  ✓ 成功實現主管指示：不剛性阻止送單、以琥珀色標記特例、由組長高管二階審核放行！');

// 測試 3: 勞動基準法第 36 條 7 休 1 剛性阻擋測試 (法律底線不可破)
console.log('▶ 測試 3: 勞基法第 36 條 7 休 1 剛性底線檢驗 (連續出勤 > 6天必須阻擋)');

const mockConsecutiveMap = {
  'B111014': {
    1: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    2: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    3: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    4: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    5: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    6: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 },
    7: { shift_type: 'OFF', station_id: null, work_hours: 0 }, // 原休假
    8: { shift_type: 'A', station_id: 'ST_ADMIN', work_hours: 8 }
  },
  'B112001': { // 李俐旻
    7: { shift_type: 'B', station_id: 'ST_SERVICE', work_hours: 8 },
    12: { shift_type: 'OFF', station_id: null, work_hours: 0 }
  }
};

const precheck7Rest1 = precheckSwapCompliance({
  scheduleMap: mockConsecutiveMap,
  applicantId: 'B111014',
  targetId: 'B112001',
  applicantDay: 12, // 林慶忠原休假
  targetDay: 7,     // 換李俐旻第 7 天的班出勤，將導致連續 1~8 天上班！
  type: 'SWAP',
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: { days_in_month: 30 }
});

assert.strictEqual(precheck7Rest1.isSafe, false, '觸犯 7 休 1 必須剛性阻擋，isSafe 為 false');
assert.strictEqual(precheck7Rest1.errors.length > 0, true, 'errors 應包含 7 休 1 條款警告');
console.log('  ✓ 勞基法法定紅線維持剛性安全阻擋！');

console.log('\n🎉 所有【支援部門 Solo 開關與互調班軟性特例關卡】測試全數通過！');
