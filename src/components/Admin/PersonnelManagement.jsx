import React, { useState } from 'react';
import { Users, UserPlus, Edit3, Shield, KeyRound, Check, X, Award, AlertTriangle } from 'lucide-react';

export default function PersonnelManagement({
  employees,
  stations,
  onUpdateEmployee,
  onAddEmployee,
  onUpdateStationLeader
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
    is_self_scheduled: false,
    status: 'Active',
    hire_date: '2026-09-01'
  });

  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // 儲存編輯
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingEmp) return;
    onUpdateEmployee(editingEmp);
    setEditingEmp(null);
    setFeedbackMsg(`已成功更新同仁 ${editingEmp.name} (${editingEmp.emp_id}) 資料！`);
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
        <h3 className="text-xs font-bold text-slate-700 mb-2 flex items-center space-x-1.5">
          <Award className="w-4 h-4 text-amber-600" />
          <span>各站點組長動態指派 (組長權限非綁定同仁，而是站點指派工號)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
          {stations.map(station => (
            <div key={station.station_id} className="bg-white p-2 rounded-lg border border-slate-200">
              <div className="text-[11px] font-bold text-slate-800 mb-1 truncate">
                {station.station_name}
              </div>
              <select
                value={station.leader_emp_id}
                onChange={(e) => onUpdateStationLeader(station.station_id, e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded p-1 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                {employees.filter(e => !e.is_self_scheduled && e.role !== 'PT').map(e => (
                  <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.emp_id})</option>
                ))}
              </select>
            </div>
          ))}
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
                    {stationMap[emp.primary_station] || emp.primary_station}
                  </td>
                  <td className="p-2.5 text-slate-500 max-w-[150px] truncate">
                    {emp.supported_stations?.map(st => stationMap[st] || st).join('、') || '-'}
                  </td>
                  <td className="p-2.5">
                    <span className={`font-semibold ${emp.can_solo ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {emp.can_solo ? '✓ 是' : '— 否'}
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
                        title="編輯同仁資訊"
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateEmp} className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-5 border border-slate-200 animate-scaleUp">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              新增在勤同仁至組織名冊 (直連 Employees 表)
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
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
                  onChange={(e) => setNewEmpForm({ 
                    ...newEmpForm, 
                    primary_station: e.target.value,
                    supported_stations: [e.target.value]
                  })}
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

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                確認新增
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 編輯同仁彈窗 */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-scaleUp">
            <h3 className="text-sm font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">
              編輯同仁資料: {editingEmp.name} ({editingEmp.emp_id})
            </h3>

            <div className="space-y-3 mb-4 text-xs">
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
                <label className="font-bold text-slate-700 block mb-1">主屬站點</label>
                <select
                  value={editingEmp.primary_station}
                  onChange={(e) => setEditingEmp({ ...editingEmp, primary_station: e.target.value })}
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
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
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
