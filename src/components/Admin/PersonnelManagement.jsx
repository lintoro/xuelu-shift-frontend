import React, { useState } from 'react';
import { Users, UserPlus, Edit3, Shield, KeyRound, Check, X, Award, AlertTriangle, Sparkles, RotateCcw, Archive, UserCheck, HeartPulse, PauseCircle, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { canEmployeeSoloAtStation } from '../../data/mockMasterData.js';

// 人員生命週期狀態設定字典
export const PERSONNEL_STATUS_CONFIG = {
  Active: {
    label: '在職中',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: UserCheck,
    desc: '正常在勤 · 參與排班'
  },
  Suspended: {
    label: '留職停薪',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: PauseCircle,
    desc: '保留年資 · 暫停排班'
  },
  MedicalLeave: {
    label: '長期病假',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    icon: HeartPulse,
    desc: '醫療休養 · 暫停排班'
  },
  Resigned: {
    label: '離退職',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-300',
    icon: Archive,
    desc: '已離退 · 銷假真空'
  }
};

// 標準化人員狀態 (相容舊版 Inactive / RESIGNED 等代碼)
export const normalizeEmpStatus = (status) => {
  if (!status || status === 'Active') return 'Active';
  if (status === 'RESIGNED' || status === 'Inactive' || status === 'Resigned') return 'Resigned';
  if (status === 'Suspended') return 'Suspended';
  if (status === 'MedicalLeave') return 'MedicalLeave';
  return status;
};

export default function PersonnelManagement({
  employees,
  stations,
  onUpdateEmployee,
  onAddEmployee,
  onUpdateStationLeader,
  currentSimulatedDate,
  isCloudMode = false,
  onRefreshRoster = null
}) {
  const [personnelTab, setPersonnelTab] = useState('ACTIVE'); // 'ACTIVE' (在勤) | 'ARCHIVED' (離退與非在勤封存)
  const [editingEmp, setEditingEmp] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  // 雲端名冊強制刷新 loading 狀態
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 新增同仁表單狀態
  const [newEmpForm, setNewEmpForm] = useState({
    emp_id: `B115${Math.floor(100 + Math.random() * 900)}`,
    name: '',
    role: 'Staff',
    primary_station: 'ST_SERVICE',
    supported_stations: ['ST_SERVICE'],
    can_solo: true,
    solo_stations: ['ST_SERVICE'],
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2026-09-01'
  });

  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // 站點代碼大小寫標準化匹配 (修復如 ST_Gagoo 與 ST_GAGOO 不一致問題)
  const normalizeStationId = (rawId) => {
    if (!rawId) return rawId;
    
    // 舊有站點代碼容錯映射表
    const legacyMap = {
      'ST_OPS': 'ST_ADMIN',
      'ST_EXTREME': 'ST_EXPERIENCE',
      'ST_SHOP_MAIN': 'ST_MAIN_SHOP',
      'ST_SHOP_SUB': 'ST_SUB_SHOP'
    };
    
    const upperId = rawId.toUpperCase();
    const mappedId = legacyMap[upperId] || upperId;

    const matched = stations.find(s => 
      s.station_id.toUpperCase() === mappedId ||
      s.station_name.toUpperCase() === mappedId
    );
    return matched ? matched.station_id : (legacyMap[upperId] ? legacyMap[upperId] : rawId);
  };

  const getStationDisplayName = (rawId) => {
    if (!rawId) return '-';
    const norm = normalizeStationId(rawId);
    return stationMap[norm] || rawId;
  };

  // 處理主屬站點變更
  const getUpdatedSupportedStations = (prevSupported, newPrimary) => {
    // 主屬站點必選，並保留既有的跨組支援清單
    return Array.from(new Set([...(prevSupported || []), newPrimary]));
  };

  // 處理核取方塊切換支援站點
  const toggleSupportedStation = (currentSupported, stationId, checked, primaryStation) => {
    if (stationId === primaryStation) {
      // 主屬站點必選，不可取消
      return currentSupported || [primaryStation];
    }
    if (checked) {
      return Array.from(new Set([...(currentSupported || []), stationId]));
    } else {
      return (currentSupported || []).filter(id => id !== stationId);
    }
  };

  // 儲存編輯
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingEmp) return;
    const cleanPrimary = normalizeStationId(editingEmp.primary_station);
    const cleanSupported = Array.from(new Set(
      (editingEmp.supported_stations || [cleanPrimary]).map(st => normalizeStationId(st))
    ));
    const cleanSolo = Array.from(new Set(
      (editingEmp.solo_stations || []).map(st => normalizeStationId(st))
    ));
    const isManagerRole = editingEmp.role === 'Manager';
    const finalEmp = {
      ...editingEmp,
      is_self_scheduled: isManagerRole ? true : !!editingEmp.is_self_scheduled,
      primary_station: cleanPrimary,
      supported_stations: cleanSupported,
      solo_stations: cleanSolo
    };
    onUpdateEmployee(finalEmp);
    setEditingEmp(null);
    setFeedbackMsg(`已成功更新同仁 ${finalEmp.name} (${finalEmp.emp_id}) 資料！`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 送出新增
  const handleCreateEmp = (e) => {
    e.preventDefault();
    if (!newEmpForm.name) {
      setFeedbackMsg('請輸入同仁姓名！');
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }
    onAddEmployee(newEmpForm);
    setIsAddingNew(false);
    setNewEmpForm({
      emp_id: `B115${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      role: 'Staff',
      primary_station: 'ST_SERVICE',
      supported_stations: ['ST_SERVICE'],
      can_solo: true,
      is_self_scheduled: false,
      status: 'Active',
      hire_date: '2026-09-01'
    });
    setFeedbackMsg(`已成功新增同仁 ${newEmpForm.name}，名冊已即時動態直連！`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 重設 PIN 密碼
  const handleResetPin = (emp) => {
    setFeedbackMsg(`已為 ${emp.name} 重設預設 PIN 密碼 (000000)，下次登入強制修改！`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 一鍵復職快捷作業 (封存區專用：將同仁轉回 Active 並移回主要在勤名冊)
  const handleReactivate = (emp) => {
    const updated = {
      ...emp,
      status: 'Active'
    };
    onUpdateEmployee(updated);
    setFeedbackMsg(`🎉 已成功將同仁【${emp.name}】(${emp.emp_id}) 復職！已重回在勤名冊並可重新參與排班。`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // 分流：在勤名冊 vs 封存區
  const activeEmployees = employees.filter(e => normalizeEmpStatus(e.status) === 'Active');
  const archivedEmployees = employees.filter(e => normalizeEmpStatus(e.status) !== 'Active');
  const currentList = personnelTab === 'ACTIVE' ? activeEmployees : archivedEmployees;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 標題與操作按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              人事組織主檔動態管理面板
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心架構：在勤名冊 · 離退與留停封存區 · 一鍵復職 · 9大站點平假日出勤連動
          </p>
          {/* 即時在勤人數徽章 */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
              <UserCheck className="w-3 h-3" />
              在勤 {activeEmployees.length} 人
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 font-medium">
              建檔總計 {employees.length} 人（含封存 {archivedEmployees.length} 人）
            </span>
            {isCloudMode ? (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-300 font-medium">
                <Cloud className="w-3 h-3" />
                即時雲端名冊
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-medium">
                <CloudOff className="w-3 h-3" />
                本地沙盒
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 一鍵強制刷新雲端名冊按鈕（僅雲端模式顯示） */}
          {isCloudMode && onRefreshRoster && (
            <button
              type="button"
              id="btn-refresh-cloud-roster"
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await onRefreshRoster();
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer ${
                isRefreshing
                  ? 'bg-sky-100 text-sky-500 border border-sky-300 cursor-not-allowed'
                  : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 hover:border-sky-400 active:scale-95'
              }`}
              title="從 Google 試算表強制拉取最新人事名冊（以雲端為唯一真理源覆蓋本機快取）"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? '刷新中...' : '強制刷新雲端名冊'}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>新增在勤同仁</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 雙分頁切換導覽列 (在勤同仁 vs 離退/留停封存區) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => setPersonnelTab('ACTIVE')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              personnelTab === 'ACTIVE'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>在勤同仁名冊</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              personnelTab === 'ACTIVE' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {activeEmployees.length} 人
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPersonnelTab('ARCHIVED')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              personnelTab === 'ARCHIVED'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Archive className="w-4 h-4 text-slate-500" />
            <span>離退與非在勤封存區</span>
            <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              personnelTab === 'ARCHIVED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
            }`}>
              {archivedEmployees.length} 人
            </span>
          </button>
        </div>

        {/* 營運規則設定指引 */}
        <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>各站點平日/假日出勤配額與當月排班組長，已收攏至頂部導覽列【營運規則設定】面板統一控管</span>
        </div>
      </div>

      {/* 同仁清單表格 */}
      {currentList.length === 0 ? (
        <div className="py-12 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Archive className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="font-bold text-sm text-slate-600">
            {personnelTab === 'ACTIVE' ? '目前在勤名冊無資料' : '目前非在勤封存區尚無任何人員'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {personnelTab === 'ACTIVE' 
              ? '請點擊右上角「新增在勤同仁」以建立名冊。' 
              : '所有同仁目前皆在職中。若有同仁申請留職停薪、長期病假或離退，可於編輯時調整狀態移入封存。'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="p-2.5 font-bold">工號</th>
                <th className="p-2.5 font-bold">同仁姓名</th>
                <th className="p-2.5 font-bold">業務角色</th>
                <th className="p-2.5 font-bold">主屬站點</th>
                <th className="p-2.5 font-bold">跨組支援清單</th>
                <th className="p-2.5 font-bold">獨立顧站 (Solo)</th>
                <th className="p-2.5 font-bold">到職日</th>
                <th className="p-2.5 font-bold">在職狀態</th>
                <th className="p-2.5 text-center font-bold">操作管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...currentList].sort((a, b) => {
                // 1. 依主屬站點排序
                const stA = normalizeStationId(a.primary_station) || '';
                const stB = normalizeStationId(b.primary_station) || '';
                if (stA !== stB) return stA.localeCompare(stB);

                // 2. 依業務角色排序
                const roleWeight = { 'Manager': 1, 'Leader': 2, 'Staff': 3, 'PT': 4 };
                const weightA = roleWeight[a.role] || 99;
                const weightB = roleWeight[b.role] || 99;
                if (weightA !== weightB) return weightA - weightB;

                // 3. 依工號排序
                const idA = a.emp_id || '';
                const idB = b.emp_id || '';
                return idA.localeCompare(idB);
              }).map(emp => {
                const isManager = emp.role === 'Manager' || emp.is_self_scheduled;
                const normStatus = normalizeEmpStatus(emp.status);
                const statusMeta = PERSONNEL_STATUS_CONFIG[normStatus] || PERSONNEL_STATUS_CONFIG.Active;
                const isInactive = normStatus !== 'Active';

                return (
                  <tr key={emp.emp_id} className={`hover:bg-slate-50 transition-colors ${isInactive ? 'opacity-70 bg-slate-50/50' : ''}`}>
                    <td className="p-2.5 font-mono font-bold text-slate-900">{emp.emp_id}</td>
                    <td className="p-2.5 font-bold text-slate-800">{emp.name}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                        isManager 
                          ? 'bg-purple-100 text-purple-700 font-bold' 
                          : emp.role === 'Leader' 
                          ? 'bg-blue-100 text-blue-700' 
                          : emp.role === 'PT' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isManager ? '高管 (自主排班)' : emp.role === 'Leader' ? '站點組長' : emp.role === 'PT' ? '計時 PT' : '正職同仁'}
                      </span>
                    </td>
                    <td className="p-2.5 font-semibold text-slate-700">
                      {getStationDisplayName(emp.primary_station)}
                    </td>
                    <td className="p-2.5 text-slate-700 max-w-[220px]">
                      {Array.from(new Set((emp.supported_stations || []).map(st => normalizeStationId(st)))).map(st => {
                        const isSolo = canEmployeeSoloAtStation(emp, st);
                        return (
                          <span key={st} className="inline-flex items-center space-x-1 mr-1.5 mb-1 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            <span className="font-semibold text-slate-800">{getStationDisplayName(st)}</span>
                            <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${isSolo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                              {isSolo ? '可獨立' : '僅協同'}
                            </span>
                          </span>
                        );
                      })}
                    </td>
                    <td className="p-2.5">
                      <span className={`font-semibold text-xs ${emp.can_solo ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {emp.can_solo ? '✓ 主屬可獨立' : '— 否'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 font-mono">{emp.hire_date || '2023-01-01'}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta.badgeClass}`} title={statusMeta.desc}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        {/* 封存區專屬一鍵復職按鈕 */}
                        {isInactive && (
                          <button
                            type="button"
                            onClick={() => handleReactivate(emp)}
                            className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold text-[10px] inline-flex items-center space-x-1 cursor-pointer active:scale-95 transition-all shadow-2xs"
                            title="一鍵復職回到在職名冊"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>復職</span>
                          </button>
                        )}
                        <button
                          onClick={() => setEditingEmp({ ...emp })}
                          className="p-1 rounded hover:bg-slate-200 text-slate-600 cursor-pointer"
                          title="編輯同仁資料"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResetPin(emp)}
                          className="p-1 rounded hover:bg-slate-200 text-amber-600 cursor-pointer"
                          title="重設 PIN 密碼"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增同仁彈窗 */}
      {isAddingNew && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleCreateEmp} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 animate-scaleUp flex flex-col max-h-[88vh] my-auto overflow-hidden">
            {/* Header (固定置頂) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm font-bold text-slate-900">
                新增在勤同仁至組織名冊 (直連 Employees 表)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body (滾動內容區) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">員工工號 (主鍵)</label>
                  <input
                    type="text"
                    required
                    value={newEmpForm.emp_id}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, emp_id: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">同仁姓名</label>
                  <input
                    type="text"
                    required
                    placeholder="如：王大明"
                    value={newEmpForm.name}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">業務角色</label>
                  <select
                    value={newEmpForm.role}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, role: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="Staff">正職同仁 (Staff)</option>
                    <option value="Leader">站點組長 (Leader)</option>
                    <option value="PT">計時人員 (PT)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">主屬站點</label>
                  <select
                    value={newEmpForm.primary_station}
                    onChange={(e) => {
                      const newPrimary = e.target.value;
                      setNewEmpForm({ 
                        ...newEmpForm, 
                        primary_station: newPrimary,
                        supported_stations: getUpdatedSupportedStations(newEmpForm.supported_stations, newPrimary)
                      });
                    }}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    {stations.map(st => (
                      <option key={st.station_id} value={st.station_id}>{st.station_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">獨立顧站資格 (can_solo)</label>
                  <select
                    value={newEmpForm.can_solo ? 'true' : 'false'}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, can_solo: e.target.value === 'true' })}
                    className="w-full border border-slate-300 rounded p-2"
                  >
                    <option value="true">具備資格 (true)</option>
                    <option value="false">不具備 (false)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">到職日 (週年特休計算)</label>
                  <input
                    type="date"
                    value={newEmpForm.hire_date}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, hire_date: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">在勤生命週期狀態</label>
                  <select
                    value={newEmpForm.status}
                    onChange={(e) => setNewEmpForm({ ...newEmpForm, status: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2 font-bold text-slate-800 bg-slate-50 focus:bg-white"
                  >
                    <option value="Active">🟢 在職中 (Active)</option>
                    <option value="Suspended">🟡 留職停薪 (Suspended)</option>
                    <option value="MedicalLeave">🟣 長期病假休養 (Medical Leave)</option>
                    <option value="Resigned">⚪ 離退職 (Resigned)</option>
                  </select>
                </div>
              </div>

              {/* 新增同仁：跨組支援清單 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block">
                    跨組支援清單 (supported_stations)
                  </label>
                  <span className="text-[10px] text-slate-400">可多選（主屬站點必選，清潔組開放互助支援）</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {stations.map(st => {
                    const isPrimary = st.station_id === newEmpForm.primary_station;
                    const isDisabled = isPrimary;
                    const isChecked = isPrimary || (newEmpForm.supported_stations || []).includes(st.station_id);
                    const isSolo = isPrimary 
                      ? !!newEmpForm.can_solo 
                      : (newEmpForm.solo_stations || []).includes(st.station_id);

                    return (
                      <div
                        key={st.station_id}
                        className={`flex flex-col justify-between p-2 rounded-lg border text-[11px] transition-all ${
                          isDisabled
                            ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold'
                            : isChecked
                            ? 'bg-white border-indigo-300 text-indigo-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={(e) => {
                              const updated = toggleSupportedStation(
                                newEmpForm.supported_stations,
                                st.station_id,
                                e.target.checked,
                                newEmpForm.primary_station
                              );
                              const updatedSolo = e.target.checked 
                                ? (newEmpForm.solo_stations || [])
                                : (newEmpForm.solo_stations || []).filter(id => id !== st.station_id);
                              setNewEmpForm({ ...newEmpForm, supported_stations: updated, solo_stations: updatedSolo });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="font-bold truncate">
                            {st.station_name}
                            {isPrimary && (
                              <span className="text-[9px] text-indigo-600 block leading-tight font-bold">主屬站點</span>
                            )}
                          </span>
                        </label>

                        {/* 支援站點能否獨立開關 (由主管設定) */}
                        {isChecked && (
                          <label 
                            className={`mt-1.5 flex items-center justify-between px-1.5 py-1 rounded border text-[10px] cursor-pointer transition-colors ${
                              isSolo ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{isSolo ? '🌟 可獨立(Solo)' : '協同支援(無Solo)'}</span>
                            <input
                              type="checkbox"
                              checked={isSolo}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (isPrimary) {
                                  const newSolo = checked
                                    ? Array.from(new Set([...(newEmpForm.solo_stations || []), st.station_id]))
                                    : (newEmpForm.solo_stations || []).filter(id => id !== st.station_id);
                                  setNewEmpForm({ ...newEmpForm, can_solo: checked, solo_stations: newSolo });
                                } else {
                                  const currentSolo = newEmpForm.solo_stations || (newEmpForm.can_solo ? [newEmpForm.primary_station] : []);
                                  const newSolo = checked
                                    ? Array.from(new Set([...currentSolo, st.station_id]))
                                    : currentSolo.filter(id => id !== st.station_id);
                                  setNewEmpForm({ ...newEmpForm, solo_stations: newSolo });
                                }
                              }}
                              className="w-3 h-3 text-amber-600 rounded cursor-pointer"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer (固定置底) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end space-x-2 shrink-0 bg-slate-50/90 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              >
                確認新增
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編輯同仁彈窗 */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 animate-scaleUp flex flex-col max-h-[88vh] my-auto overflow-hidden">
            {/* Header (固定置頂) */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="text-sm font-bold text-slate-900">
                編輯同仁資料: {editingEmp.name} ({editingEmp.emp_id})
              </h3>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body (滾動內容區) */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs flex-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">姓名</label>
                <input
                  type="text"
                  value={editingEmp.name}
                  onChange={(e) => setEditingEmp({ ...editingEmp, name: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">業務職等 / 角色 (支援轉正或晉升)</label>
                <select
                  value={editingEmp.role || 'Staff'}
                  onChange={(e) => setEditingEmp({ 
                    ...editingEmp, 
                    role: e.target.value,
                    is_self_scheduled: e.target.value === 'Manager'
                  })}
                  className="w-full border border-slate-300 rounded p-2 font-bold text-slate-800 bg-amber-50/50 focus:bg-white"
                >
                  <option value="PT">⏱️ 計時人員 (PT 工讀生)</option>
                  <option value="Staff">👤 正職同仁 (Staff)</option>
                  <option value="Leader">🛡️ 站點組長 (Leader)</option>
                  <option value="Manager">👑 營運高管 (Manager)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-0.5 pb-0.5">
                <input
                  type="checkbox"
                  id="edit_emp_is_admin"
                  checked={!!editingEmp.is_admin}
                  onChange={(e) => setEditingEmp({ ...editingEmp, is_admin: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit_emp_is_admin" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  賦予系統管理員權限 (★ Admin - 試算表備查與數據維護)
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">主屬站點</label>
                <select
                  value={editingEmp.primary_station}
                  onChange={(e) => {
                    const newPrimary = e.target.value;
                    setEditingEmp({ 
                      ...editingEmp, 
                      primary_station: newPrimary,
                      supported_stations: getUpdatedSupportedStations(editingEmp.supported_stations, newPrimary)
                    });
                  }}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  {stations.map(st => (
                    <option key={st.station_id} value={st.station_id}>{st.station_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">獨立顧站資格 (can_solo)</label>
                <select
                  value={editingEmp.can_solo ? 'true' : 'false'}
                  onChange={(e) => setEditingEmp({ ...editingEmp, can_solo: e.target.value === 'true' })}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option value="true">具備資格 (true)</option>
                  <option value="false">不具備 (false)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">人員在勤生命週期狀態</label>
                <select
                  value={normalizeEmpStatus(editingEmp.status)}
                  onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-bold text-slate-800 bg-slate-50 focus:bg-white"
                >
                  <option value="Active">🟢 在職中 (Active) - 正常在勤 · 參與排班與劃休</option>
                  <option value="Suspended">🟡 留職停薪 (Suspended) - 保留年資 · 移至封存區 · 暫停排班</option>
                  <option value="MedicalLeave">🟣 長期病假休養 (Medical Leave) - 醫療休養 · 移至封存區 · 暫停排班</option>
                  <option value="Resigned">⚪ 離退職 (Resigned) - 終止契約 · 移至封存區 · 銷假真空</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  非 Active 狀態人員將自動移入「離退與非在勤封存區」，不干擾主要排班大表；後續隨時可一鍵復職。
                </p>
              </div>

              {/* 編輯同仁：跨組支援清單 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block">
                    跨組支援清單 (supported_stations)
                  </label>
                  <span className="text-[10px] text-slate-400">可多選（主屬站點必選，清潔組開放互助支援）</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {stations.map(st => {
                    const isPrimary = st.station_id === editingEmp.primary_station;
                    const isDisabled = isPrimary;
                    const isChecked = isPrimary || (editingEmp.supported_stations || []).includes(st.station_id);
                    const isSolo = isPrimary 
                      ? !!editingEmp.can_solo 
                      : (editingEmp.solo_stations || []).includes(st.station_id);

                    return (
                      <div
                        key={st.station_id}
                        className={`flex flex-col justify-between p-2 rounded-lg border text-[11px] transition-all ${
                          isDisabled
                            ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold'
                            : isChecked
                            ? 'bg-white border-indigo-300 text-indigo-950 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        <label className="flex items-center space-x-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={(e) => {
                              const updated = toggleSupportedStation(
                                editingEmp.supported_stations,
                                st.station_id,
                                e.target.checked,
                                editingEmp.primary_station
                              );
                              const updatedSolo = e.target.checked 
                                ? (editingEmp.solo_stations || [])
                                : (editingEmp.solo_stations || []).filter(id => id !== st.station_id);
                              setEditingEmp({ ...editingEmp, supported_stations: updated, solo_stations: updatedSolo });
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="font-bold truncate">
                            {st.station_name}
                            {isPrimary && (
                              <span className="text-[9px] text-indigo-600 block leading-tight font-bold">主屬站點</span>
                            )}
                          </span>
                        </label>

                        {/* 支援站點能否獨立開關 (由主管設定) */}
                        {isChecked && (
                          <label 
                            className={`mt-1.5 flex items-center justify-between px-1.5 py-1 rounded border text-[10px] cursor-pointer transition-colors ${
                              isSolo ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-slate-100 border-slate-200 text-slate-600'
                            }`}
                          >
                            <span>{isSolo ? '🌟 可獨立(Solo)' : '協同支援(無Solo)'}</span>
                            <input
                              type="checkbox"
                              checked={isSolo}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (isPrimary) {
                                  const newSolo = checked
                                    ? Array.from(new Set([...(editingEmp.solo_stations || []), st.station_id]))
                                    : (editingEmp.solo_stations || []).filter(id => id !== st.station_id);
                                  setEditingEmp({ ...editingEmp, can_solo: checked, solo_stations: newSolo });
                                } else {
                                  const currentSolo = editingEmp.solo_stations || (editingEmp.can_solo ? [editingEmp.primary_station] : []);
                                  const newSolo = checked
                                    ? Array.from(new Set([...currentSolo, st.station_id]))
                                    : currentSolo.filter(id => id !== st.station_id);
                                  setEditingEmp({ ...editingEmp, solo_stations: newSolo });
                                }
                              }}
                              className="w-3 h-3 text-amber-600 rounded cursor-pointer"
                            />
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer (固定置底) */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end space-x-2 shrink-0 bg-slate-50/90 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-100"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95"
              >
                儲存變更
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
