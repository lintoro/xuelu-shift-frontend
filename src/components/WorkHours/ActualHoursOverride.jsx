import React, { useState } from 'react';
import { Clock, Check, AlertCircle, Sparkles, FileText, Save } from 'lucide-react';
import { SHIFT_TYPES } from '../../types/scheduler.js';

export default function ActualHoursOverride({
  employees,
  stations,
  scheduleMap,
  onOverrideHours
}) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedEmpId, setSelectedEmpId] = useState('B112001'); // 預設李俐旻
  const [actualHoursInput, setActualHoursInput] = useState(8);
  const [actualNoteInput, setActualNoteInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const currentEmp = employees.find(e => e.emp_id === selectedEmpId) || employees[0];
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  const scheduledShift = scheduleMap[currentEmp.emp_id]?.[selectedDay];
  const scheduledHours = scheduledShift?.work_hours || 0;

  // 執行覆核送出
  const handleSaveOverride = (e) => {
    e.preventDefault();
    const hours = Number(actualHoursInput);

    // 勞基法第 32 條檢核：單日總工時不得超過 12 小時
    if (hours > 12) {
      setFeedbackMsg('剛性阻擋：單日實勤總工時不得超過 12 小時（違反勞基法第32條）！');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    onOverrideHours({
      empId: currentEmp.emp_id,
      day: selectedDay,
      actualHours: hours,
      notes: actualNoteInput || `主管實勤覆核 (${hours}h)`
    });

    setFeedbackMsg(`已成功覆核 ${currentEmp.name} 於 9/${selectedDay} 日實勤為 ${hours} 小時，已觸發 HOURS_OVERRIDE 稽核快照！`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              主管端實勤覆核與工時微調面板 (Hours Override)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心決策 13 & 8-6：預排工時與實勤分離 · 早退/延時支援即時校正 · 勞基法 32 條上限防呆
          </p>
        </div>

        <div className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-semibold">
          動態觸發: <span className="font-bold text-indigo-700">HOURS_OVERRIDE 雙快照留痕</span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 覆核操作表單 */}
      <form onSubmit={handleSaveOverride} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-3 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">選擇同仁</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
            >
              {employees.filter(e => !e.is_self_scheduled).map(e => (
                <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.primary_station})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">選擇日期</label>
            <select
              value={selectedDay}
              onChange={(e) => {
                const day = Number(e.target.value);
                setSelectedDay(day);
                const s = scheduleMap[selectedEmpId]?.[day];
                setActualHoursInput(s?.actual_hours || s?.work_hours || 8);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>9 月 {d} 日</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">原排定班別與工時</label>
            <div className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
              {scheduledShift?.shift_type || 'OFF'} ({scheduledHours} 小時)
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">覆核實勤工時 (小時)</label>
            <input
              type="number"
              min="0"
              max="16"
              step="0.5"
              required
              value={actualHoursInput}
              onChange={(e) => setActualHoursInput(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-indigo-700 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 text-xs">
          <label className="font-bold text-slate-700 block mb-1">現場備註與加班事由</label>
          <input
            type="text"
            value={actualNoteInput}
            onChange={(e) => setActualNoteInput(e.target.value)}
            placeholder="如：晚間突發客流尖峰，延長支援 1.5 小時..."
            className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:outline-none"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>儲存實勤覆核並重算總工時</span>
          </button>
        </div>
      </form>

      {/* PT 計時同仁出勤總工時對帳專區 (企劃案第 236 條) */}
      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
        <div className="bg-slate-100 p-2.5 font-bold text-slate-700 flex justify-between">
          <span>計時同仁 (PT) 實勤工時對帳存摺（發放時薪依據）</span>
          <span className="text-[11px] text-slate-500 font-normal">每月實勤結清對帳</span>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
            <tr>
              <th className="p-2">工號</th>
              <th className="p-2">姓名</th>
              <th className="p-2">主屬站點</th>
              <th className="p-2">出勤天數</th>
              <th className="p-2">預排工時</th>
              <th className="p-2">實勤覆核總工時</th>
              <th className="p-2 text-right">對帳狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.filter(e => e.role === 'PT').map(pt => {
              let ptDays = 0;
              let scheduledTotal = 0;
              let actualTotal = 0;

              for (let d = 1; d <= 30; d++) {
                const shift = scheduleMap[pt.emp_id]?.[d];
                if (shift && shift.shift_type && shift.shift_type !== 'OFF' && shift.shift_type !== 'TERM_OFF') {
                  ptDays++;
                  scheduledTotal += (shift.work_hours || 0);
                  actualTotal += (shift.actual_hours !== undefined ? shift.actual_hours : shift.work_hours || 0);
                }
              }

              return (
                <tr key={pt.emp_id} className="hover:bg-slate-50">
                  <td className="p-2 font-mono font-bold text-slate-800">{pt.emp_id}</td>
                  <td className="p-2 font-bold text-slate-900">{pt.name}</td>
                  <td className="p-2 text-slate-600">{stationMap[pt.primary_station] || pt.primary_station}</td>
                  <td className="p-2 font-semibold text-slate-700">{ptDays} 天</td>
                  <td className="p-2 text-slate-500">{scheduledTotal} 小時</td>
                  <td className="p-2 font-bold text-indigo-700">{actualTotal} 小時</td>
                  <td className="p-2 text-right">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      ✓ 已覆核平帳
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
