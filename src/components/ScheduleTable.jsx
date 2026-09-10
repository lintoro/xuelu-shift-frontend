import React, { useState } from 'react';
import { SHIFT_TYPES } from '../types/scheduler.js';
import { User, Sparkles, AlertCircle, Calendar, Filter } from 'lucide-react';

export default function ScheduleTable({
  scheduleResult,
  validation,
  employees,
  stations,
  rules,
  selectedDay,
  onSelectDay,
  onExportIcs,
  onExportCsv,
  currentUser,
  shiftTypes = SHIFT_TYPES
}) {
  const isLeader = currentUser?.role === 'Leader';
  const myLeaderStation = isLeader 
    ? (stations.find(s => s.leader_emp_id === currentUser?.emp_id) || 
       stations.find(s => s.station_id === currentUser?.primary_station)) 
    : null;

  const [filterRole, setFilterRole] = useState('ALL'); // ALL, Leader, Staff, PT, Manager
  // 組長預設聚焦本組站點，非組長預設 ALL
  const [filterStation, setFilterStation] = useState(myLeaderStation ? myLeaderStation.station_id : 'ALL');

  const totalDays = scheduleResult?.totalDays || 30;
  const scheduleMap = scheduleResult?.scheduleMap || {};

  const stationNameMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));
  const effectiveShiftDefs = shiftTypes || SHIFT_TYPES;

  // 取得平假日資訊
  const [year, month] = (rules.target_year_month || '2026-09').split('-').map(Number);
  const dayHeaders = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekDayStr = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];
    dayHeaders.push({ day: d, isWeekend, weekDayStr });
  }

  // 雙重篩選人員（角色 + 站點/組別）
  const filteredEmployees = employees.filter(emp => {
    if (filterRole !== 'ALL') {
      if (filterRole === 'Manager') {
        if (!emp.is_self_scheduled) return false;
      } else if (emp.role !== filterRole) {
        return false;
      }
    }
    if (filterStation !== 'ALL') {
      if (emp.primary_station !== filterStation) return false;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* 表頭控制列 */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-slate-800">
            {filterStation === 'ALL' 
              ? '全館出勤排班總表 (Schedule Matrix)' 
              : `【${stationNameMap[filterStation] || filterStation}】出勤排班大表`}
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
            {rules?.work_hour_model === 'FLEX_2_WEEK' 
              ? '雙週變形 (30條2項 · 2週4休)' 
              : rules?.work_hour_model === 'FLEX_4_WEEK' 
              ? '四週變形 (30-1條 · 4週8休)' 
              : '常態工時 (7休1)'}
          </span>
          <span className="text-xs text-slate-500">
            共 {filteredEmployees.length} 位人員 · 點擊日期表頭可檢視該日站點燈號
          </span>
        </div>

        {/* 站點組別過濾、角色分類切換 Tab 與匯出按鈕 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 站點/組別下拉過濾選單 (需求 #007 組長預設聚焦本組) */}
          <div className="flex items-center space-x-1.5 bg-white rounded-lg px-2.5 py-1 text-xs border border-slate-300 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-500 font-semibold">組別：</span>
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
            >
              <option value="ALL">全館營業站點 (全部)</option>
              {stations.map(st => (
                <option key={st.station_id} value={st.station_id}>
                  {st.station_name} {myLeaderStation?.station_id === st.station_id ? '(本組)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 角色分類切換 */}
          <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-lg text-xs font-semibold text-slate-600">
            {[
              { id: 'ALL', label: '全部人員' },
              { id: 'Leader', label: '站點組長' },
              { id: 'Staff', label: '正職同仁' },
              { id: 'PT', label: '計時PT候選池' },
              { id: 'Manager', label: '高階主管' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  filterRole === tab.id ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 匯出功能按鈕 */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onExportIcs && onExportIcs()}
              title="下載我的專屬手機日曆 (.ics)，支援 iPhone 與 Google Calendar"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>匯出我的 .ics</span>
            </button>

            <button
              onClick={() => onExportCsv && onExportCsv()}
              title="匯出全館美化班表 Excel / CSV"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>匯出全館 CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 排班矩陣大表 Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {/* 人員固定欄 */}
              <th className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 z-20 bg-slate-50 min-w-[140px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                同仁 / 站點
              </th>

              {/* 1 ~ 30 日表頭 */}
              {dayHeaders.map(({ day, isWeekend, weekDayStr }) => {
                const isSelected = selectedDay === day;
                return (
                  <th
                    key={day}
                    id={`schedule-day-col-${day}`}
                    onClick={() => onSelectDay(day)}
                    className={`p-1.5 text-center border-r border-slate-200 min-w-[34px] cursor-pointer transition-colors select-none ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-extrabold shadow-inner' 
                        : isWeekend 
                        ? 'bg-rose-50/70 text-rose-700 hover:bg-rose-100/70' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={`點擊檢視 9月${day}日 (${weekDayStr}) 站點合規燈號`}
                  >
                    <div className="text-[11px] font-bold leading-none">{day}</div>
                    <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-indigo-100' : isWeekend ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                      {weekDayStr}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={totalDays + 1} className="p-8 text-center text-slate-400 text-xs">
                  目前篩選條件下無符合條件之同仁。
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isManager = emp.is_self_scheduled;

                return (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 同仁名稱與標籤欄 */}
                    <td className="p-2.5 border-r border-slate-200 sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[90px]">{emp.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isManager 
                            ? 'bg-purple-100 text-purple-700' 
                            : emp.role === 'Leader'
                            ? 'bg-blue-100 text-blue-700'
                            : emp.role === 'PT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isManager ? '高管' : emp.role === 'Leader' ? '組長' : emp.role === 'PT' ? 'PT' : '正職'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {stationNameMap[emp.primary_station] || emp.primary_station}
                        {emp.can_solo && ' · Solo'}
                      </div>
                    </td>

                    {/* 1 ~ 30 日班別格 */}
                    {dayHeaders.map(({ day, isWeekend }) => {
                      const shift = scheduleMap[emp.emp_id]?.[day];
                      const shiftCode = shift?.shift_type;
                      const shiftDef = effectiveShiftDefs[shiftCode];

                      let cellBg = isWeekend ? 'bg-rose-50/20' : '';
                      let pillStyle = 'text-slate-300';
                      let label = '-';

                      if (isManager) {
                        pillStyle = 'text-slate-300 font-light';
                        label = '留白';
                      } else if (shiftCode === 'OFF') {
                        pillStyle = 'bg-rose-100 text-rose-700 font-bold border border-rose-200';
                        label = '休';
                      } else if (shiftCode === 'TERM_OFF') {
                        pillStyle = 'bg-slate-200 text-slate-500 font-semibold';
                        label = '空';
                      } else if (shiftCode === 'AL') {
                        pillStyle = 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
                        label = '特';
                      } else if (shiftCode === 'CT') {
                        pillStyle = 'bg-purple-100 text-purple-800 font-bold border border-purple-300';
                        label = '補';
                      } else if (shiftDef) {
                        label = shiftCode;
                        pillStyle = `${shiftDef.color || 'bg-indigo-100 text-indigo-800'} font-bold border shadow-2xs`;
                      }

                      return (
                        <td
                          key={day}
                          className={`p-1 text-center border-r border-slate-100 ${cellBg} ${
                            selectedDay === day ? 'bg-indigo-50/50' : ''
                          }`}
                          title={
                            shift
                              ? `${emp.name} | ${day}日: ${shiftCode || '留白'} (${stationNameMap[shift.station_id] || shift.station_id || '-'}) - ${shift.note || shiftDef?.name || ''}`
                              : ''
                          }
                        >
                          <div
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[11px] transition-transform ${pillStyle}`}
                          >
                            {label}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 底部班別圖例說明 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700">圖例說明：</span>
          {Object.values(effectiveShiftDefs).filter(s => s.code !== 'TERM_OFF').map(s => (
            <div key={s.code} className="flex items-center space-x-1">
              <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${s.color || 'bg-slate-200 text-slate-700'}`}>
                {s.code === 'OFF' ? '休' : s.code === 'AL' ? '特' : s.code === 'CT' ? '補' : s.code}
              </span>
              <span>{s.name} ({s.startTime}~{s.endTime})</span>
            </div>
          ))}
        </div>

        <div className="text-slate-400">
          ★ 高階主管依規範自主排班，大表維持留白；點擊表頭切換檢視每日站點狀態
        </div>
      </div>
    </div>
  );
}
