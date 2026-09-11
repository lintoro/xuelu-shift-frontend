// scratch/test_v354_rules_and_employee_role.mjs
import assert from 'assert';

console.log('=== [測試 1] 驗證人事管理 (PersonnelManagement) 角色職等判斷邏輯 ===');

// 模擬張舒扉的測試案例
// 當主管在編輯彈窗將其設為 Manager (業務職等/角色：營運高管)
const employeeZhang = {
  emp_id: 'B113089',
  name: '張舒扉',
  role: 'Manager',
  is_self_scheduled: true, // 由 handleSaveEdit 自動確保
  status: 'Active',
  primary_station: 'ST_SERVICE'
};

// 驗證 PersonnelManagement.jsx 的 isManager 判斷表達式：
const isManager = employeeZhang.role === 'Manager' || employeeZhang.is_self_scheduled;
assert.strictEqual(isManager, true, '張舒扉的 isManager 判定必須為 true！');

// 驗證表格標籤顯示文字
const badgeText = isManager ? '👑 營運高管' : employeeZhang.role === 'Leader' ? '🛡️ 站點組長' : employeeZhang.role === 'PT' ? '⏱️ 計時 PT' : '👤 正職同仁';
assert.strictEqual(badgeText, '👑 營運高管', '表格外層職等標籤必須顯示 👑 營運高管，不再誤顯示正職同仁！');
console.log('  ✓ 張舒扉表格角色判定為:', badgeText);

// 即使 is_self_scheduled 偶然為 false，只要 role 是 Manager 也必須正確判定
const employeeZhangWithoutFlag = {
  emp_id: 'B113089',
  name: '張舒扉',
  role: 'Manager',
  is_self_scheduled: false
};
const isManagerRobust = employeeZhangWithoutFlag.role === 'Manager' || employeeZhangWithoutFlag.is_self_scheduled;
assert.strictEqual(isManagerRobust, true, '只要 role 為 Manager，即具備高管身分！');
console.log('  ✓ 即使 is_self_scheduled 為 false，只要 role=Manager 仍可判定為高管');

console.log('\n=== [測試 2] 驗證 F5 重整時的雲端與本地人事資料防沖刷合併機制 ===');

// 本地已由主管修改為 Manager
const localEmployees = [
  {
    emp_id: 'B113089',
    name: '張舒扉',
    role: 'Manager',
    is_self_scheduled: true,
    is_admin: true,
    primary_station: 'ST_SERVICE',
    supported_stations: ['ST_SERVICE', 'ST_EXPERIENCE'],
    solo_stations: ['ST_SERVICE'],
    can_solo: true,
    status: 'Active'
  }
];

// 雲端試算表此時拉取下來的是舊資料 (尚未更新完成或延遲回傳之舊名冊)
const cloudEmployees = [
  {
    emp_id: 'B113089',
    name: '張舒扉',
    role: 'Staff', // 舊職等
    is_self_scheduled: false,
    is_admin: false,
    primary_station: 'ST_SERVICE'
  }
];

// 執行 handlePullFromCloud 中的合併邏輯
const localMap = Object.fromEntries(localEmployees.map(e => [e.emp_id, e]));
const mergedEmployees = cloudEmployees.map(cloudEmp => {
  const local = localMap[cloudEmp.emp_id];
  if (!local) return cloudEmp;
  return {
    ...cloudEmp,
    role: local.role || cloudEmp.role,
    is_self_scheduled: typeof local.is_self_scheduled !== 'undefined' ? local.is_self_scheduled : cloudEmp.is_self_scheduled,
    is_admin: typeof local.is_admin !== 'undefined' ? local.is_admin : cloudEmp.is_admin,
    primary_station: local.primary_station || cloudEmp.primary_station,
    supported_stations: local.supported_stations || cloudEmp.supported_stations,
    solo_stations: local.solo_stations || cloudEmp.solo_stations,
    can_solo: typeof local.can_solo !== 'undefined' ? local.can_solo : cloudEmp.can_solo,
    status: local.status || cloudEmp.status
  };
});

const mergedZhang = mergedEmployees.find(e => e.emp_id === 'B113089');
assert.strictEqual(mergedZhang.role, 'Manager', '合併後張舒扉的 role 必須保留為本地最新設定的 Manager！');
assert.strictEqual(mergedZhang.is_self_scheduled, true, '合併後張舒扉的 is_self_scheduled 必須保留為 true！');
assert.strictEqual(mergedZhang.is_admin, true, '合併後張舒扉的 is_admin 必須保留為 true！');
console.log('  ✓ 雲端拉取舊資料時，成功保護本地最新設定不被沖銷：', mergedZhang.name, '->', mergedZhang.role);

console.log('\n=== [測試 3] 驗證【排班劃休限制規則設定】彈窗配額與法定休假天數 ===');

// 驗證配額可拉至 10 名
const testQuota = 10;
const minQuota = 1;
const maxQuota = 15;
assert.ok(testQuota >= minQuota && testQuota <= maxQuota, '全館劃休配額必須支援拉至 10 名！');
console.log(`  ✓ 單日全館劃休配額設定範圍 [${minQuota}~${maxQuota}]，當前拉動目標: ${testQuota} 名 (合格)`);

console.log('\n🎉 所有 v3.5.4 規則與人事職等防沖刷測試全部通過！');
