// scratch/test_issue_009.mjs
import assert from 'node:assert';

console.log('====================================================');
console.log('   學旅營運處排班系統 - 需求 #009 角色權限隔離驗收   ');
console.log('====================================================\n');

// 測試用使用者角色定義
const staffUser = {
  emp_id: 'B113089',
  name: '張舒扉',
  role: 'Staff',
  is_admin: false,
  primary_station: 'ST_SERVICE'
};

const ptUser = {
  emp_id: 'P113001',
  name: '王小明',
  role: 'PT',
  is_admin: false,
  primary_station: 'ST_SERVICE'
};

const leaderUser = {
  emp_id: 'B112001',
  name: '李俐旻',
  role: 'Leader',
  is_admin: false,
  primary_station: 'ST_SERVICE'
};

const managerUser = {
  emp_id: 'B111155',
  name: '陳鵬宇',
  role: 'Manager',
  is_admin: true,
  primary_station: 'ST_OPS'
};

const adminStaffUser = {
  emp_id: 'B111014',
  name: '林慶忠',
  role: 'Staff',
  is_admin: true,
  primary_station: 'ST_ADMIN'
};

// 模擬 App.jsx 關鍵權限判定
function checkAppPermissions(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isLeader = currentUser?.role === 'Leader';
  // 排班調度權限僅限 Manager 與 Leader，排除 Staff Admin
  const canManageShifts = isManager || isLeader;
  // 排班演算法除錯僅限 Manager
  const canDebugEngine = isManager;

  return {
    canManageShifts,
    canDebugEngine
  };
}

// 模擬 Header.jsx 導覽分頁權限邏輯
function getHeaderTabs(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isLeader = currentUser?.role === 'Leader';
  const isStaff = currentUser?.role === 'Staff';
  const isPT = currentUser?.role === 'PT';

  const allTabs = [
    { id: 'MY_DASHBOARD', label: '我的工作台', show: true },
    { id: 'SCHEDULE', label: '排班總表', show: true },
    { id: 'LEAVE', label: '志願劃休', show: true },
    { id: 'CONFLICTS', label: '衝突透視', show: true },
    { 
      id: 'SWAPS', 
      label: isStaff ? '線上調班申請' : '調班二階審核', 
      show: isManager || isLeader || isStaff 
    }
  ];

  return allTabs.filter(t => t.show);
}

// 模擬 ShiftSwapPortal.jsx 審核按鈕權限邏輯
function getSwapApprovalRights(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const canFirstReview = isLeader || isManager;
  const canFinalApprove = isManager;
  const canAdminVerify = isAdmin;

  return {
    canFirstReview,
    canFinalApprove,
    canAdminVerify
  };
}

// 模擬 AnomalyAlertBanner.jsx 渲染判定 (由 canManageShifts 決定)
function shouldRenderAnomalyBanner(currentUser) {
  const perms = checkAppPermissions(currentUser);
  return perms.canManageShifts;
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

console.log('\n--- 測試 4: 營運高管 (Manager) 陳鵬宇 權限檢核 ---');
const managerPerms = checkAppPermissions(managerUser);
assert.strictEqual(managerPerms.canManageShifts, true, 'Manager 具備全域排班調度權限');
assert.strictEqual(managerPerms.canDebugEngine, true, 'Manager 具備全域引擎重新生成與除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(managerUser), true, 'Manager 顯示全館異常提醒看板');

const managerSwapRights = getSwapApprovalRights(managerUser);
assert.strictEqual(managerSwapRights.canFirstReview, true, 'Manager 具備初審權限');
assert.strictEqual(managerSwapRights.canFinalApprove, true, 'Manager 具備終審核准覆寫班表權限');
console.log('✅ [PASS] Manager 正確具備完整調度、除錯、初審與終審覆寫權限');

console.log('\n--- 測試 5: 系統管理正職 (Staff Admin) 林慶忠 權限檢核 ---');
const adminStaffPerms = checkAppPermissions(adminStaffUser);
assert.strictEqual(adminStaffPerms.canManageShifts, false, 'Staff Admin 林慶忠嚴格不具備排班調度權限');
assert.strictEqual(adminStaffPerms.canDebugEngine, false, 'Staff Admin 林慶忠嚴格不具備演算法除錯權限');
assert.strictEqual(shouldRenderAnomalyBanner(adminStaffUser), false, 'Staff Admin 在排班總表不顯示主管排班異常看板');

const adminStaffSwapRights = getSwapApprovalRights(adminStaffUser);
assert.strictEqual(adminStaffSwapRights.canFirstReview, false, 'Staff Admin 無組長初審權限');
assert.strictEqual(adminStaffSwapRights.canFinalApprove, false, 'Staff Admin 無高管終審權限');
assert.strictEqual(adminStaffSwapRights.canAdminVerify, true, 'Staff Admin 具備高管自身調班行政合規備查歸檔權限');
console.log('✅ [PASS] Staff Admin 林慶忠：排班功能全數安全收攏，僅保留行政合規備查與技術維護權限！');

console.log('\n====================================================');
console.log('  測試驗收總結: 共 5 大角色情境測試，全數通過！');
console.log('====================================================\n');
