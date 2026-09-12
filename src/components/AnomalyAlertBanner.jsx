import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles,
  Filter,
  Layers
} from 'lucide-react';

/**
 * 異常顯示提醒介面 (Anomaly & Shortage Alert Banner)
 * 支援需求 #007：組長視野隔離與組別聚焦機制
 * 1. 站點組長 (Leader)：視野自動隔離，僅顯示本組管轄站點之缺工與組員法規異常；本組無異常時顯示綠色合規標章。
 * 2. 營運主管 (Manager) / Admin：預設顯示全館 9 大站點總覽，並提供站點快速切換選單。
 * 3. 異常日期快速索引，點擊平滑滾動定位至該日。
 */
export default function AnomalyAlertBanner({
  validation,
  stations = [],
  employees = [],
  currentUser,
  selectedDay,
  onSelectDay,
  currentSimulatedDate
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // 當前基準日 (未發生日判斷)
  const currentDay = currentSimulatedDate ? parseInt(currentSimulatedDate.split('-')[2], 10) : 1;

  // 判斷當前使用者角色與所屬站點
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';

  // 需求 #009 業務防呆：PT 與 STAFF 無排班/調配調班權限，嚴格不顯示任何排班異常提醒與人力缺口警示看板
  if (!isManager && !isAdmin && !isLeader) {
    return null;
  }

  const myLeaderStation = isLeader 
    ? (stations.find(s => s.leader_emp_id === currentUser?.emp_id) || 
       stations.find(s => s.station_id === currentUser?.primary_station) || 
       stations[0])
    : null;

  // 站點過濾狀態 (Leader 固定為本站，Manager/Admin 預設 ALL 且可自由下拉切換)
  const [managerStationFilter, setManagerStationFilter] = useState('ALL');

  const effectiveStationFilter = isLeader 
    ? (myLeaderStation?.station_id || 'ALL')
    : managerStationFilter;

  if (!validation) return null;

  const { issues = [] } = validation;

  // 依選取的站點與日期過濾異常事件（僅顯示未發生的日期，已發生者不干擾排班調度）
  const filteredIssues = issues.filter(issue => {
    // 依使用者指示：徹底排除「營運支援空班」警示 (ST_ADMIN / ADMIN_SHIFT_DEFICIT)
    if (issue.type === 'ADMIN_SHIFT_DEFICIT' || issue.station_id === 'ST_ADMIN') return false;

    // 規則 1：僅顯示當日與未發生之未來日期 (issue.day >= currentDay)
    if (issue.day && issue.day < currentDay) return false;

    if (effectiveStationFilter === 'ALL') return true;

    // 1. 站點專責缺工或缺少 C 班
    if (issue.station_id === effectiveStationFilter) return true;

    // 2. 個人法規違規 (連續上班、間隔不足)，比對同仁主屬站點
    if (issue.emp_id) {
      const emp = employees.find(e => e.emp_id === issue.emp_id);
      if (emp && emp.primary_station === effectiveStationFilter) {
        return true;
      }
    }

    return false;
  });

  const criticalCount = filteredIssues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = filteredIssues.filter(i => i.severity === 'WARNING').length;
  const hasIssues = filteredIssues.length > 0;

  // 取得當前檢視站點名稱
  const currentStationObj = stations.find(s => s.station_id === effectiveStationFilter);
  const currentStationName = currentStationObj ? currentStationObj.station_name : '全館';

  // 按日期分組過濾後的異常事件
  const groupedIssues = {};
  filteredIssues.forEach(issue => {
    const day = issue.day || 1;
    if (!groupedIssues[day]) {
      groupedIssues[day] = [];
    }
    groupedIssues[day].push(issue);
  });

  const sortedDays = Object.keys(groupedIssues).map(Number).sort((a, b) => a - b);

  // 若當前選取範圍完全無異常，呈現優雅合規綠色徽章卡
  if (!hasIssues) {
    return (
      <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-fade-in">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-950">
                {isLeader ? `🎉 【${currentStationName}】排班合規驗證通過` : `【${currentStationName}】排班合規驗證通過`}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black">
                100% 合規
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              {isLeader 
                ? `組長管轄之【${currentStationName}】站點人力門檻、獨立顧站 (can_solo) 資格與組員勞基法工時限制均全數達標，本組無缺工空窗。`
                : effectiveStationFilter === 'ALL'
                ? '9 大站點人力門檻、獨立顧站 (can_solo) 資格與勞基法工時限制均全數達標，無任何缺工警報。'
                : `【${currentStationName}】站點各日出勤人數完全符合平日/週末門檻，無缺工空窗。`}
            </p>
          </div>
        </div>

        {/* 高管站點切換下拉 */}
        {!isLeader && (
          <div className="flex items-center space-x-1.5 bg-white/80 border border-emerald-300 rounded-lg px-2.5 py-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px] text-emerald-800 font-medium">切換檢視站點：</span>
            <select
              value={managerStationFilter}
              onChange={(e) => setManagerStationFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-950 focus:outline-none cursor-pointer"
            >
              <option value="ALL">全館 9 大營業站點 (總覽)</option>
              {stations.map(st => (
                <option key={st.station_id} value={st.station_id}>
                  {st.station_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  const handleSelectAndScroll = (day) => {
    if (onSelectDay) onSelectDay(day);
    const colElement = document.getElementById(`schedule-day-col-${day}`);
    if (colElement) {
      colElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  return (
    <div className="bg-gradient-to-r from-rose-900/90 via-slate-900 to-amber-950 text-white rounded-xl border border-rose-500/40 p-4 sm:p-5 shadow-lg mb-6 backdrop-blur-md">
      {/* 橫幅頂部 Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0 shadow-inner">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {isLeader ? `【${currentStationName}】排班異常提醒與人力缺口警示看板` : `【${currentStationName}】排班異常提醒與人力缺口警示看板`}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black shadow-xs">
                {criticalCount} 處空窗
              </span>
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-xs">
                  {warningCount} 處警示
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/15">
                {isLeader ? '組長本組聚焦視野' : '營運全域調度模式'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {isLeader 
                ? `系統已為【${currentStationName}】過濾出專屬異常事件。以下日期尚有人力缺口需組長協調組員或申請跨組兼職支援。`
                : '系統已為您產出最佳「基本班表」。由於目前測試情境採用極限緊繃假設，以下日期尚有人力缺口需主管介入調度。'}
            </p>
          </div>
        </div>

        {/* 右側控制：高管站點篩選與展開收合按鈕 */}
        <div className="flex items-center space-x-2">
          {!isLeader && (
            <div className="flex items-center space-x-1.5 bg-black/40 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-slate-200">
              <Filter className="w-3.5 h-3.5 text-slate-300" />
              <select
                value={managerStationFilter}
                onChange={(e) => setManagerStationFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-800 text-white">全館 9 大站點 (總覽)</option>
                {stations.map(st => (
                  <option key={st.station_id} value={st.station_id} className="bg-slate-800 text-white">
                    {st.station_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 展開/收合控制 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            <span>{isExpanded ? '收合清單' : '查看異常詳細清單'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展開之每日異常詳細清單 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
            <span>異常日期快速索引（點擊可直接定位該日排班狀態）：</span>
            <span className="text-[11px] text-slate-400">目前選取檢視：第 {selectedDay} 天</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
            {sortedDays.map(day => {
              const dayIssues = groupedIssues[day];
              const isCurrentSelected = selectedDay === day;
              const hasCritical = dayIssues.some(i => i.severity === 'CRITICAL');

              return (
                <div
                  key={day}
                  onClick={() => handleSelectAndScroll(day)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isCurrentSelected
                      ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/50 text-white shadow-md'
                      : hasCritical
                      ? 'bg-white/5 hover:bg-white/10 border-rose-500/40 text-slate-200'
                      : 'bg-white/5 hover:bg-white/10 border-amber-500/40 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs flex items-center space-x-1">
                      <span className="text-rose-400 font-extrabold">9月{day}日</span>
                      {hasCritical ? (
                        <span className="text-[10px] px-1.5 py-0.2 bg-rose-500/40 text-rose-200 rounded">
                          空窗
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/40 text-amber-200 rounded">
                          警示
                        </span>
                      )}
                    </span>
                    <button className="text-[10px] flex items-center text-indigo-300 hover:text-indigo-200 font-medium">
                      <span>檢視該日</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    {dayIssues.map((issue, idx) => (
                      <div key={idx} className="text-[11px] flex items-start space-x-1.5">
                        {issue.severity === 'CRITICAL' ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="leading-tight truncate">
                          <span className="font-semibold text-slate-300 mr-1">
                            [{issue.station_name || (issue.emp_name ? `${issue.emp_name}` : '站點')}]
                          </span>
                          <span className={issue.severity === 'CRITICAL' ? 'text-rose-300' : 'text-amber-200'}>
                            {issue.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 底部調度指引 */}
          <div className="mt-3 bg-white/5 rounded-lg p-2.5 border border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>{isLeader ? `【${currentStationName}】組長調度建議` : '主管調度建議'}</strong>：
                {isLeader 
                  ? '點擊上方卡片定位日期後，可於下方排班總表協調本組同仁，或於「調班二階審核」門戶申請跨組兼職同仁支援本站。'
                  : '點擊上方卡片定位日期後，可在下方排班總表利用「調班申請」手動指定機動支援，或於人事名冊調整可支援站點以消除空窗。'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
