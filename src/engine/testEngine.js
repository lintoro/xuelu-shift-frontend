// src/engine/testEngine.js
import { generateSeedSchedule } from './schedulerEngine.js';
import { validateScheduleCompliance } from './complianceValidator.js';
import { STATIONS, EMPLOYEES, DEFAULT_MONTHLY_RULES, MOCK_MONTH_BORDERS } from '../data/mockMasterData.js';

console.log('=== 開始執行確定性排班種子引擎效能與合規驗收測試 ===');

const mockLeaveRequests = [
  // 模擬正職同仁自選休假
  { emp_id: 'B112001', day: 5, leave_type: '自選休假', status: 'APPROVED' },
  { emp_id: 'B112001', day: 6, leave_type: '自選休假', status: 'APPROVED' },
  { emp_id: 'B113089', day: 12, leave_type: '自選休假', status: 'APPROVED' },
  { emp_id: 'B113089', day: 13, leave_type: '自選休假', status: 'APPROVED' },
  { emp_id: 'B114081', day: 19, leave_type: '自選休假', status: 'APPROVED' },
  { emp_id: 'B114081', day: 20, leave_type: '自選休假', status: 'APPROVED' },
  // 模擬離職人員 (白慧真 9/20 起離職)
];

const mockResignation = {
  // 'B113028': 20
};

const result = generateSeedSchedule({
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: DEFAULT_MONTHLY_RULES,
  leaveRequests: mockLeaveRequests,
  monthBorders: MOCK_MONTH_BORDERS,
  resignationData: mockResignation
});

console.log(`[效能指標] 排班完成！耗時: ${result.durationMs} ms (目標 < 500 ms)`);
console.log(`[矩陣規格] 員工數: ${EMPLOYEES.length}, 天數: ${result.totalDays}`);

// 驗證高階主管留白
const managerSchedule = result.scheduleMap['B111155'];
const managerShifts = Object.values(managerSchedule).filter(s => s.shift_type !== null);
console.log(`[高管豁免] 陳鵬宇 (B111155) 預排班數: ${managerShifts.length} (預期 0，完全留白)`);

// 執行法規合規審查
const validation = validateScheduleCompliance({
  scheduleMap: result.scheduleMap,
  employees: EMPLOYEES,
  stations: STATIONS,
  rules: DEFAULT_MONTHLY_RULES,
  monthBorders: MOCK_MONTH_BORDERS
});

console.log(`[法規合規] 是否完全合規 (isValid): ${validation.isValid}`);
console.log(`[違規統計] 嚴重違法 (CRITICAL): ${validation.criticalCount}, 警示提示 (WARNING): ${validation.warningCount}`);

if (validation.issues.length > 0) {
  console.log('[詳細事件]');
  validation.issues.forEach(issue => {
    console.log(`  - [${issue.severity}] 第 ${issue.day || '-'} 天: ${issue.message}`);
  });
}

// 統計正職員工休假天數
console.log('\n[正職員工休假與工時統計]');
EMPLOYEES.filter(e => !e.is_self_scheduled && e.role !== 'PT').forEach(emp => {
  const stats = validation.employeeStats[emp.emp_id];
  console.log(`  ${emp.name} (${emp.emp_id}): 出勤 ${stats.workDays} 天, 休假 ${stats.offDays} 天, 最長連續出勤 ${stats.maxConsecutive} 天, 違規 ${stats.violations.length} 次`);
});

// 統計 PT 兼職工時
console.log('\n[計時人員 (PT) 候選池派工統計]');
EMPLOYEES.filter(e => e.role === 'PT').forEach(pt => {
  const stats = validation.employeeStats[pt.emp_id];
  console.log(`  ${pt.name} (${pt.emp_id}): 出勤 ${stats.workDays} 天 (約定上限 ${pt.max_monthly_days} 天)`);
});
