// scratch/test_manager_self_declared_and_admin_verification.mjs
import assert from 'assert';
import { EMPLOYEES } from '../src/data/mockMasterData.js';

console.log('🧪 開始執行【最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔機制】自動化測試...\n');

// 1. 模擬 ShiftSwapPortal 發起調班之最高主管識別演算法
function createSwapRequest({ currentEmp, swapType, applicantDay, targetDay, targetShiftCode, targetEmpId, reason }) {
  const isManagerApplicant = currentEmp.role === 'Manager';
  const initStatus = isManagerApplicant ? 'PENDING_ADMIN_VERIFY' : 'PENDING_FIRST_REVIEW';

  return {
    swap_id: `SWAP_TEST_${Date.now()}`,
    applicant_id: currentEmp.emp_id,
    applicant_name: currentEmp.name,
    applicant_day: applicantDay,
    applicant_shift: 'OFF',
    target_id: targetEmpId || currentEmp.emp_id,
    target_name: targetEmpId ? '許雅婷' : currentEmp.name,
    target_day: targetDay,
    target_shift: targetShiftCode || 'B',
    type: swapType,
    reason: reason || '測試事由',
    status: initStatus,
    is_manager_self_declared: isManagerApplicant,
    first_review: isManagerApplicant ? {
      reviewer_id: 'SYSTEM',
      reviewer_name: '免初審 (最高主管自主業務裁定)',
      status: 'APPROVED',
      notes: '最高主管親自申報，業務實質裁定'
    } : {
      reviewer_id: currentEmp.primary_station,
      reviewer_name: '站點組長',
      status: 'PENDING',
      notes: ''
    },
    final_review: isManagerApplicant ? {
      reviewer_id: 'ADMIN',
      reviewer_name: '待系統管理員 (Admin) 行政合規備查',
      status: 'PENDING',
      notes: ''
    } : {
      reviewer_id: 'B111014',
      reviewer_name: '林慶忠 (營運主管)',
      status: 'PENDING',
      notes: ''
    }
  };
}

// 2. 模擬 ShiftSwapPortal 卡片按鈕權限判定
function getReviewActionPermission(req, currentEmp) {
  const isLeader = currentEmp?.role === 'Leader';
  const isManager = currentEmp?.role === 'Manager';
  const isAdmin = !!currentEmp?.is_admin;

  const isPendingAdminVerify = req.status === 'PENDING_ADMIN_VERIFY' || (req.is_manager_self_declared && req.status !== 'APPROVED' && req.status !== 'REJECTED');
  const isSelfSwap = req.applicant_id === currentEmp?.emp_id || req.target_emp_id === currentEmp?.emp_id;

  if (isPendingAdminVerify) {
    if (isSelfSwap) {
      return { canAdminArchive: false, reason: 'SELF_DECLARATION_BLOCKED' };
    }
    if (isLeader && !isAdmin) {
      return { canAdminArchive: false, reason: 'LEADER_NO_PERMISSION' };
    }
    if (isAdmin) {
      return { canAdminArchive: true, reason: 'ADMIN_CAN_VERIFY_AND_ARCHIVE' };
    }
    return { canAdminArchive: false, reason: 'NO_PERMISSION' };
  }

  return { canAdminArchive: false, reason: 'NORMAL_FLOW' };
}

// 3. 模擬 ActualHoursOverride 的 Admin 備查篩選演算法
function getActualReviewableEmployees(employees, currentUser) {
  if (!currentUser) return [];
  const isLeader = currentUser?.role === 'Leader';
  const isManager = currentUser?.role === 'Manager' || !!currentUser?.is_admin;
  const isAdmin = !!currentUser?.is_admin;

  return employees.filter(emp => {
    // 1. 排除操作者本人 (禁止自我覆核)
    if (emp.emp_id === currentUser.emp_id) return false;

    // 2. 排除自排免審高管 (若當前操作者為 Admin 且對象為 Manager，則開放進行行政合規備查歸檔)
    if (emp.is_self_scheduled && !(isAdmin && emp.role === 'Manager')) return false;

    if (isLeader) {
      if (emp.primary_station !== currentUser.primary_station) return false;
      if (emp.role === 'Manager' || emp.role === 'Leader') return false;
      return true;
    }

    if (isManager) {
      return true;
    }

    return false;
  });
}

// -------------------------------------------------------------
// 測試開始
// -------------------------------------------------------------
const linManager = EMPLOYEES.find(e => e.emp_id === 'B111014'); // 林慶忠 (Manager, is_admin: false)
const liLeader = EMPLOYEES.find(e => e.emp_id === 'B112001');   // 李俐旻 (Leader, is_admin: false)
const chenAdmin = EMPLOYEES.find(e => e.emp_id === 'B111155');  // 陳鵬宇 (Staff + Admin)

assert.ok(linManager && liLeader && chenAdmin, '三名測試關鍵同仁資料必須存在');

console.log('▶ 測試 1: 最高主管 (林慶忠) 發起自調挪休與對調之自主申報通道');
const managerSelfReq = createSwapRequest({
  currentEmp: linManager,
  swapType: 'SELF_RESCHEDULE',
  applicantDay: 10,
  targetDay: 14,
  targetShiftCode: 'B'
});

assert.strictEqual(managerSelfReq.is_manager_self_declared, true, '最高主管申報必須標註 is_manager_self_declared');
assert.strictEqual(managerSelfReq.status, 'PENDING_ADMIN_VERIFY', '初始狀態必須為 PENDING_ADMIN_VERIFY');
assert.strictEqual(managerSelfReq.first_review.status, 'APPROVED', '第一階段初審自動視為主管業務裁定免審');
assert.strictEqual(managerSelfReq.final_review.reviewer_id, 'ADMIN', '終審指派至 ADMIN 形式備查');
console.log('  ✓ 最高主管自主申報通道建立成功，狀態流轉至【待 Admin 行政合規備查】！');

console.log('\n▶ 測試 2: 最高主管自主申報之三方權限防弊隔離檢驗');
// 2.1 林慶忠自己檢視
const permSelf = getReviewActionPermission(managerSelfReq, linManager);
assert.strictEqual(permSelf.canAdminArchive, false, '林慶忠不可自我備查歸檔');
assert.strictEqual(permSelf.reason, 'SELF_DECLARATION_BLOCKED', '應標記自身申報迴避');
console.log('  ✓ 成功防止球員兼裁判：最高主管不可自我備查歸檔 (自身申報迴避)');

// 2.2 站點組長李俐旻檢視
const permLeader = getReviewActionPermission(managerSelfReq, liLeader);
assert.strictEqual(permLeader.canAdminArchive, false, '組長不可備查最高主管申報');
assert.strictEqual(permLeader.reason, 'LEADER_NO_PERMISSION', '組長無權審查最高主管');
console.log('  ✓ 成功防止下屬越權：站點組長無法審核最高主管申報');

// 2.3 系統管理員陳鵬宇 (Admin) 檢視
const permAdmin = getReviewActionPermission(managerSelfReq, chenAdmin);
assert.strictEqual(permAdmin.canAdminArchive, true, 'Admin 擁有專屬備查歸檔操作權限');
assert.strictEqual(permAdmin.reason, 'ADMIN_CAN_VERIFY_AND_ARCHIVE', '符合形式備查與歸檔');
console.log('  ✓ 系統管理員陳鵬宇 (Admin) 具備【檢驗合規並備查歸檔】專屬權限！');

console.log('\n▶ 測試 3: 實勤覆核面板中，Admin 對最高主管之行政合規備查驗證');
// 3.1 李俐旻 (Leader) 的覆核名單中不可出現林慶忠
const leaderReviewList = getActualReviewableEmployees(EMPLOYEES, liLeader);
assert.ok(!leaderReviewList.some(e => e.emp_id === 'B111014'), '組長名單絕不可出現 Manager 林慶忠');
console.log('  ✓ 組長李俐旻覆核名單排除最高主管林慶忠 (禁止向上越權)');

// 3.2 林慶忠 (Manager) 自己的覆核名單中不可出現自己
const managerReviewList = getActualReviewableEmployees(EMPLOYEES, linManager);
assert.ok(!managerReviewList.some(e => e.emp_id === 'B111014'), '經理名單絕不可出現自己');
console.log('  ✓ 最高主管林慶忠覆核名單排除自己 (禁止自我覆核)');

// 3.3 陳鵬宇 (Admin) 的覆核名單中【必須開放】林慶忠
const adminReviewList = getActualReviewableEmployees(EMPLOYEES, chenAdmin);
const canAdminReviewManager = adminReviewList.some(e => e.emp_id === 'B111014');
assert.strictEqual(canAdminReviewManager, true, 'Admin 必須可覆核最高主管林慶忠之出勤合規性');
console.log('  ✓ 系統管理員陳鵬宇 (Admin) 覆核名單成功納入最高主管林慶忠 (落實雙人控制 Dual Control)！');

console.log('\n🎉 所有【最高決策者自身調班與實勤異動之 ADMIN 行政合規備查歸檔機制】單元測試全數通過！');
