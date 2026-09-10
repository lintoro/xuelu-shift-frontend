// scratch/test_review_hierarchy_and_station_scope.mjs
import assert from 'assert';
import { EMPLOYEES, STATIONS } from '../src/data/mockMasterData.js';

console.log('🧪 開始執行【實勤覆核同組限制、嚴禁跳組、嚴禁自我覆核與組長向上覆核】自動化測試...\n');

// 模擬 ActualHoursOverride 的合格覆核名單篩選演算法
function getReviewableEmployees(employees, currentUser, stationFilter = 'ALL') {
  if (!currentUser) return [];

  const isLeader = currentUser.role === 'Leader';
  const isManager = currentUser.role === 'Manager' || !!currentUser.is_admin;

  return employees.filter(emp => {
    // 1. 利益迴避原則：嚴格排除操作者本人 (不能自己覆核自己)
    if (emp.emp_id === currentUser.emp_id) return false;

    // 2. 排除自排免審高管
    if (emp.is_self_scheduled) return false;

    if (isLeader) {
      // 3. 組長同組限制：僅能覆核同主屬站點同仁，禁止跳組
      if (emp.primary_station !== currentUser.primary_station) return false;

      // 4. 組長不得向上覆核：禁止覆核 Manager 或同級 Leader
      if (emp.role === 'Manager' || emp.role === 'Leader') return false;

      return true;
    }

    if (isManager) {
      // 5. 營運高管統籌覆核：可向上覆核各站點組長 (Leader) 以及全場 Staff / PT
      if (stationFilter !== 'ALL' && emp.primary_station !== stationFilter) {
        return false;
      }
      return true;
    }

    return false;
  });
}

// 模擬調班初審與終審權限判定
function canReviewSwapRequest(req, currentEmp) {
  const isManager = currentEmp?.role === 'Manager';
  const isAdmin = !!currentEmp?.is_admin;
  const isLeader = currentEmp?.role === 'Leader';

  const isSelfSwap = req.applicant_id === currentEmp?.emp_id || req.target_emp_id === currentEmp?.emp_id;
  const isLeaderStationMatch = isLeader && (
    req.applicant_station === currentEmp?.primary_station ||
    req.target_station === currentEmp?.primary_station
  );

  const canFirst = (isManager || isAdmin) 
    ? !isSelfSwap 
    : (isLeader && isLeaderStationMatch && !isSelfSwap);

  const canFinal = (isManager || isAdmin) && !isSelfSwap;

  return { canFirst, canFinal, isSelfSwap, isLeaderStationMatch };
}

// -------------------------------------------------------------
// 測試 1: 李俐旻 (服務台組長 Leader, ST_SERVICE) 實勤覆核名單驗證
// -------------------------------------------------------------
console.log('▶ 測試 1: 站點組長李俐旻 (ST_SERVICE) 覆核範圍驗證');
const liLiMin = EMPLOYEES.find(e => e.emp_id === 'B112001'); // 李俐旻
assert.ok(liLiMin, '找不到李俐旻資料');
assert.strictEqual(liLiMin.role, 'Leader', '李俐旻必須為 Leader');
assert.strictEqual(liLiMin.primary_station, 'ST_SERVICE', '李俐旻主屬站點必須為 ST_SERVICE');

const leaderReviewableList = getReviewableEmployees(EMPLOYEES, liLiMin);
const leaderReviewableIds = leaderReviewableList.map(e => e.emp_id);
const leaderReviewableNames = leaderReviewableList.map(e => e.name);

console.log(`  - 李俐旻合格覆核名單 (${leaderReviewableList.length} 人):`, leaderReviewableNames.join(', '));

// 1.1 驗證不能跳組：餐飲部許雅婷絕對不可出現
assert.ok(!leaderReviewableIds.includes('B115090'), '❌ 違規：餐飲部許雅婷不應出現在服務台組長覆核名單中！');
console.log('  ✓ 成功阻擋跳組：餐飲部許雅婷已被正確排除');

// 1.2 驗證不能自我覆核：李俐旻自己不可出現
assert.ok(!leaderReviewableIds.includes('B112001'), '❌ 違規：李俐旻自己不可出現在自己覆核名單中！');
console.log('  ✓ 成功落實利益迴避：李俐旻本人已被排除');

// 1.3 驗證不能向上覆核：林慶忠 (Manager) 不可出現
assert.ok(!leaderReviewableIds.includes('B111014'), '❌ 違規：營運主管林慶忠不應被組長覆核！');
console.log('  ✓ 成功防止向上越權：營運主管林慶忠已被排除');

// 1.4 驗證同組其他組長不可出現：其他 Leader 不可出現
const containsOtherLeader = leaderReviewableList.some(e => e.role === 'Leader');
assert.ok(!containsOtherLeader, '❌ 違規：組長不可覆核同級組長！');
console.log('  ✓ 成功隔離同級組長：無其他 Leader 出現');

// 1.5 驗證同組合格同仁正確納入 (服務台的 Staff 與 PT)
assert.ok(leaderReviewableIds.includes('B113089'), '張舒扉 (服務台正職) 應在名單中');
assert.ok(leaderReviewableIds.includes('A202601'), '陳盈如 (服務台PT) 應在名單中');
assert.ok(leaderReviewableList.every(e => e.primary_station === 'ST_SERVICE'), '所有同仁必須同屬服務台！');
console.log('  ✓ 同組同仁 (張舒扉、陳盈如等) 100% 正確納入！');

// -------------------------------------------------------------
// 測試 2: 林慶忠 (營運高管 Manager) 實勤向上覆核與統籌驗證
// -------------------------------------------------------------
console.log('\n▶ 測試 2: 營運高管林慶忠 (Manager) 全場統籌與向上覆核組長驗證');
const linChingChung = EMPLOYEES.find(e => e.emp_id === 'B111014');
assert.ok(linChingChung, '找不到林慶忠資料');
assert.strictEqual(linChingChung.role, 'Manager', '林慶忠必須為 Manager');

const managerReviewableList = getReviewableEmployees(EMPLOYEES, linChingChung, 'ALL');
const managerReviewableIds = managerReviewableList.map(e => e.emp_id);

// 2.1 驗證不能自己覆核自己
assert.ok(!managerReviewableIds.includes('B111014'), '❌ 違規：高管林慶忠不可自我覆核！');
console.log('  ✓ 成功落實高管自我利益迴避：林慶忠已被排除');

// 2.2 驗證組長實勤向上由 Manager 覆核：李俐旻與各站點組長必須在名單中
assert.ok(managerReviewableIds.includes('B112001'), '李俐旻 (組長) 應向上由 Manager 覆核！');
assert.ok(managerReviewableIds.includes('B112002'), '吳泓邑 (極限組長) 應向上由 Manager 覆核！');
assert.ok(managerReviewableIds.includes('B112007'), '王鳳珠 (餐飲組長) 應向上由 Manager 覆核！');
console.log('  ✓ 成功落實【組長實勤向上由 MANAGER 覆核】：各站點組長均納入高管名單！');

// 2.3 驗證 Manager 依站點篩選 (例如篩選餐飲部 ST_DINING)
const diningList = getReviewableEmployees(EMPLOYEES, linChingChung, 'ST_DINING');
assert.ok(diningList.every(e => e.primary_station === 'ST_DINING'), '篩選餐飲部時應全為餐飲同仁');
assert.ok(diningList.some(e => e.name === '許雅婷'), '許雅婷應在餐飲部名單中');
assert.ok(diningList.some(e => e.name === '王鳳珠'), '王鳳珠組長應在餐飲部名單中');
console.log('  ✓ 高管站點快速篩選器運作正確 (餐飲部共', diningList.length, '人)');

// -------------------------------------------------------------
// 測試 3: 調班二階審核同組與利益迴避驗證
// -------------------------------------------------------------
console.log('\n▶ 測試 3: 調班二階審核同組初審與自我審核迴避檢驗');

// 情境 3.1: 服務台同仁調班單 (張舒扉 ST_SERVICE 申請)
const reqService = {
  swap_id: 'SWAP-TEST-1',
  applicant_id: 'B113089',
  applicant_station: 'ST_SERVICE',
  target_emp_id: 'A202601',
  target_station: 'ST_SERVICE'
};
const reviewResult1 = canReviewSwapRequest(reqService, liLiMin);
assert.strictEqual(reviewResult1.canFirst, true, '服務台組長李俐旻應可初審服務台同仁之調班單');
console.log('  ✓ 李俐旻可正常初審同組 (服務台) 之調班單');

// 情境 3.2: 餐飲部同仁調班單 (許雅婷 ST_DINING 申請)
const reqDining = {
  swap_id: 'SWAP-TEST-2',
  applicant_id: 'B115090',
  applicant_station: 'ST_DINING',
  target_emp_id: 'B112007',
  target_station: 'ST_DINING'
};
const reviewResult2 = canReviewSwapRequest(reqDining, liLiMin);
assert.strictEqual(reviewResult2.canFirst, false, '服務台組長李俐旻不可跨組初審餐飲部調班單');
assert.strictEqual(reviewResult2.isLeaderStationMatch, false, '站點不相符');
console.log('  ✓ 成功阻擋跳組初審：李俐旻無法初審餐飲部調班單');

// 情境 3.3: 李俐旻自己發起之調班單 (自身利益迴避)
const reqSelf = {
  swap_id: 'SWAP-TEST-3',
  applicant_id: 'B112001', // 李俐旻自己
  applicant_station: 'ST_SERVICE',
  target_emp_id: 'B113089',
  target_station: 'ST_SERVICE'
};
const reviewResult3 = canReviewSwapRequest(reqSelf, liLiMin);
assert.strictEqual(reviewResult3.canFirst, false, '李俐旻不可自我初審！');
assert.strictEqual(reviewResult3.isSelfSwap, true, '標記為自身調班');
console.log('  ✓ 成功落實利益迴避：李俐旻不可初審自己的調班申請');

// 情境 3.4: 高管林慶忠向上審核李俐旻之調班單
const reviewResult4 = canReviewSwapRequest(reqSelf, linChingChung);
assert.strictEqual(reviewResult4.canFirst, true, '高管林慶忠可向上代初審組長之調班單');
assert.strictEqual(reviewResult4.canFinal, true, '高管林慶忠可終審組長之調班單');
console.log('  ✓ 組長自身調班單可正常由營運高管 (Manager) 向上初審與終審核定！');

console.log('\n🎉 所有【覆核同組限制、嚴禁跳組、嚴禁自我覆核與組長向上覆核】測試全數通過！');
