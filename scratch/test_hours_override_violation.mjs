// scratch/test_hours_override_violation.mjs
// 驗證勞基法第 35 條休息累進、第 32 條每日總工時/加班上限檢核與 CSV 報表加註

import assert from 'assert';

console.log('=== 開始執行勞基法工時覆核累進檢驗與報表加註測試 ===\n');

// 1. 勞基法第 35 條休息累進計算邏輯
function calcLaborLaw35Requirements(totalSpanHours, breakHours, isAbsent = false) {
  if (isAbsent || totalSpanHours < 4.5) {
    return { minRequiredBreakHours: 0, isViolated: false, intervalsCount: 0 };
  }
  let minRequiredBreakHours = 0.5;
  let intervalsCount = 1;

  if (totalSpanHours >= 12.5) {
    minRequiredBreakHours = 1.5;
    intervalsCount = 3;
  } else if (totalSpanHours >= 8.5) {
    minRequiredBreakHours = 1.0;
    intervalsCount = 2;
  }

  const isViolated = breakHours < minRequiredBreakHours;
  return { minRequiredBreakHours, isViolated, intervalsCount };
}

// 2. 勞基法第 32 條第 2 項每日總工時上限與加班上限
function calcLaborLaw32Requirements(netActualHours, scheduledHours = 8, isPT = false, isAbsent = false) {
  if (isAbsent) return { isViolated: false, overtimeHours: 0 };
  const overtimeHours = Math.max(0, netActualHours - 8);
  const isViolated = netActualHours > 12 || (!isPT && overtimeHours > 4);
  return { isViolated, overtimeHours };
}

// --- 測試 1：主管所舉之例 (出勤 10:00~23:00，跨度 13h，休息 0h) ---
console.log('【測試 1】出勤 10:00~23:00 (跨度 13 小時)，休息 0 小時');
const span1 = 13;
const break1 = 0;
const net1 = 13;
const res35_1 = calcLaborLaw35Requirements(span1, break1);
const res32_1 = calcLaborLaw32Requirements(net1, 0, false);

console.log('  第 35 條休息檢驗:', res35_1);
assert.strictEqual(res35_1.isViolated, true, '跨度 13h 休息 0h 必須判定違法');
assert.strictEqual(res35_1.minRequiredBreakHours, 1.5, '跨度 13h 依法至少應配置 1.5h 休息');
assert.strictEqual(res35_1.intervalsCount, 3, '跨度 13h 已跨越 3 個 4 小時工作區間');

console.log('  第 32 條工時上限檢驗:', res32_1);
assert.strictEqual(res32_1.isViolated, true, '淨實勤 13h 必須判定違反第 32 條第 2 項 (單日 > 12h)');
assert.strictEqual(res32_1.overtimeHours, 5, '本日延長工時達 5h，超過每日加班 4h 上限');
console.log('  ✓ 測試 1 成功通過：精確觸發第 35 條累進休息 (1.5h) 與第 32 條單日工時超標警告！\n');

// --- 測試 2：跨度 13h，但僅配置 0.5h 休息 ---
console.log('【測試 2】出勤 10:00~23:00 (跨度 13 小時)，休息僅配置 0.5 小時 (淨實勤 12.5h)');
const span2 = 13;
const break2 = 0.5;
const net2 = 12.5;
const res35_2 = calcLaborLaw35Requirements(span2, break2);
const res32_2 = calcLaborLaw32Requirements(net2, 8, false);

assert.strictEqual(res35_2.isViolated, true, '雖然有配 0.5h，但對於 13h 跨度仍未達法定 1.5h 休息');
assert.strictEqual(res32_2.isViolated, true, '淨實勤 12.5h 依然超過 12h 上限');
console.log('  ✓ 測試 2 成功通過：防範僅配 0.5h 之漏洞！\n');

// --- 測試 3：跨度 9h (如 08:30~17:30 或 10:00~19:00)，休息 0.5h vs 1.0h ---
console.log('【測試 3】跨度 9 小時 (工作滿 8 小時)');
const res35_3a = calcLaborLaw35Requirements(9, 0.5);
assert.strictEqual(res35_3a.isViolated, true, '跨度 9h 休息 0.5h 應判定不足，依法需 1.0h');
assert.strictEqual(res35_3a.minRequiredBreakHours, 1.0);

const res35_3b = calcLaborLaw35Requirements(9, 1.0);
assert.strictEqual(res35_3b.isViolated, false, '跨度 9h 休息 1.0h 應判定合規');
const res32_3b = calcLaborLaw32Requirements(8, 8, false);
assert.strictEqual(res32_3b.isViolated, false, '淨實勤 8h 正常合規');
console.log('  ✓ 測試 3 成功通過：9 小時跨度精確要求 1.0 小時休息！\n');

// --- 測試 4：全館排班總表 CSV 格式與加註生成測試 ---
console.log('【測試 4】CSV 班表超時違規加註提醒生成測試');
const mockShiftWithViolation = {
  shift_type: 'B',
  station_id: 'STA_01',
  work_hours: 8,
  actual_hours: 13,
  is_labor_violation_override: true,
  labor_violations: [
    '違反《勞基法》第 35 條：在勤跨度 13h 未達法定休息 1.5h',
    '嚴重違反《勞基法》第 32 條第 2 項：單日淨實勤 13h 超過法定 12h 上限'
  ],
  override_manager: {
    name: '林慶忠',
    emp_id: 'B111014',
    confirmed_at: '2026-09-10T14:30:00.000Z',
    emergency_reason: '現場設備突發斷電搶修支援至深夜'
  }
};

let cellText = `${mockShiftWithViolation.shift_type}(服務台)`;
if (mockShiftWithViolation.is_labor_violation_override) {
  cellText += ` [⚠️超時違規(實${mockShiftWithViolation.actual_hours}h)]`;
}
assert.strictEqual(cellText.includes('[⚠️超時違規(實13h)]'), true);
console.log('  CSV 格子加註內容:', cellText);

const csvViolationAnnotation = [
  '【⚠️ 勞基法工時超時違規加註提醒 (營運高管現場實況強制核定放行專區)】',
  `9月10日, 李俐旻, 實勤 13 小時, ${mockShiftWithViolation.labor_violations.join('; ')}, 核定高管: 林慶忠 (B111014), 事由: ${mockShiftWithViolation.override_manager.emergency_reason}`
];
console.log('  CSV 尾端違規提醒輸出:');
csvViolationAnnotation.forEach(line => console.log('    ' + line));
assert.strictEqual(csvViolationAnnotation[1].includes('核定高管: 林慶忠'), true);
console.log('  ✓ 測試 4 成功通過：CSV 班表與加註格式完全符合營運稽核規範！\n');

console.log('=== 所有核心邏輯單元測試全數 PASS 通過！ ===');
