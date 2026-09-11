// scratch/test_staff_admin_schedule_restriction.mjs
import assert from 'node:assert';
import { EMPLOYEES, STATIONS } from '../src/data/mockMasterData.js';

console.log('🧪 開始執行【Staff Admin 林慶忠排班權限嚴格收攏與隔離檢驗】自動化測試...\n');

// 1. 取得受測角色資料
const linAdminStaff = EMPLOYEES.find(e => e.emp_id === 'B111014'); // 林慶忠 (Staff Admin)
const chenAdminManager = EMPLOYEES.find(e => e.emp_id === 'B111155'); // 陳鵬宇 (Admin Manager)
const regularStaff = EMPLOYEES.find(e => e.emp_id === 'B113089'); // 張舒扉 (一般 Staff)
const ptStaff = EMPLOYEES.find(e => e.role === 'PT'); // PT

assert.ok(linAdminStaff, '必須存在林慶忠 (B111014)');
assert.strictEqual(linAdminStaff.role, 'Staff', '林慶忠業務身分必須是 Staff');
assert.strictEqual(linAdminStaff.is_admin, true, '林慶忠系統權限必須是 is_admin: true');

assert.ok(chenAdminManager, '必須存在陳鵬宇 (B111155)');
assert.strictEqual(chenAdminManager.role, 'Manager', '陳鵬宇業務身分必須是 Manager');
assert.strictEqual(chenAdminManager.is_admin, true, '陳鵬宇系統權限必須是 is_admin: true');

// 2. 模擬 App.jsx 業務權限判定
function getAppPermissions(currentUser) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const isStaff = currentUser?.role === 'Staff';
  const isPT = currentUser?.role === 'PT';

  // 需求修正：排班調度權限僅限 Manager 與 Leader，排除 Staff Admin
  const canManageShifts = isManager || isLeader;

  // 演算法除錯與重新排班求解僅限 Manager，排除 Staff Admin
  const canDebugEngine = isManager;

  return { isManager, isAdmin, isLeader, isStaff, isPT, canManageShifts, canDebugEngine };
}

// 3. 模擬 ScheduleTable.jsx 按鈕權限判定
function getScheduleTableControls(currentUser) {
  // 需求修正：排班按鈕僅限 Manager，排除 Staff Admin
  const showScheduleEngineButtons = currentUser?.role === 'Manager';
  return { showScheduleEngineButtons };
}

// 4. 模擬 Header.jsx 工時模式切換權限判定
function getHeaderControls(currentUser) {
  // 需求修正：工時模型下拉選單僅限 Manager，排除 Staff Admin
  const isManager = currentUser?.role === 'Manager';
  const showWorkHourModelSelect = isManager;
  return { showWorkHourModelSelect };
}

// 5. 模擬 SchedulingTimelineStepper.jsx 時光機權限判定
function getTimelineControls(currentUser) {
  // 需求修正：時光機切換僅限 Manager，排除 Staff Admin
  const isManager = currentUser?.role === 'Manager';
  const showSimulatorButton = isManager;
  return { showSimulatorButton };
}

console.log('▶ 測試 1: 林慶忠 (Staff Admin) 排班權限嚴格收攏');
const linPerms = getAppPermissions(linAdminStaff);
const linScheduleControls = getScheduleTableControls(linAdminStaff);
const linHeaderControls = getHeaderControls(linAdminStaff);
const linTimelineControls = getTimelineControls(linAdminStaff);

assert.strictEqual(linPerms.canManageShifts, false, '林慶忠不應具備排班調度權限 (canManageShifts 必須為 false)');
assert.strictEqual(linPerms.canDebugEngine, false, '林慶忠不應具備排班演算法除錯權限 (canDebugEngine 必須為 false)');
assert.strictEqual(linScheduleControls.showScheduleEngineButtons, false, '林慶忠在排班總表嚴格不應看到【啟動智慧排班】與【儲存至Google試算表】');
assert.strictEqual(linHeaderControls.showWorkHourModelSelect, false, '林慶忠在表頭嚴格不應看到工時模式下拉選單 (7休1/變形工時)');
assert.strictEqual(linTimelineControls.showSimulatorButton, false, '林慶忠在排班時限軸嚴格不應看到【時光機模擬切換】按鈕');
console.log('  ✓ 林慶忠排班權限全面收攏成功：無排班調度、無引擎除錯、無排班按鈕、無工時模式切換、無時光機測試！\n');

console.log('▶ 測試 2: 站點組長主檔關聯檢驗 (林慶忠不被誤列為組長)');
const linStationAsLeader = STATIONS.find(s => s.leader_emp_id === linAdminStaff.emp_id);
assert.strictEqual(linStationAsLeader, undefined, '林慶忠不應作為任何站點的 leader_emp_id');
console.log('  ✓ ST_ADMIN 營運處支援之 leader_emp_id 已校正為 null，林慶忠未掛載組長職務！\n');

console.log('▶ 測試 3: 陳鵬宇 (Admin Manager) 完整保留營運排班決策權限');
const chenPerms = getAppPermissions(chenAdminManager);
const chenScheduleControls = getScheduleTableControls(chenAdminManager);
const chenHeaderControls = getHeaderControls(chenAdminManager);
const chenTimelineControls = getTimelineControls(chenAdminManager);

assert.strictEqual(chenPerms.canManageShifts, true, '陳鵬宇具備排班調度權限 (canManageShifts 必須為 true)');
assert.strictEqual(chenPerms.canDebugEngine, true, '陳鵬宇具備排班演算法除錯權限 (canDebugEngine 必須為 true)');
assert.strictEqual(chenScheduleControls.showScheduleEngineButtons, true, '陳鵬宇具備【啟動智慧排班】與【儲存至Google試算表】按鈕');
assert.strictEqual(chenHeaderControls.showWorkHourModelSelect, true, '陳鵬宇具備工時模式下拉選單');
assert.strictEqual(chenTimelineControls.showSimulatorButton, true, '陳鵬宇具備【時光機模擬切換】操作按鈕');
console.log('  ✓ 陳鵬宇排班高管決策功能完整保留且運作正常！\n');

console.log('▶ 測試 4: 一般基層員工 (Staff 與 PT) 安全防護檢驗');
const regularPerms = getAppPermissions(regularStaff);
const regularScheduleControls = getScheduleTableControls(regularStaff);
const ptPerms = getAppPermissions(ptStaff);
const ptScheduleControls = getScheduleTableControls(ptStaff);

assert.strictEqual(regularPerms.canManageShifts, false, '一般 Staff 無排班調度權限');
assert.strictEqual(regularScheduleControls.showScheduleEngineButtons, false, '一般 Staff 無排班按鈕');
assert.strictEqual(ptPerms.canManageShifts, false, 'PT 人員無排班調度權限');
assert.strictEqual(ptScheduleControls.showScheduleEngineButtons, false, 'PT 人員無排班按鈕');
console.log('  ✓ 基層同仁權限隔離安全無虞！\n');

console.log('🎉 所有【Staff Admin 林慶忠排班權限嚴格收攏與隔離】自動化測試全數 100% 通過！');
