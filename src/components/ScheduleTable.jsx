import React, { useState } from 'react';
import { SHIFT_TYPES } from '../types/scheduler.js';
import { User, Sparkles, AlertCircle, Calendar } from 'lucide-react';

export default function ScheduleTable({
  scheduleResult,
  validation,
  employees,
  stations,
  rules,
  selectedDay,
  onSelectDay
}) {
  const [filterRole, setFilterRole] = useState('ALL'); // ALL, Leader, Staff, PT, Manager
  const totalDays = scheduleResult?.totalDays || 30;
  const scheduleMap = scheduleResult?.scheduleMap || {};

  const stationNameMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

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

  // 篩選人員
  const filteredEmployees = employees.filter(emp => {
    if (filterRole === 'ALL') return true;
    if (filterRole === 'Manager') return emp.is_self_scheduled;
    return emp.role === filterRole;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* 表頭控制列 */}
      <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center space-x-3">
          <h2 className="text-sm font-bold text-slate-800">全館出勤排班總表 (Schedule Matrix)</h2>
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

        {/* 角色分類切換 Tab 與匯出按鈕 */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* 排班矩陣滾動容器 */}
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full border-collapse text-left text-xs">
          {/* 表頭：天數與星期 */}
          <thead className="bg-slate-100 text-slate-700 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-2.5 border-b border-r border-slate-200 sticky left-0 z-30 bg-slate-100 min-w-[150px] font-bold">
                同仁姓名 / 主屬
              </th>
              {dayHeaders.map(({ day, isWeekend, weekDayStr }) => (
                <th
                  key={day}
                  id={`schedule-day-col-${day}`}
                  onClick={() => onSelectDay(day)}
                  className={`p-1.5 text-center border-b border-r border-slate-200 cursor-pointer min-w-[34px] transition-colors select-none ${
                    selectedDay === day 
                      ? 'bg-indigo-600 text-white font-bold' 
                      : isWeekend 
                      ? 'bg-rose-50/70 text-rose-700 font-semibold hover:bg-rose-100' 
                      : 'hover:bg-slate-200'
                  }`}
                >
                  <div className="text-[11px]">{day}</div>
                  <div className={`text-[10px] ${selectedDay === day ? 'text-indigo-100' : isWeekend ? 'text-rose-500' : 'text-slate-400'}`}>
                    {weekDayStr}
                  </div>
                </th>
              ))}
              <th className="p-2 text-center border-b border-slate-200 min-w-[50px] font-bold bg-slate-100">
                出勤
              </th>
              <th className="p-2 text-center border-b border-slate-200 min-w-[50px] font-bold bg-slate-100">
                休假
              </th>
              <th className="p-2 text-center border-b border-slate-200 min-w-[60px] font-bold bg-slate-100">
                最大連勤
              </th>
            </tr>
          </thead>

          {/* 表身：同仁排班清單 */}
          <tbody className="divide-y divide-slate-200">
            {filteredEmployees.map((emp) => {
              const stats = validation?.employeeStats?.[emp.emp_id] || { workDays: 0, offDays: 0, maxConsecutive: 0 };
              const isManager = emp.is_self_scheduled;

              return (
                <tr key={emp.emp_id} className="hover:bg-indigo-50/20 transition-colors">
                  {/* 人員名稱與主要資訊 (Sticky Left) */}
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
                    const shiftDef = SHIFT_TYPES[shiftCode];

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
                    } else if (shiftDef) {
                      label = shiftCode;
                      pillStyle = `${shiftDef.color} font-bold border shadow-2xs`;
                    }

                    return (
                      <td
                        key={day}
                        className={`p-1 text-center border-r border-slate-100 ${cellBg} ${
                          selectedDay === day ? 'bg-indigo-50/50' : ''
                        }`}
                        title={
                          shift
                            ? `${emp.name} | ${day}日: ${shiftCode || '留白'} (${stationNameMap[shift.station_id] || shift.station_id || '-'}) - ${shift.note || ''}`
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

                  {/* 統計數值 */}
                  <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-100">
                    {isManager ? '-' : `${stats.workDays}d`}
                  </td>
                  <td className="p-2 text-center font-bold text-emerald-700 border-r border-slate-100">
                    {isManager ? '-' : `${stats.offDays}d`}
                  </td>
                  <td className="p-2 text-center font-bold text-slate-700">
                    {isManager ? '-' : (
                      <span className={stats.maxConsecutive > 6 ? 'text-rose-600 font-extrabold' : ''}>
                        {stats.maxConsecutive}d
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 班別圖例說明 */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs">
        <span className="font-semibold text-slate-600">班別圖例:</span>
        <div className="flex items-center space-x-1.5">
          <span className="w-5 h-5 rounded bg-sky-100 text-sky-800 border border-sky-300 font-bold flex items-center justify-center text-[10px]">A</span>
          <span className="text-slate-600">早班 (08:30-17:30 · 8h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold flex items-center justify-center text-[10px]">B</span>
          <span className="text-slate-600">中早班 (10:00-19:00 · 8h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold flex items-center justify-center text-[10px]">C</span>
          <span className="text-slate-600">中晚班打烊 (10:30-19:30 · 8h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-5 h-5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-bold flex items-center justify-center text-[10px]">休</span>
          <span className="text-slate-600">法定例休 / 自選休 (0h)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-5 h-5 rounded bg-slate-100 text-slate-400 font-light flex items-center justify-center text-[10px]">留</span>
          <span className="text-slate-600">高階主管自主留白</span>
        </div>
      </div>
    </div>
  );
}
