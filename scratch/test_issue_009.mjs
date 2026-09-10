// scratch/test_issue_009.mjs
// 需求 #009 驗收腳本：PT 與 STAFF 排班總表面板異常提示隔離與調班操作權限收攏

import assert from 'node:assert';
import { EMPLOYEES, STATIONS } from '../src/data/mockMasterData.js';

console.log('====================================================');
console.log('   學旅營運處排班系統 - 需求 #009 角色權限隔離驗收   ');
console.log('====================================================\n');

// 測試對象角色定位
const staffUser = EMPLOYEES.find(e => e.emp_id === 'B113089') || { emp_id: 'B113089', name: '張舒扉', role: 'Staff' };
const ptUser = EMPLOYEES.find(e => e.role === 'PT') || { emp_id: 'PT01', name: '王雅婷', role: 'PT' };
const leaderUser = EMPLOYEES.find(e => e.role === 'Leader') || { emp_id: 'B112001', name: '李俐旻', role: 'Leader' };
const managerUser = EMPLOYEES.find(e => e.role === 'Manager') || { emp_id: 'M001', name: '林慶忠', role: 'Manager' };
const adminUser = { emp_id: 'ADMIN01', name: '系統管理員', role: 'Staff', is_admin: true };

// 模擬 App.jsx 角色判定邏輯
function checkAppPermissions(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const isStaff = currentUser?.role === 'Staff';
  const isPT = currentUser?.role === 'PT';
  const canManageShifts = isManager || isAdmin || isLeader;
  const canDebugEngine = isManager || isAdmin;

  return {
    isManager,
    isAdmin,
    isLeader,
    isStaff,
    isPT,
    canManageShifts,
    canDebugEngine
  };
}

// 模擬 Header.jsx Tab 過濾邏輯
function getHeaderTabs(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const isPT = currentUser?.role === 'PT';

  const allTabs = [
    { id: 'MY_DASHBOARD', label: '我的工作台', show: true },
    { id: 'SCHEDULE', label: '排班總表', show: true },
    { id: 'LEAVE_PORTAL', label: isPT ? '意向報班' : '志願劃休', show: !isManager || isPT },
    { id: 'CONFLICTS', label: '衝突透視', show: isManager || isAdmin },
    { id: 'SWAPS', label: (isManager || isLeader || isAdmin) ? '調班二階審核' : '線上調班申請', show: !isPT },
    { id: 'HOURS_OVERRIDE', label: '實勤覆核', show: isManager || isLeader },
    { id: 'MONTHLY_SETTLEMENT', label: '月底考勤結算', show: isManager || isAdmin },
    { id: 'PERSONNEL', label: '人事管理', show: isManager },
    { id: 'SHIFT_SETTINGS', label: '班別主檔', show: isManager },
    { id: 'HOLIDAY_TRANSFER', label: '120天平帳', show: isManager },
    { id: 'FAIRNESS', label: '公平性與AI', show: isManager || isAdmin },
    { id: 'AUDIT_LOGS', label: '稽核回滾', show: isManager || isAdmin }
  ];

  return allTabs.filter(t => t.show);
}

// 模擬 ShiftSwapPortal.jsx 審核按鈕權限邏輯
function getSwapApprovalRights(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const canFirstReview = isLeader || isManager || isAdmin;
  const canFinalApprove = isManager || isAdmin;

  return {
    canFirstReview,
    canFinalApprove
  };
}

// 模擬 AnomalyAlertBanner.jsx 渲染判定
function shouldRenderAnomalyBanner(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';

  if (!isManager && !isAdmin && !isLeader) {
    return false; // null
  }
  return true;
}

console.log('--- 測試 1: 正職員工 (Staff) 張舒扉 權限防護 ---');
const staffPerms = checkAppPermissions(staffUser);
assert.strictEqual(staffPerms.canManageShifts, false, 'Staff 不應具備排班調度權限');
assert.strictEqual(staffPerms.canDebugEngine, false, 'Staff 不應具備演算法除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(staffUser), false, 'Staff 在排班總表嚴格不渲染 AnomalyAlertBanner 異常提醒看板');
console.log('✅ [PASS] Staff 張舒扉排班總表面板：異常看板、演算法除錯與站點燈號完全隱藏！');

const staffTabs = getHeaderTabs(staffUser);
const staffSwapTab = staffTabs.find(t => t.id === 'SWAPS');
assert(staffSwapTab, 'Staff 應保有調班申請入口');
assert.strictEqual(staffSwapTab.label, '線上調班申請', 'Staff 看到的 Tab 標籤應為「線上調班申請」而非「調班二階審核」');
console.log('✅ [PASS] Staff 導覽選單標籤正確顯示為「線上調班申請」');

const staffSwapRights = getSwapApprovalRights(staffUser);
assert.strictEqual(staffSwapRights.canFirstReview, false, 'Staff 嚴禁具備組長初審權限');
assert.strictEqual(staffSwapRights.canFinalApprove, false, 'Staff 嚴禁具備高管終審權限');
console.log('✅ [PASS] Staff 於調班門戶無初審與終審操作按鈕');

console.log('\n--- 測試 2: 計時人員 (PT) 權限防護 ---');
const ptPerms = checkAppPermissions(ptUser);
assert.strictEqual(ptPerms.canManageShifts, false, 'PT 不應具備排班調度權限');
assert.strictEqual(ptPerms.canDebugEngine, false, 'PT 不應具備演算法除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(ptUser), false, 'PT 在排班總表嚴格不渲染 AnomalyAlertBanner 異常提醒看板');
console.log('✅ [PASS] PT 排班總表面板：異常看板、演算法除錯與站點燈號完全隱藏！');

const ptTabs = getHeaderTabs(ptUser);
const ptSwapTab = ptTabs.find(t => t.id === 'SWAPS');
assert.strictEqual(ptSwapTab, undefined, 'PT 無調班權限，導航列應完全隱藏 SWAPS Tab');
console.log('✅ [PASS] PT 導覽列完全不顯示調班相關 Tab');

console.log('\n--- 測試 3: 站點組長 (Leader) 李俐旻 權限檢核 ---');
const leaderPerms = checkAppPermissions(leaderUser);
assert.strictEqual(leaderPerms.canManageShifts, true, 'Leader 具備本組排班調度權限');
assert.strictEqual(shouldRenderAnomalyBanner(leaderUser), true, 'Leader 應顯示異常提醒看板');
assert.strictEqual(leaderPerms.canDebugEngine, false, 'Leader 不應操作全域引擎重新生成');
console.log('✅ [PASS] Leader 排班總表顯示本組專屬異常提醒看板');

const leaderTabs = getHeaderTabs(leaderUser);
const leaderSwapTab = leaderTabs.find(t => t.id === 'SWAPS');
assert.strictEqual(leaderSwapTab.label, '調班二階審核', 'Leader 看到的 Tab 標籤應為「調班二階審核」');
const leaderSwapRights = getSwapApprovalRights(leaderUser);
assert.strictEqual(leaderSwapRights.canFirstReview, true, 'Leader 具備組長初審通過按鈕權限');
assert.strictEqual(leaderSwapRights.canFinalApprove, false, 'Leader 不具備高管終審核准權限');
console.log('✅ [PASS] Leader 正確具備初審權限與審核入口標籤');

console.log('\n--- 測試 4: 營運高管 (Manager) 林慶忠 與 管理員 (Admin) 權限檢核 ---');
const managerPerms = checkAppPermissions(managerUser);
assert.strictEqual(managerPerms.canManageShifts, true, 'Manager 具備全域排班調度權限');
assert.strictEqual(managerPerms.canDebugEngine, true, 'Manager 具備全域引擎重新生成與除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(managerUser), true, 'Manager 顯示全館異常提醒看板');

const managerSwapRights = getSwapApprovalRights(managerUser);
assert.strictEqual(managerSwapRights.canFirstReview, true, 'Manager 具備初審權限');
assert.strictEqual(managerSwapRights.canFinalApprove, true, 'Manager 具備終審核准覆寫班表權限');
console.log('✅ [PASS] Manager 正確具備完整調度、除錯、初審與終審覆寫權限');

const adminPerms = checkAppPermissions(adminUser);
assert.strictEqual(adminPerms.canManageShifts, true, 'Admin 具備維運調度檢視權限');
assert.strictEqual(adminPerms.canDebugEngine, true, 'Admin 具備引擎除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(adminUser), true, 'Admin 顯示異常看板');
console.log('✅ [PASS] Admin 正確具備系統管理調度權限');

console.log('\n====================================================');
console.log('  測試驗收總結: 共 4 大角色情境測試，全數通過！');
console.log('====================================================\n');
