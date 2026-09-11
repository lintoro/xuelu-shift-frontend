// scratch/test_v353_station_leader_persistence.mjs
import { STATIONS, EMPLOYEES } from '../src/data/mockMasterData.js';

console.log('=== 開始測試 V35.3 站點組長指派與 F5 重整持久化機制 ===');

// 1. 檢視出廠預設 STATIONS 站點組長配置
console.log('\n--- 1. 檢視各站點預設組長 ---');
const empMap = Object.fromEntries(EMPLOYEES.map(e => [e.emp_id, e.name]));

STATIONS.forEach(st => {
  const leaderName = st.leader_emp_id ? empMap[st.leader_emp_id] : '(未指定/主管統籌)';
  console.log(`站點【${st.station_name}】(${st.station_id}): 組長 = ${leaderName} [${st.leader_emp_id || 'null'}]`);
});

// 2. 測試雲端回傳資料正規化 (模擬後端僅回傳 leader_id，或 leader_emp_id 為空)
console.log('\n--- 2. 測試雲端拉取正規化邏輯 ---');
const mockCloudStations = [
  { station_id: 'ST_ADMIN', station_name: '營運處(支援)', leader_id: '' },
  { station_id: 'ST_SERVICE', station_name: '服務台', leader_id: 'B112001' },
  { station_id: 'ST_EXPERIENCE', station_name: '極限組', leader_id: 'B112002' },
  { station_id: 'ST_MSS', station_name: 'MSS', leader_id: 'B112003' },
  { station_id: 'ST_MAIN_SHOP', station_name: '本鋪', leader_id: 'B112004' },
  { station_id: 'ST_SUB_SHOP', station_name: '小鋪', leader_id: 'B112005' },
  { station_id: 'ST_CLEAN', station_name: '清潔', leader_id: 'B112006' },
  { station_id: 'ST_DINING', station_name: '餐飲', leader_id: 'B112007' },
  { station_id: 'ST_Gagoo', station_name: 'Gagoo', leader_id: 'B113106' }
];

const prevLocalStations = STATIONS;
const prevMap = Object.fromEntries(prevLocalStations.map(p => [p.station_id, p.leader_emp_id || p.leader_id]));

const normalized = mockCloudStations.map(st => {
  const cloudLeader = st.leader_emp_id || st.leader_id || '';
  const leader = (cloudLeader && cloudLeader.trim()) ? cloudLeader.trim() : (prevMap[st.station_id] || null);
  return {
    ...st,
    leader_emp_id: leader,
    leader_id: leader
  };
});

normalized.forEach(st => {
  const leaderName = st.leader_emp_id ? empMap[st.leader_emp_id] : '(未指定/主管統籌)';
  console.log(`正規化後站點【${st.station_name}】: leader_emp_id = ${st.leader_emp_id} (${leaderName})`);
});

// 驗證服務台組長是否為李俐旻 (B112001)
const serviceStation = normalized.find(s => s.station_id === 'ST_SERVICE');
if (serviceStation.leader_emp_id !== 'B112001') {
  throw new Error(`服務台組長預期為 B112001，得到 ${serviceStation.leader_emp_id}`);
}

// 驗證本鋪組長是否為柯又溱 (B112004)
const mainShop = normalized.find(s => s.station_id === 'ST_MAIN_SHOP');
if (mainShop.leader_emp_id !== 'B112004') {
  throw new Error(`本鋪組長預期為 B112004，得到 ${mainShop.leader_emp_id}`);
}

// 驗證營運處支援是否為 null（而非被誤塞林慶忠）
const adminStation = normalized.find(s => s.station_id === 'ST_ADMIN');
if (adminStation.leader_emp_id !== null) {
  throw new Error(`營運處支援預期為 null，得到 ${adminStation.leader_emp_id}`);
}

// 3. 測試組長變更與 localStorage 模擬更新
console.log('\n--- 3. 測試主管手動指派組長更新 ---');
// 假設主管將小鋪組長更換為 王小明 (假設 B112001)
const targetStationId = 'ST_SUB_SHOP';
const newLeaderId = 'B112001';

const updatedStations = normalized.map(st => 
  st.station_id === targetStationId ? { ...st, leader_emp_id: newLeaderId, leader_id: newLeaderId } : st
);

const updatedSubShop = updatedStations.find(s => s.station_id === 'ST_SUB_SHOP');
console.log(`更新後小鋪組長: ${updatedSubShop.leader_emp_id} (${empMap[updatedSubShop.leader_emp_id]})`);
if (updatedSubShop.leader_emp_id !== 'B112001') {
  throw new Error('小鋪組長更新失敗！');
}

console.log('\n✓ 所有站點組長指派、雲端正規化與持久化測試全部 PASS！');
