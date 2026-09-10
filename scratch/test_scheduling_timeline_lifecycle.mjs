// scratch/test_scheduling_timeline_lifecycle.mjs
/**
 * 學旅營運處全月排班生命週期時限排程引擎 (Issue #016)
 * 自動化單元測試腳本
 * 
 * 測試範圍：
 * 1. 8 大時限排程邊界日期精準識別 (10日主管設定、12日員工劃選、18日組長初審、20日高管覆審、24日排定截止、25日簽回、月底出勤確認、次月2日結算簽回)
 * 2. 大月、小月、平年二月與潤年二月底動態出勤確認日計算
 * 3. 業務操作時限檢驗與權限守衛 (checkActionTimelineEligibility)
 */

import assert from 'node:assert';
import { 
  TIMELINE_STAGES, 
  getTimelineStatus, 
  checkActionTimelineEligibility, 
  getDaysInMonth 
} from '../src/engine/schedulingTimelineEngine.js';

console.log('🧪 開始執行【全月排班生命週期時限排程引擎】自動化測試...\n');

// =========================================================================
// 測試 1: 8 大排班週期階段日期精準判定
// =========================================================================
console.log('▶ 測試 1: 8 大時限排程階段日期邊界判定');
{
  // 1. 每月 10~11 日：主管設定下月排班
  const day10 = getTimelineStatus('2026-09-10');
  assert.strictEqual(day10.currentStage.id, 'MANAGER_PRECONFIG', '9/10 應判定為主管設定下月排班');
  assert.strictEqual(day10.stageIndex, 0);

  const day11 = getTimelineStatus('2026-09-11');
  assert.strictEqual(day11.currentStage.id, 'MANAGER_PRECONFIG', '9/11 應判定為主管設定下月排班');

  // 2. 每月 12~17 日：開放員工劃選預訂
  const day12 = getTimelineStatus('2026-09-12');
  assert.strictEqual(day12.currentStage.id, 'EMPLOYEE_PREFERENCE', '9/12 應判定為開放員工劃選預訂');
  assert.strictEqual(day12.stageIndex, 1);

  const day17 = getTimelineStatus('2026-09-17');
  assert.strictEqual(day17.currentStage.id, 'EMPLOYEE_PREFERENCE', '9/17 劃選最後一天應判定為員工預訂');

  // 3. 每月 18~19 日：組長初審與衝突協調
  const day18 = getTimelineStatus('2026-09-18');
  assert.strictEqual(day18.currentStage.id, 'LEADER_REVIEW', '9/18 應判定為組長初審期');
  assert.strictEqual(day18.stageIndex, 2);

  const day19 = getTimelineStatus('2026-09-19');
  assert.strictEqual(day19.currentStage.id, 'LEADER_REVIEW', '9/19 應判定為組長初審期');

  // 4. 每月 20~23 日：高管覆審與全場調度
  const day20 = getTimelineStatus('2026-09-20');
  assert.strictEqual(day20.currentStage.id, 'MANAGER_FINAL_REVIEW', '9/20 應判定為高管覆審期');
  assert.strictEqual(day20.stageIndex, 3);

  const day23 = getTimelineStatus('2026-09-23');
  assert.strictEqual(day23.currentStage.id, 'MANAGER_FINAL_REVIEW', '9/23 應判定為高管覆審期');

  // 5. 每月 24 日：全場排定完成截止
  const day24 = getTimelineStatus('2026-09-24');
  assert.strictEqual(day24.currentStage.id, 'SCHEDULE_DEADLINE', '9/24 應判定為全場排定截止日');
  assert.strictEqual(day24.stageIndex, 4);

  // 6. 每月 25 日：全體下月班表公告簽回
  const day25 = getTimelineStatus('2026-09-25');
  assert.strictEqual(day25.currentStage.id, 'SCHEDULE_SIGNOFF', '9/25 應判定為全員簽回日');
  assert.strictEqual(day25.stageIndex, 5);

  // 7. 每月 26~29 日：平時常態勤務調班
  const day26 = getTimelineStatus('2026-09-26');
  assert.strictEqual(day26.currentStage.id, 'DAILY_OPERATIONS', '9/26 應判定為日常勤務調班期');

  // 8. 當月底最後一天 (9/30)：當月出勤確認與實勤覆核
  const day30 = getTimelineStatus('2026-09-30');
  assert.strictEqual(day30.currentStage.id, 'MONTH_END_ACTUAL', '9/30 月底最後一天應判定為出勤確認日');
  assert.strictEqual(day30.stageIndex, 6);

  // 9. 次月 1~2 日 (10/1 ~ 10/2)：次月2日考勤結算簽認對帳
  const dayOct1 = getTimelineStatus('2026-10-01');
  assert.strictEqual(dayOct1.currentStage.id, 'NEXT_MONTH_SIGNOFF', '10/1 應判定為次月考勤結算簽認期');
  assert.strictEqual(dayOct1.stageIndex, 7);

  const dayOct2 = getTimelineStatus('2026-10-02');
  assert.strictEqual(dayOct2.currentStage.id, 'NEXT_MONTH_SIGNOFF', '10/2 應判定為次月考勤結算簽認期截止日');

  // 10. 次月 3 日 (10/3)：轉入平時日常勤務
  const dayOct3 = getTimelineStatus('2026-10-03');
  assert.strictEqual(dayOct3.currentStage.id, 'DAILY_OPERATIONS', '10/3 應判定為常態勤務期');

  console.log('  ✓ 8 大時限排程生命週期邊界日期判定 100% 正確！');
}

// =========================================================================
// 測試 2: 大月 (31日)、小月 (30日) 與二月潤年/平年動態出勤確認計算
// =========================================================================
console.log('\n▶ 測試 2: 月底出勤確認日跨月動態天數運算檢驗');
{
  assert.strictEqual(getDaysInMonth(2026, 9), 30, '2026年9月應為30天');
  assert.strictEqual(getDaysInMonth(2026, 10), 31, '2026年10月應為31天');
  assert.strictEqual(getDaysInMonth(2026, 2), 28, '2026年2月 (平年) 應為28天');
  assert.strictEqual(getDaysInMonth(2024, 2), 29, '2024年2月 (閏年) 應為29天');

  // 測試 10/31 月底確認
  const oct31 = getTimelineStatus('2026-10-31');
  assert.strictEqual(oct31.currentStage.id, 'MONTH_END_ACTUAL', '10/31 應正確識別為大月最後一天');

  // 測試 2/28 月底確認 (平年)
  const feb28 = getTimelineStatus('2026-02-28');
  assert.strictEqual(feb28.currentStage.id, 'MONTH_END_ACTUAL', '2/28 應正確識別為平年二月最後一天');

  // 測試 2/29 月底確認 (閏年)
  const leapFeb29 = getTimelineStatus('2024-02-29');
  assert.strictEqual(leapFeb29.currentStage.id, 'MONTH_END_ACTUAL', '2/29 應正確識別為閏年二月最後一天');

  console.log('  ✓ 大小月與二月潤平年動態最後一天計算 100% 正確！');
}

// =========================================================================
// 測試 3: 業務操作時限檢驗與權限守衛 (checkActionTimelineEligibility)
// =========================================================================
console.log('\n▶ 測試 3: 業務操作時限檢驗與權限守衛檢驗');
{
  // A. 一般員工劃休 (SUBMIT_PREFERENCE)
  // 1. 9/10 (未到 12 日)：一般同仁鎖定
  const staffCheck910 = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-10');
  assert.strictEqual(staffCheck910.allowed, false, '9/10 一般同仁尚未開放劃休預訂');
  assert.ok(staffCheck910.reason.includes('12 日正式開放'), '需提示 12 日開放');

  // 2. 9/10 主管特權測試可放行
  const mgrCheck910 = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Manager', '2026-09-10');
  assert.strictEqual(mgrCheck910.allowed, true, 'Manager 具備預覽特權');

  // 3. 9/12 (開放首日)：一般同仁放行
  const staffCheck912 = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-12');
  assert.strictEqual(staffCheck912.allowed, true, '9/12 一般同仁開放劃休');

  // 4. 9/17 (開放末日)：一般同仁放行
  const staffCheck917 = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-17');
  assert.strictEqual(staffCheck917.allowed, true, '9/17 一般同仁開放劃休');

  // 5. 9/18 (已截止)：一般同仁鎖定
  const staffCheck918 = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-18');
  assert.strictEqual(staffCheck918.allowed, false, '9/18 劃休已截止');
  assert.ok(staffCheck918.reason.includes('截止'), '需提示截止');

  // B. 組長初審 (LEADER_FIRST_REVIEW)
  // 1. 9/15 (未到 18 日)：組長初審尚未開放
  const leaderCheck915 = checkActionTimelineEligibility('LEADER_FIRST_REVIEW', 'Leader', '2026-09-15');
  assert.strictEqual(leaderCheck915.allowed, false, '9/15 組長尚未到初審期');

  // 2. 9/18 (初審首日)：組長初審放行
  const leaderCheck918 = checkActionTimelineEligibility('LEADER_FIRST_REVIEW', 'Leader', '2026-09-18');
  assert.strictEqual(leaderCheck918.allowed, true, '9/18 組長初審開放');

  // C. 主管下月排班設定與指定組長 (MANAGER_SCHEDULE_SETUP)
  // 1. 9/05 (未到 10 日)：提示未到開放日
  const setupCheck905 = checkActionTimelineEligibility('MANAGER_SCHEDULE_SETUP', 'Staff', '2026-09-05');
  assert.strictEqual(setupCheck905.allowed, false, '9/5 尚未到 10 日設定期');

  // 2. 9/10 (首日)：開放
  const setupCheck910 = checkActionTimelineEligibility('MANAGER_SCHEDULE_SETUP', 'Manager', '2026-09-10');
  assert.strictEqual(setupCheck910.allowed, true, '9/10 主管排班設定作業開放');

  // D. 班表排定截止 (PUBLISH_SCHEDULE)
  const pubCheck924 = checkActionTimelineEligibility('PUBLISH_SCHEDULE', 'Manager', '2026-09-24');
  assert.strictEqual(pubCheck924.allowed, true);
  assert.ok(pubCheck924.reason.includes('合規時限內發布'), '24 日為時限內');

  const pubCheck925 = checkActionTimelineEligibility('PUBLISH_SCHEDULE', 'Manager', '2026-09-25');
  assert.ok(pubCheck925.reason.includes('注意：已超過每月 24 日'), '25 日提示已逾期提醒');

  // E. 月底出勤確認 (MONTH_END_CONFIRM)
  const monthEndCheck929 = checkActionTimelineEligibility('MONTH_END_CONFIRM', 'Staff', '2026-09-29');
  assert.strictEqual(monthEndCheck929.allowed, false, '9/29 非月底最後一天');

  const monthEndCheck930 = checkActionTimelineEligibility('MONTH_END_CONFIRM', 'Manager', '2026-09-30');
  assert.strictEqual(monthEndCheck930.allowed, true, '9/30 月底最後一天開放確認');

  console.log('  ✓ 業務操作時限檢驗與主管特權放行 100% 正確！');
}

console.log('\n🎉 所有【全月排班生命週期時限排程引擎】自動化測試全數通過！');
