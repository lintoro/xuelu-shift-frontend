// scratch/test_v352_timeline_and_auth.mjs
import { getTimelineStatus, checkActionTimelineEligibility, TIMELINE_STAGES } from '../src/engine/schedulingTimelineEngine.js';

console.log('=== 開始測試 V35.2 排班週期時程與時限判定 ===');

// 1. 檢查 8 大階段配置
console.log('\n--- 1. 檢查 TIMELINE_STAGES 階段配置 ---');
if (TIMELINE_STAGES.length !== 8) {
  throw new Error(`TIMELINE_STAGES 長度錯誤，預期 8，得到 ${TIMELINE_STAGES.length}`);
}

const expectedStages = [
  { step: 1, id: 'MANAGER_PRECONFIG', startDay: 8, endDay: 10, shortTitle: '8-10日 主管設定' },
  { step: 2, id: 'EMPLOYEE_PREFERENCE', startDay: 11, endDay: 14, shortTitle: '11-14日 員工劃選' },
  { step: 3, id: 'LEADER_REVIEW', startDay: 15, endDay: 18, shortTitle: '15-18日 組長初審' },
  { step: 4, id: 'MANAGER_FINAL_REVIEW', startDay: 19, endDay: 20, shortTitle: '19-20日 高管初審' },
  { step: 5, id: 'SCHEDULE_SIGNOFF', startDay: 21, endDay: 23, shortTitle: '21-23日 全員簽回' },
  { step: 6, id: 'STORE_SCHEDULE_PUBLISH', startDay: 24, endDay: 25, shortTitle: '24-25日 全店產出' },
  { step: 7, id: 'MONTH_END_ACTUAL', isMonthEnd: true, shortTitle: '月底 出勤確認' },
  { step: 8, id: 'NEXT_MONTH_SIGNOFF', isNextMonthDay2: true, shortTitle: '次月2日 考勤簽認' }
];

expectedStages.forEach((exp, idx) => {
  const actual = TIMELINE_STAGES[idx];
  console.log(`階段 ${actual.step}: ${actual.shortTitle} (${actual.periodText}) - [${actual.id}]`);
  if (actual.step !== exp.step || actual.id !== exp.id || actual.shortTitle !== exp.shortTitle) {
    throw new Error(`階段 ${exp.step} 設定不相符！`);
  }
});
console.log('✓ TIMELINE_STAGES 8 大階段完全符合主管最新規範！');

// 2. 測試各關鍵日期的 getTimelineStatus 判定
console.log('\n--- 2. 測試日期自動判定 (getTimelineStatus) ---');
const dateTests = [
  { date: '2026-09-08', expectedStageId: 'MANAGER_PRECONFIG', name: '9/08 (主管設定第一天)' },
  { date: '2026-09-10', expectedStageId: 'MANAGER_PRECONFIG', name: '9/10 (主管設定最後一天)' },
  { date: '2026-09-11', expectedStageId: 'EMPLOYEE_PREFERENCE', name: '9/11 (員工劃選第一天)' },
  { date: '2026-09-14', expectedStageId: 'EMPLOYEE_PREFERENCE', name: '9/14 (員工劃選最後一天)' },
  { date: '2026-09-15', expectedStageId: 'LEADER_REVIEW', name: '9/15 (組長初審第一天)' },
  { date: '2026-09-18', expectedStageId: 'LEADER_REVIEW', name: '9/18 (組長初審最後一天)' },
  { date: '2026-09-19', expectedStageId: 'MANAGER_FINAL_REVIEW', name: '9/19 (高管初審第一天)' },
  { date: '2026-09-20', expectedStageId: 'MANAGER_FINAL_REVIEW', name: '9/20 (高管初審最後一天)' },
  { date: '2026-09-21', expectedStageId: 'SCHEDULE_SIGNOFF', name: '9/21 (全員簽回第一天)' },
  { date: '2026-09-23', expectedStageId: 'SCHEDULE_SIGNOFF', name: '9/23 (全員簽回最後一天)' },
  { date: '2026-09-24', expectedStageId: 'STORE_SCHEDULE_PUBLISH', name: '9/24 (全店產出第一天)' },
  { date: '2026-09-25', expectedStageId: 'STORE_SCHEDULE_PUBLISH', name: '9/25 (全店產出最後一天)' },
  { date: '2026-09-26', expectedStageId: 'DAILY_OPERATIONS', name: '9/26 (平時常態運作)' },
  { date: '2026-09-30', expectedStageId: 'MONTH_END_ACTUAL', name: '9/30 (月底出勤確認日)' },
  { date: '2026-10-02', expectedStageId: 'NEXT_MONTH_SIGNOFF', name: '10/02 (次月2日考勤簽認日)' }
];

dateTests.forEach(test => {
  const status = getTimelineStatus(test.date);
  const stageId = status.currentStage?.id;
  console.log(`測試 [${test.name}] -> 命中階段: [${stageId}] (${status.currentStage?.shortTitle || '無'}) - 狀態: ${status.statusLabel}`);
  if (stageId !== test.expectedStageId) {
    throw new Error(`日期 ${test.date} 判定錯誤！預期 [${test.expectedStageId}]，得到 [${stageId}]`);
  }
});
console.log('✓ getTimelineStatus 所有日期情境驗證全部通過！');

// 3. 測試 checkActionTimelineEligibility 時限權限
console.log('\n--- 3. 測試時限操作權限 (checkActionTimelineEligibility) ---');

// 員工劃休在 9/10 (未開放)
const resBeforePref = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-10');
console.log('員工 9/10 劃休:', resBeforePref);
if (resBeforePref.allowed) throw new Error('員工 9/10 不應允許劃休！');

// 員工劃休在 9/11 (開放中)
const resInPref = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-11');
console.log('員工 9/11 劃休:', resInPref);
if (!resInPref.allowed) throw new Error('員工 9/11 應允許劃休！');

// 員工劃休在 9/15 (已截止)
const resAfterPref = checkActionTimelineEligibility('SUBMIT_PREFERENCE', 'Staff', '2026-09-15');
console.log('員工 9/15 劃休:', resAfterPref);
if (resAfterPref.allowed) throw new Error('員工 9/15 應已截止！');

// 組長初審在 9/14 (未開放)
const resBeforeLeader = checkActionTimelineEligibility('LEADER_FIRST_REVIEW', 'Leader', '2026-09-14');
console.log('組長 9/14 初審:', resBeforeLeader);
if (resBeforeLeader.allowed) throw new Error('組長 9/14 不應開放初審！');

// 組長初審在 9/15 (開放中)
const resInLeader = checkActionTimelineEligibility('LEADER_FIRST_REVIEW', 'Leader', '2026-09-15');
console.log('組長 9/15 初審:', resInLeader);
if (!resInLeader.allowed) throw new Error('組長 9/15 應開放初審！');

console.log('✓ checkActionTimelineEligibility 所有時限阻擋與開放規則全部正確！');
console.log('\n=== 全部單元測試驗證通過 SUCCESS ===');
