import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Users, UserCheck, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { isWorkingShift } from '../types/scheduler.js';

export const STATION_STYLE_MAP = {
  ST_ADMIN: {
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    border: 'border-l-4 border-l-indigo-500',
    dot: 'bg-indigo-500',
    pill: 'bg-indigo-600 text-white'
  },
  ST_SERVICE: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    border: 'border-l-4 border-l-blue-500',
    dot: 'bg-blue-500',
    pill: 'bg-blue-600 text-white'
  },
  ST_EXPERIENCE: {
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    border: 'border-l-4 border-l-cyan-500',
    dot: 'bg-cyan-500',
    pill: 'bg-cyan-600 text-white'
  },
  ST_MSS: {
    badge: 'bg-teal-100 text-teal-800 border-teal-300',
    border: 'border-l-4 border-l-teal-500',
    dot: 'bg-teal-500',
    pill: 'bg-teal-600 text-white'
  },
  ST_MAIN_SHOP: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    border: 'border-l-4 border-l-emerald-500',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-600 text-white'
  },
  ST_SUB_SHOP: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    border: 'border-l-4 border-l-amber-500',
    dot: 'bg-amber-500',
    pill: 'bg-amber-600 text-white'
  },
  ST_CLEAN: {
    badge: 'bg-lime-100 text-lime-800 border-lime-300',
    border: 'border-l-4 border-l-lime-500',
    dot: 'bg-lime-500',
    pill: 'bg-lime-600 text-white'
  },
  ST_DINING: {
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    border: 'border-l-4 border-l-orange-500',
    dot: 'bg-orange-500',
    pill: 'bg-orange-600 text-white'
  },
  ST_Gagoo: {
    badge: 'bg-purple-100 text-purple-800 border-purple-300',
    border: 'border-l-4 border-l-purple-500',
    dot: 'bg-purple-500',
    pill: 'bg-purple-600 text-white'
  }
};

export default function StationStatusOverview({
  stations,
  validation,
  selectedDay = 1,
  onSelectDay,
  currentUser,
  scheduleResult,
  employees = [],
  currentSimulatedDate
}) {
  const isLeader = currentUser?.role === 'Leader' && currentUser?.role !== 'Manager' && !currentUser?.is_admin;
  const isManager = currentUser?.role === 'Manager' || currentUser?.is_admin;

  // 今天日數
  const todayDay = currentSimulatedDate ? Number(currentSimulatedDate.split('-')[2]) : new Date().getDate();

  // 組長鎖定所屬站點
  const myLeaderStation = isLeader
    ? (stations.find(s => s.leader_emp_id === currentUser?.emp_id) ||
       stations.find(s => s.station_id === currentUser?.primary_station))
    : null;

  // 高管可切換特定站點或看全部
  const [managerFilterStation, setManagerFilterStation] = useState('ALL');

  // 下拉展開出勤同仁視窗狀態 (station_id -> boolean)
  const [expandedStation, setExpandedStation] = useState(null);

  // 依身分篩選呈現之站點
  const visibleStations = stations.filter(station => {
    if (isLeader) {
      if (myLeaderStation) {
        return station.station_id === myLeaderStation.station_id;
      }
      return station.station_id === currentUser?.primary_station;
    }
    if (managerFilterStation !== 'ALL') {
      return station.station_id === managerFilterStation;
    }
    return true;
  });

  const scheduleMap = scheduleResult?.scheduleMap || {};

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6">
      {/* 頂部標題與工具列 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-slate-800">
            {isLeader ? '本組營運站點即時人力檢驗' : '9 大營業站點即時人力檢驗'}（第 {selectedDay} 天現況）
          </h2>
          {selectedDay === todayDay ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              ★ 今日
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSelectDay && onSelectDay(todayDay)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-indigo-50 text-indigo-600 text-[11px] font-bold border border-indigo-200 cursor-pointer"
              title="一鍵對齊至系統今日"
            >
              <Calendar className="w-3 h-3" />
              <span>跳至今日 ({todayDay}日)</span>
            </button>
          )}
          <span className="text-xs text-slate-500 hidden sm:inline">
            三級燈號：🟢 正常 · 🟡 機動支援 · 🔴 嚴重空窗
          </span>
        </div>

        {/* 高管站點拉選切換 */}
        {isManager && (
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-slate-600">檢視站點:</span>
            <select
              value={managerFilterStation}
              onChange={(e) => setManagerFilterStation(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">全館 9 大站點 ({stations.length})</option>
              {stations.map(s => (
                <option key={s.station_id} value={s.station_id}>
                  {s.station_name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLeader && myLeaderStation && (
          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
            🛡️ 組長專屬視圖：{myLeaderStation.station_name}（鎖定）
          </div>
        )}
      </div>

      {/* 站點卡片網格 */}
      <div className={`grid gap-3 ${
        isLeader && visibleStations.length === 1 
          ? 'grid-cols-1 max-w-xl' 
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
      }`}>
        {visibleStations.map(station => {
          const status = validation?.stationDailyStatus?.[station.station_id]?.[selectedDay] || {
            level: 'GREEN',
            count: 0,
            minRequired: station.min_staff_weekday,
            hasSolo: true
          };

          const isGreen = status.level === 'GREEN';
          const isYellow = status.level === 'YELLOW';
          const isRed = status.level === 'RED';
          const styleTheme = STATION_STYLE_MAP[station.station_id] || {
            badge: 'bg-slate-100 text-slate-800 border-slate-200',
            border: 'border-l-4 border-l-slate-400',
            dot: 'bg-slate-400',
            pill: 'bg-slate-600 text-white'
          };

          // 找出當天該站點出勤的所有同仁
          const assignedStaffList = employees.filter(emp => {
            const shift = scheduleMap[emp.emp_id]?.[selectedDay];
            return shift && shift.station_id === station.station_id && isWorkingShift(shift.shift_type);
          }).map(emp => ({
            emp_id: emp.emp_id,
            name: emp.name,
            role: emp.role,
            can_solo: emp.can_solo,
            shift_type: scheduleMap[emp.emp_id]?.[selectedDay]?.shift_type
          }));

          const isExpanded = expandedStation === station.station_id;

          return (
            <div
              key={station.station_id}
              className={`rounded-xl border p-3.5 transition-all shadow-xs ${styleTheme.border} ${
                isGreen
                  ? 'bg-slate-50/80 border-slate-200 text-slate-800'
                  : isYellow
                  ? 'bg-amber-50/90 border-amber-300 text-amber-900'
                  : 'bg-rose-50/90 border-rose-300 text-rose-900 shadow-sm'
              }`}
            >
              {/* 站點名稱與三級燈號 */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1.5 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${styleTheme.dot}`} />
                  <span className="text-xs font-black truncate">{station.station_name}</span>
                </div>
                {isGreen && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {isYellow && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                {isRed && <XCircle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />}
              </div>

              {/* 門檻與現有在勤人數 */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center space-x-1 text-slate-600">
                  <Users className="w-3.5 h-3.5" />
                  <span>在勤 / 門檻:</span>
                </div>
                <span className={`font-black ${status.count < status.minRequired ? 'text-rose-600' : 'text-slate-900'}`}>
                  {status.count} / {status.minRequired} 人
                </span>
              </div>

              {/* 獨立顧站 (Solo) 檢驗 */}
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center space-x-1 text-slate-600">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>獨立顧站:</span>
                </div>
                <span className={`text-[11px] font-bold ${status.hasSolo ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {station.requires_solo_staff ? (status.hasSolo ? '已具備' : '缺少') : '不強制'}
                </span>
              </div>

              {/* 出勤名單下拉窗格（避免一長串擠壓破版） */}
              <div className="border-t border-slate-200/60 pt-2 mt-2">
                <button
                  type="button"
                  onClick={() => setExpandedStation(isExpanded ? null : station.station_id)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded bg-white/80 hover:bg-white border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center space-x-1">
                    <span>當日出勤同仁</span>
                    <span className="text-indigo-600 font-black">({assignedStaffList.length}人)</span>
                  </span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="mt-1.5 p-2 bg-white rounded-lg border border-slate-200 shadow-md space-y-1.5 max-h-40 overflow-y-auto animate-fadeIn text-[11px]">
                    {assignedStaffList.length === 0 ? (
                      <div className="text-center text-slate-400 py-1">本日無出勤人員</div>
                    ) : (
                      assignedStaffList.map(st => (
                        <div key={st.emp_id} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-b-0">
                          <div className="flex items-center space-x-1.5 truncate">
                            <span className="font-bold text-slate-900 truncate">{st.name}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {st.emp_id}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200">
                              {st.shift_type}班
                            </span>
                            {st.can_solo && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                                Solo
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 建議支援人選 */}
              {isYellow && status.supportOptions?.length > 0 && (
                <div className="mt-2 text-[10px] bg-amber-100/80 p-1.5 rounded border border-amber-200 text-amber-800">
                  <span className="font-bold">支援人選：</span>
                  {status.supportOptions.slice(0, 2).join('、')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

