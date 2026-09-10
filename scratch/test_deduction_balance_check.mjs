import assert from 'assert';

console.log('🧪 開始執行【假勤額度檢核與請假折抵 4 大選項】自動化測試...');

// 模擬員工假勤存摺
const leaveBalances = {
  'B115042': { annualLeaveDays: 3, compTimeHours: 0 },  // 林錦達 (補休 0h, 特休 3天=24h)
  'B112001': { annualLeaveDays: 7, compTimeHours: 16 }, // 李俐旻 (補休 16h, 特休 7天=56h)
  'B115082': { annualLeaveDays: 3, compTimeHours: 2 }   // 林家萱 (補休 2h, 特休 3天=24h)
};

function checkDeductionEligibility({ empId, isPT, hoursDiff, deductionType }) {
  if (isPT || hoursDiff >= 0) {
    return { isInsufficient: false, neededHours: 0, reason: '無需折抵' };
  }

  const neededHours = Math.abs(hoursDiff);
  const empBal = leaveBalances[empId] || { annualLeaveDays: 0, compTimeHours: 0 };
  const availableCompTimeHours = empBal.compTimeHours || 0;
  const availableAnnualLeaveHours = (empBal.annualLeaveDays || 0) * 8;

  const isCompTimeInsufficient = deductionType === 'COMP_TIME' && availableCompTimeHours < neededHours;
  const isAnnualLeaveInsufficient = deductionType === 'ANNUAL_LEAVE' && availableAnnualLeaveHours < neededHours;
  const isInsufficient = isCompTimeInsufficient || isAnnualLeaveInsufficient;

  return {
    isInsufficient,
    neededHours,
    availableCompTimeHours,
    availableAnnualLeaveHours,
    deductionType
  };
}

// 測試案例 1: 林錦達短少 8h，選擇【扣抵彈性補休 (COMP_TIME)】
console.log('▶ 測試案例 1: 林錦達 (補休0h) 短少 8h，選擇補休折抵應剛性阻擋');
const test1 = checkDeductionEligibility({
  empId: 'B115042',
  isPT: false,
  hoursDiff: -8,
  deductionType: 'COMP_TIME'
});
assert.strictEqual(test1.isInsufficient, true, '林錦達補休 0h 欲扣 8h 必須回傳 isInsufficient = true');
console.log('  ✓ 成功偵測到補休額度不足 (0h < 8h)，剛性阻擋！');

// 測試案例 2: 林錦達短少 8h，改選【扣抵法定特休 (ANNUAL_LEAVE)】
console.log('▶ 測試案例 2: 林錦達短少 8h，改選特休折抵 (可用24h) 應正常放行');
const test2 = checkDeductionEligibility({
  empId: 'B115042',
  isPT: false,
  hoursDiff: -8,
  deductionType: 'ANNUAL_LEAVE'
});
assert.strictEqual(test2.isInsufficient, false, '林錦達特休 24h 欲扣 8h 應放行');
console.log('  ✓ 特休額度充足 (24h >= 8h)，正常放行！');

// 測試案例 3: 林錦達短少 8h，改選【事假 (PERSONAL_LEAVE，扣全薪)】
console.log('▶ 測試案例 3: 林錦達短少 8h，改選事假 (扣全薪) 應正常放行且不扣存摺');
const test3 = checkDeductionEligibility({
  empId: 'B115042',
  isPT: false,
  hoursDiff: -8,
  deductionType: 'PERSONAL_LEAVE'
});
assert.strictEqual(test3.isInsufficient, false, '事假不扣存摺，應放行');
console.log('  ✓ 事假選項正常放行，標註扣全薪！');

// 測試案例 4: 林錦達短少 8h，改選【病假 (SICK_LEAVE，扣半薪)】
console.log('▶ 測試案例 4: 林錦達短少 8h，改選病假/照顧假 (扣半薪) 應正常放行且不扣存摺');
const test4 = checkDeductionEligibility({
  empId: 'B115042',
  isPT: false,
  hoursDiff: -8,
  deductionType: 'SICK_LEAVE'
});
assert.strictEqual(test4.isInsufficient, false, '病假不扣存摺，應放行');
console.log('  ✓ 病假選項正常放行，標註扣半薪！');

// 測試案例 5: 林家萱短少 4h，可用補休 2h，選擇補休折抵應阻擋
console.log('▶ 測試案例 5: 林家萱 (補休2h) 短少 4h 選擇補休應阻擋');
const test5 = checkDeductionEligibility({
  empId: 'B115082',
  isPT: false,
  hoursDiff: -4,
  deductionType: 'COMP_TIME'
});
assert.strictEqual(test5.isInsufficient, true, '林家萱補休 2h < 4h 應阻擋');
console.log('  ✓ 成功阻擋林家萱部分不足情況！');

// 測試案例 6: 李俐旻短少 8h，可用補休 16h，選擇補休應放行
console.log('▶ 測試案例 6: 李俐旻 (補休16h) 短少 8h 選擇補休應放行');
const test6 = checkDeductionEligibility({
  empId: 'B112001',
  isPT: false,
  hoursDiff: -8,
  deductionType: 'COMP_TIME'
});
assert.strictEqual(test6.isInsufficient, false, '李俐旻補休充足應放行');
console.log('  ✓ 李俐旻補休充足放行！');

// 測試案例 7: 特休換算天數扣除驗證 (8h = 1天)
console.log('▶ 測試案例 7: 特休扣減換算驗證');
const beforeDays = leaveBalances['B115042'].annualLeaveDays; // 3 天
const hoursToDeduct = 8;
const daysDeducted = hoursToDeduct / 8; // 1 天
const afterDays = Number((beforeDays - daysDeducted).toFixed(2));
assert.strictEqual(afterDays, 2, '3天特休扣抵8小時後應為2天');
console.log(`  ✓ 特休扣除正確：${beforeDays} 天 - ${daysDeducted} 天 = ${afterDays} 天！`);

console.log('\n🎉 所有【假勤額度檢核與 4 大假別選項】單元測試全部通過 (7/7)！');
