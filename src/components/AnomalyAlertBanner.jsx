import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, ShieldAlert, Users, Sparkles } from 'lucide-react';

/**
 * 異常顯示提醒介面 (Anomaly & Shortage Alert Banner)
 * 當排班引擎因人力極化、同組同休或極端假設而無法完全滿足站點最低門檻時：
 * 1. 依然保留並呈現最佳「基本班表」。
 * 2. 於排班總表上方常駐顯眼、專業、可互動的異常預警看板。
 * 3. 清晰列出缺工日期、站點、缺工人數與調度建議，並支援一鍵點擊定位至該日。
 */
export default function AnomalyAlertBanner({
  validation,
  stations,
  selectedDay,
  onSelectDay
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!validation) return null;

  const { criticalCount = 0, warningCount = 0, issues = [] } = validation;
  const hasIssues = criticalCount > 0 || warningCount > 0;

  // 按日期分組異常事件
  const groupedIssues = {};
  issues.forEach(issue => {
    const day = issue.day || 1;
    if (!groupedIssues[day]) {
      groupedIssues[day] = [];
    }
    groupedIssues[day].push(issue);
  });

  const sortedDays = Object.keys(groupedIssues).map(Number).sort((a, b) => a - b);

  // 若完全無異常，呈現優雅合規綠色徽章卡
  if (!hasIssues) {
    return (
      <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 mb-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-emerald-950">全館排班合規驗證通過</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-black">
                100% 合規
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              9 大站點人力門檻、獨立顧站 (can_solo) 資格與勞基法工時限制均全數達標，無任何缺工警報。
            </p>
          </div>
        </div>
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
                排班異常提醒與人力缺口警示看板
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
                極限邊界測試模式
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              系統已為您產出最佳「基本班表」。由於目前測試情境採用極限緊繃假設（如週末零裕度、技能孤島），以下日期尚有人力缺口需主管介入或調派兼職支援。
            </p>
          </div>
        </div>

        {/* 展開/收合控制 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
        >
          <span>{isExpanded ? '收合清單' : '查看異常詳細清單'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
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
                            [{issue.station_name || issue.station_id || '站點'}]
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
                <strong>主管調度建議</strong>：點擊上方卡片定位日期後，可在下方排班總表利用「調班申請」手動指定機動支援，或於人事名冊調整可支援站點以消除空窗。
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
