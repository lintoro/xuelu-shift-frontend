import React, { useState } from 'react';
import { Users, UserPlus, Edit3, Shield, KeyRound, Check, X, Award, AlertTriangle, Sparkles } from 'lucide-react';
import { canEmployeeSoloAtStation } from '../../data/mockMasterData.js';

export default function PersonnelManagement({
  employees,
  stations,
  onUpdateEmployee,
  onAddEmployee,
  onUpdateStationLeader,
  currentSimulatedDate
}) {
  const [editingEmp, setEditingEmp] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

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
    const matched = stations.find(s => 
      s.station_id.toUpperCase() === rawId.toUpperCase() ||
      s.station_name.toUpperCase() === rawId.toUpperCase()
    );
    return matched ? matched.station_id : rawId;
  };

  const getStationDisplayName = (rawId) => {
    if (!rawId) return '-';
    const norm = normalizeStationId(rawId);
    return stationMap[norm] || rawId;
  };

  // 處理主屬站點變更（落實清潔組雙向隔離規則）
  const getUpdatedSupportedStations = (prevSupported, newPrimary) => {
    if (newPrimary === 'ST_CLEAN') {
      // 規則 A：清潔組為固定特別單位，不支援其它組別
      return ['ST_CLEAN'];
    }
    // 規則 B：其它組別不讓任何人支援清潔組，且主屬站點必選
    const cleaned = (prevSupported || []).filter(id => id !== 'ST_CLEAN');
    return Array.from(new Set([...cleaned, newPrimary]));
  };

  // 處理核取方塊切換支援站點
  const toggleSupportedStation = (currentSupported, stationId, checked, primaryStation) => {
    if (primaryStation === 'ST_CLEAN') {
      return ['ST_CLEAN'];
    }
    if (stationId === 'ST_CLEAN') {
      // 禁止外組同仁支援清潔組
      return (currentSupported || []).filter(id => id !== 'ST_CLEAN');
    }
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
    const finalEmp = {
      ...editingEmp,
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 標題與操作按鈕 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              人事組織主檔動態管理面板 (動態直連零死碼)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心決策 14 & 9-2：免開試算表 · 增修同仁 · 站點組長動態選派 · 離退職銷假連動
          </p>
        </div>

        <button
          onClick={() => setIsAddingNew(true)}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm cursor-pointer active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>新增在勤同仁</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 站點組長 (Leader) 動態指派快顯列 */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
            <Award className="w-4 h-4 text-amber-600" />
            <span>各組別當月排班組長 (Leader) 動態選派</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950 dark:text-purple-300">
            ★ 每月 8-10 日主管排班設定期：指定完成各組別當月組長
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {stations.map(station => {
            const currentLeaderId = station.leader_emp_id || station.leader_id || '';
            return (
              <div key={station.station_id} className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                <div className="text-[11px] font-bold text-slate-800 mb-1 truncate flex items-center justify-between">
                  <span>{station.station_name}</span>
                  {currentLeaderId && (
                    <span className="text-[9px] px-1 py-0.2 bg-amber-50 text-amber-700 rounded font-bold border border-amber-200">
                      組長在勤
                    </span>
                  )}
                </div>
                <select
                  value={currentLeaderId}
                  onChange={(e) => onUpdateStationLeader(station.station_id, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-[11px] font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="">(未指派/主管統籌)</option>
                  {employees.filter(e => !e.is_self_scheduled && e.role !== 'PT').map(e => (
                    <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id})</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* 同仁清單表格 */}
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
            {employees.map(emp => {
              const isManager = emp.is_self_scheduled;
              const isInactive = emp.status !== 'Active';

              return (
                <tr key={emp.emp_id} className={`hover:bg-slate-50 ${isInactive ? 'opacity-50 bg-slate-50/50' : ''}`}>
                  <td className="p-2.5 font-mono font-bold text-slate-900">{emp.emp_id}</td>
                  <td className="p-2.5 font-bold text-slate-800">{emp.name}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${
                      isManager 
                        ? 'bg-purple-100 text-purple-700' 
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
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      emp.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {emp.status === 'Active' ? '在職中' : '離退職'}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
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
              </div>

              {/* 新增同仁：跨組支援清單 (落實清潔組雙向隔離) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block">
                    跨組支援清單 (supported_stations)
                  </label>
                  {newEmpForm.primary_station === 'ST_CLEAN' ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                      特別單位：不支援外組
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">可多選（主屬站點必選）</span>
                  )}
                </div>

                {newEmpForm.primary_station === 'ST_CLEAN' && (
                  <div className="p-2 mb-2 rounded bg-amber-50/90 border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>清潔組為固定特別單位，不支援其它組別，跨組支援清單固定鎖死。</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {stations.map(st => {
                    const isCleanUnit = st.station_id === 'ST_CLEAN';
                    const isPrimary = st.station_id === newEmpForm.primary_station;
                    const isCleanPrimary = newEmpForm.primary_station === 'ST_CLEAN';
                    
                    const isDisabled = isPrimary || (isCleanPrimary ? !isCleanUnit : isCleanUnit);
                    const isChecked = isCleanPrimary ? isCleanUnit : (isPrimary || (newEmpForm.supported_stations || []).includes(st.station_id));
                    const isSolo = isPrimary 
                      ? !!newEmpForm.can_solo 
                      : (newEmpForm.solo_stations || []).includes(st.station_id);

                    return (
                      <div
                        key={st.station_id}
                        className={`flex flex-col justify-between p-2 rounded-lg border text-[11px] transition-all ${
                          isDisabled
                            ? isCleanUnit && !isCleanPrimary
                              ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400'
                              : 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold'
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
                            {isCleanUnit && !isCleanPrimary && (
                              <span className="text-[9px] text-rose-500 block leading-tight font-normal">禁止外援</span>
                            )}
                            {isPrimary && (
                              <span className="text-[9px] text-indigo-600 block leading-tight font-bold">主屬站點</span>
                            )}
                          </span>
                        </label>

                        {/* 支援站點能否獨立開關 (由主管設定) */}
                        {isChecked && !isCleanUnit && (
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
                <label className="font-bold text-slate-700 block mb-1">在職狀態 (離職銷假連動)</label>
                <select
                  value={editingEmp.status}
                  onChange={(e) => setEditingEmp({ ...editingEmp, status: e.target.value })}
                  className="w-full border border-slate-300 rounded p-2 font-bold"
                >
                  <option value="Active">在職中 (Active)</option>
                  <option value="Inactive">離職/停用 (自動啟動離職銷假真空)</option>
                </select>
              </div>

              {/* 編輯同仁：跨組支援清單 (落實清潔組雙向隔離) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700 block">
                    跨組支援清單 (supported_stations)
                  </label>
                  {editingEmp.primary_station === 'ST_CLEAN' ? (
                    <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                      特別單位：不支援外組
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">可多選（主屬站點必選）</span>
                  )}
                </div>

                {editingEmp.primary_station === 'ST_CLEAN' && (
                  <div className="p-2 mb-2 rounded bg-amber-50/90 border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>清潔組為固定特別單位，不支援其它組別，跨組支援清單固定鎖死。</span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  {stations.map(st => {
                    const isCleanUnit = st.station_id === 'ST_CLEAN';
                    const isPrimary = st.station_id === editingEmp.primary_station;
                    const isCleanPrimary = editingEmp.primary_station === 'ST_CLEAN';
                    
                    const isDisabled = isPrimary || (isCleanPrimary ? !isCleanUnit : isCleanUnit);
                    const isChecked = isCleanPrimary ? isCleanUnit : (isPrimary || (editingEmp.supported_stations || []).includes(st.station_id));
                    const isSolo = isPrimary 
                      ? !!editingEmp.can_solo 
                      : (editingEmp.solo_stations || []).includes(st.station_id);

                    return (
                      <div
                        key={st.station_id}
                        className={`flex flex-col justify-between p-2 rounded-lg border text-[11px] transition-all ${
                          isDisabled
                            ? isCleanUnit && !isCleanPrimary
                              ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400'
                              : 'bg-indigo-50/60 border-indigo-200 text-indigo-900 font-semibold'
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
                            {isCleanUnit && !isCleanPrimary && (
                              <span className="text-[9px] text-rose-500 block leading-tight font-normal">禁止外援</span>
                            )}
                            {isPrimary && (
                              <span className="text-[9px] text-indigo-600 block leading-tight font-bold">主屬站點</span>
                            )}
                          </span>
                        </label>

                        {/* 支援站點能否獨立開關 (由主管設定) */}
                        {isChecked && !isCleanUnit && (
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
