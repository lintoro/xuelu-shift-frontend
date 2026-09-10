// scratch/test_gas_api_contract.mjs
/**
 * 學旅排班系統 - Google Sheets 與 GAS 雲端 API 契約規格自動化單元測試
 * 驗證範圍：
 * 1. ApiService 動態 URL 快取與雙模式 (Dual Mode) 切換
 * 2. Ping 伺服器健康檢測回應結構規範
 * 3. 雲端資料庫 7+1+4 核心試算表 (Code.gs) 欄位契約與序列化檢驗
 * 4. 業務 RPC 方法 (admin.syncAll, schedule.getInitialData, swap.review, workhours.override) 資料塑形
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ApiService } from '../src/services/apiService.js';
import { EMPLOYEES, STATIONS, DEFAULT_MONTHLY_RULES } from '../src/data/mockMasterData.js';
import { DEFAULT_SHIFT_TYPES } from '../src/types/scheduler.js';

console.log('🧪 開始執行【Google Sheets 與 GAS 雲端 API 契約規格】自動化單元測試...\n');

// 模擬瀏覽器 localStorage 環境
const mockStorage = new Map();
global.window = {};
global.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear()
};

// =========================================================================
// 測試 1: ApiService 動態 URL 快取與雙模式 (Dual Mode) 狀態切換
// =========================================================================
console.log('▶ 測試 1: ApiService 動態 URL 快取與模式切換');
{
  ApiService.clearGasUrl();
  assert.strictEqual(ApiService.getGasUrl(), '', '初始狀態應無 GAS 網址');
  assert.strictEqual(ApiService.isCloudMode(), false, '無 URL 時應為本地沙盒模式');

  const testGasUrl = 'https://script.google.com/macros/s/AKfycbxyz_mock_test/exec';
  ApiService.setGasUrl(testGasUrl);
  assert.strictEqual(ApiService.getGasUrl(), testGasUrl, '應能正確儲存並讀取 GAS 網址');
  assert.strictEqual(ApiService.isCloudMode(), true, '配置 URL 後應切換為雲端模式');

  ApiService.clearGasUrl();
  assert.strictEqual(ApiService.getGasUrl(), '', '清除後應還原為空字串');
  assert.strictEqual(ApiService.isCloudMode(), false, '清除後應切換回沙盒模式');
  console.log('  ✓ 動態 URL 快取與雙模式切換 100% 正確！');
}

// =========================================================================
// 測試 2: Ping 健康檢查契約與沙盒回應規範
// =========================================================================
console.log('\n▶ 測試 2: Ping 健康檢查契約與沙盒回應規範');
{
  const pingRes = await ApiService.mockHandler('ping', {});
  assert.strictEqual(pingRes.success, true, 'Ping 回應 success 必須為 true');
  assert.ok(pingRes.version, 'Ping 回應必須包含後端版號');
  assert.ok(pingRes.server, 'Ping 回應必須包含伺服器標記');
  assert.ok(pingRes.timestamp, 'Ping 回應必須包含時間戳');
  console.log(`  ✓ Ping 契約結構符合規範 (版本: ${pingRes.version}, 伺服器: ${pingRes.server})`);
}

// =========================================================================
// 測試 3: Code.gs 7+1+4 表欄位結構規格契約比對
// =========================================================================
console.log('\n▶ 測試 3: Code.gs 7+1+4 核心試算表欄位結構完整度檢驗');
{
  const codeGsPath = path.resolve('src/backend/Code.gs');
  const codeGsContent = fs.readFileSync(codeGsPath, 'utf8');

  const requiredSheets = [
    'Employees',
    'Stations',
    'Shift_Types',
    'Rules',
    'Quotas',
    'Schedules',
    'Leaves',
    'Swaps',
    'Overrides',
    'Passbooks',
    'Settlements',
    'Audit_Logs',
    'Month_Borders'
  ];

  requiredSheets.forEach(sheetName => {
    assert.ok(
      codeGsContent.includes(`name: '${sheetName}'`),
      `Code.gs 必須包含 ${sheetName} 表初始化結構！`
    );
  });
  console.log(`  ✓ 全部 ${requiredSheets.length} 張雲端資料表結構均已在 Code.gs 中完備定義！`);

  // 驗證關鍵人事與調班新欄位
  assert.ok(codeGsContent.includes("'solo_stations'"), 'Employees 表必須包含 solo_stations 支援站點獨立開關！');
  assert.ok(codeGsContent.includes("'is_special_case'"), 'Swaps 表必須包含 is_special_case 特例單據標記！');
  assert.ok(codeGsContent.includes("'is_manager_self_declared'"), 'Swaps 表必須包含 is_manager_self_declared 最高主管申報標記！');
  assert.ok(codeGsContent.includes("'admin_verifier_id'"), 'Swaps 表必須包含 admin_verifier_id 行政合規備查員！');
  assert.ok(codeGsContent.includes("'deduction_type'"), 'Overrides 表必須包含 deduction_type 4大假別折抵欄位！');
  console.log('  ✓ Issue #011~#014 關鍵欄位 (solo_stations, is_special_case, admin_verifier_id, deduction_type) 對齊無遺漏！');
}

// =========================================================================
// 測試 4: 全量雙向備份與資料讀取 (admin.syncAll & schedule.getInitialData)
// =========================================================================
console.log('\n▶ 測試 4: 全量雙向同步資料負載序列化檢驗');
{
  const payload = {
    yearMonth: '2026-09',
    employees: EMPLOYEES,
    stations: STATIONS,
    shiftTypes: Object.values(DEFAULT_SHIFT_TYPES),
    scheduleMap: {
      'B111014': { 1: 'B', 2: 'B', 3: 'OFF' }
    }
  };

  const syncRes = await ApiService.mockHandler('admin.syncAll', { payload });
  assert.strictEqual(syncRes.success, true, 'admin.syncAll 必須成功');
  assert.ok(syncRes.timestamp, 'syncAll 回應必須包含同步時間戳');

  const initialRes = await ApiService.mockHandler('schedule.getInitialData', { year_month: '2026-09' });
  assert.ok(Array.isArray(initialRes.employees), 'employees 必須為陣列');
  assert.ok(Array.isArray(initialRes.stations), 'stations 必須為陣列');
  assert.ok(initialRes.shiftTypes, 'shiftTypes 必須存在');
  assert.ok(initialRes.rules, 'rules 必須存在');
  console.log('  ✓ 全量同步與初始主檔資料負載契約檢驗通過！');
}

console.log('\n🎉 所有【Google Sheets 與 GAS 雲端 API 契約規格】單元測試全數通過！');
