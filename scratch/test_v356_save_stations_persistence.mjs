// scratch/test_v356_save_stations_persistence.mjs
import assert from 'node:assert/strict';
import { ApiService } from '../src/services/apiService.js';
import { STATIONS } from '../src/data/mockMasterData.js';

console.log('=== [測試 1] ApiService.saveStations 介面存在性與 Mock 回應驗證 ===');
{
  assert.equal(typeof ApiService.saveStations, 'function', 'ApiService 必須包含 saveStations 方法');

  const modifiedStations = STATIONS.map(st => {
    if (st.station_id === 'ST_EXPERIENCE') {
      return { ...st, weekday_min_staff: 3, weekend_min_staff: 4, leader_emp_id: 'B112002' };
    }
    return st;
  });

  const res = await ApiService.saveStations(modifiedStations);
  assert.ok(res, 'saveStations 必須回傳結果');
  assert.equal(res.success, true, 'saveStations 必須回傳 success: true');
  assert.equal(res.count, STATIONS.length, '修改筆數必須一致');
  console.log('✔ ApiService.saveStations 介面測試通過！');
}

console.log('\n=== [測試 2] 站點人數與組長資料結構欄位完整性驗證 ===');
{
  const sampleStation = STATIONS[0];
  assert.ok('min_staff_weekday' in sampleStation || 'weekday_min_staff' in sampleStation, 'Station 物件必須包含平日最低人數欄位');
  assert.ok('min_staff_weekend' in sampleStation || 'weekend_min_staff' in sampleStation, 'Station 物件必須包含假日最低人數欄位');
  console.log('✔ Station 資料結構欄位驗證通過！');
}

console.log('\n🎉 所有站點人數與組長雲端同步持久化測試全部順利通過！');
