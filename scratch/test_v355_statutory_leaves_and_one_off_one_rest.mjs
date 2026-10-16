// scratch/test_v355_statutory_leaves_and_one_off_one_rest.mjs
import assert from 'node:assert/strict';
import { 
  SHIFT_TYPES, 
  NON_WORKING_CODES, 
  isWorkingShift, 
  isOffShift 
} from '../src/types/scheduler.js';
import { generateSeedSchedule } from '../src/engine/schedulerEngine.js';
import { validateScheduleCompliance } from '../src/engine/complianceValidator.js';
import { precheckSwapCompliance } from '../src/data/swapStore.js';
import { 
  EMPLOYEES, 
  STATIONS, 
  DEFAULT_MONTHLY_RULES, 
  MOCK_MONTH_BORDERS 
} from '../src/data/mockMasterData.js';

console.log('=== [測試 1] 假別常數與判定函數完整性驗證 ===');
{
  // 驗證 REG_OFF 與 REST_OFF 定義
  assert.ok(SHIFT_TYPES.REG_OFF, 'SHIFT_TYPES 必須包含 REG_OFF');
  assert.ok(SHIFT_TYPES.REST_OFF, 'SHIFT_TYPES 必須包含 REST_OFF');
  assert.equal(SHIFT_TYPES.REG_OFF.name, '法定例假');
  assert.equal(SHIFT_TYPES.REST_OFF.name, '休息日');

  // 驗證 NON_WORKING_CODES
  const expectedCodes = ['OFF', 'TERM_OFF', 'AL', 'CT', 'SL', 'PL', 'ML', 'FL', 'MAT', 'CL', 'REG_OFF', 'REST_OFF'];
  expectedCodes.forEach(code => {
    assert.ok(NON_WORKING_CODES.includes(code), `NON_WORKING_CODES 必須包含 ${code}`);
    assert.equal(isWorkingShift(code), false, `${code} 必須不是工作班別`);
    assert.equal(isOffShift(code), true, `${code} 必須是休假/請假班別`);
  });

  // 工作班別檢驗
  ['A', 'B', 'C', 'D'].forEach(code => {
    assert.equal(isWorkingShift(code), true, `${code} 必須是工作班別`);
    assert.equal(isOffShift(code), false, `${code} 必須不是休假班別`);
  });
  console.log('✔ 假別定義與判定函數檢驗全數通過！');
}

console.log('\n=== [測試 2] 啟發式排班引擎「一例一休」法定假別自動定性測試 ===');
{
  const result = generateSeedSchedule({
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES,
    monthBorders: MOCK_MONTH_BORDERS
  });

  assert.ok(result.scheduleMap, '排班引擎必須產出 scheduleMap');
  const scheduleMap = result.scheduleMap;

  let totalRegOff = 0;
  let totalRestOff = 0;
  let totalLegacyOff = 0;

  EMPLOYEES.forEach(emp => {
    const empSchedule = scheduleMap[emp.emp_id];
    assert.ok(empSchedule, `員工 ${emp.name} 必須有排班資料`);

    for (let d = 1; d <= 30; d++) {
      const shift = empSchedule[d];
      if (shift?.shift_type === 'REG_OFF') totalRegOff++;
      if (shift?.shift_type === 'REST_OFF') totalRestOff++;
      if (shift?.shift_type === 'OFF') totalLegacyOff++;
    }
  });

  console.log(`- 全員總法定例假 (REG_OFF / 例): ${totalRegOff}`);
  console.log(`- 全員總休息日輪休 (REST_OFF / 休): ${totalRestOff}`);
  console.log(`- 殘留未分類常態休假 (OFF): ${totalLegacyOff}`);

  assert.ok(totalRegOff > 0, '排班表必須成功自動標註法定例假 (REG_OFF / 例)');
  assert.ok(totalRestOff > 0, '排班表必須成功自動標註休息日 (REST_OFF / 休)');
  assert.equal(totalLegacyOff, 0, '排班後不應有未分類之原始 OFF');
  console.log('✔ 勞基法一例一休自動定性排班測試通過！');
}

console.log('\n=== [測試 3] 勞基法合規性檢驗器 (7休1、40工時) 假別相容性測試 ===');
{
  const result = generateSeedSchedule({
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES,
    monthBorders: MOCK_MONTH_BORDERS
  });

  const compliance = validateScheduleCompliance({
    scheduleMap: result.scheduleMap,
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES,
    monthBorders: MOCK_MONTH_BORDERS
  });

  assert.ok(compliance.employeeStats, '合規檢驗器必須回傳同仁統計 employeeStats');
  console.log(`- 勞基法嚴重違規數: ${compliance.criticalCount}`);
  console.log(`- 警告數: ${compliance.warningCount}`);
  console.log(`- 檢驗總議題數: ${compliance.issues.length}`);
  console.log('✔ 勞基法合規檢查器在全新假別矩陣下正常運作！');
}

console.log('\n=== [測試 4] 換班門戶預檢 (precheckSwapCompliance) 相容性測試 ===');
{
  const result = generateSeedSchedule({
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES,
    monthBorders: MOCK_MONTH_BORDERS
  });

  const emp1 = EMPLOYEES[0];
  const emp2 = EMPLOYEES[1];

  let offDay = 1;
  let workDay = 1;
  for (let d = 1; d <= 30; d++) {
    const s = result.scheduleMap[emp1.emp_id]?.[d]?.shift_type;
    if (isOffShift(s)) offDay = d;
    if (isWorkingShift(s)) workDay = d;
  }

  const checkFail = precheckSwapCompliance({
    scheduleMap: result.scheduleMap,
    applicantId: emp1.emp_id,
    targetId: emp1.emp_id,
    applicantDay: offDay,
    targetDay: workDay,
    type: 'SELF_RESCHEDULE',
    targetShiftCode: 'B',
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES
  });

  assert.equal(checkFail.isSafe, false, '休假日不可當作原出勤日進行自調挪休');
  assert.ok(checkFail.errors[0].includes('原本已是休假'), '錯誤訊息必須明確告知');

  const checkSuccess = precheckSwapCompliance({
    scheduleMap: result.scheduleMap,
    applicantId: emp1.emp_id,
    targetId: emp1.emp_id,
    applicantDay: workDay,
    targetDay: offDay,
    type: 'SELF_RESCHEDULE',
    targetShiftCode: 'B',
    employees: EMPLOYEES,
    stations: STATIONS,
    rules: DEFAULT_MONTHLY_RULES
  });

  console.log(`- 自調挪休預檢 (原日=${workDay}, 挪調日=${offDay}) 結果安全: ${checkSuccess.isSafe}`);
  console.log('✔ 換班門戶合規預檢假別測試通過！');
}

console.log('\n🎉 所有法定假別與一例一休單元/整合測試全部順利通過！');
