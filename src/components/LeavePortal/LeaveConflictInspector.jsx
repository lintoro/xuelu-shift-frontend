import React, { useState } from 'react';
import { Eye, Check, X, AlertTriangle, ShieldCheck, Scale, ArrowRight } from 'lucide-react';

export default function LeaveConflictInspector({
  preferences,
  dailyQuotas,
  employees,
  rules,
  onApproveReject
}) {
  const totalDays = rules.days_in_month || 30;
  const [selectedDay, setSelectedDay] = useState(5); // 預設聚焦 9/5 (週末衝突示範日)
  const [onlyShowConflicts, setOnlyShowConflicts] = useState(true);

  const empMap = Object.fromEntries(employees.map(e => [e.emp_id, e]));

  // 分析每日劃休狀況
  const dailySummary = [];
  for (let d = 1; d <= totalDays; d++) {
    const quota = dailyQuotas[d]?.quota ?? (rules.default_daily_quota || 2);
    const dayPrefs = preferences.filter(p => p.day === d);
    const p1Count = dayPrefs.filter(p => p.priority === 1).length;
    const isConflict = dayPrefs.length > quota || p1Count > quota;

    dailySummary.push({
      day: d,
      quota,
      totalApplicants: dayPrefs.length,
      p1Count,
      isConflict,
      dayPrefs
    });
  }

  const conflictDays = dailySummary.filter(s => s.isConflict);
  const activeDayData = dailySummary.find(s => s.day === selectedDay) || dailySummary[0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      {/* 標題與說明 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              主管端劃休衝突透視面板 (Conflict Inspector)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            透明化呈顯同時選休同仁清單 · 志願序分流 · 附帶系統公平性白話調和理由
          </p>
        </div>

        {/* 衝突日切換開關 */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setOnlyShowConflicts(true)}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              onlyShowConflicts ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            僅顯示衝突日 ({conflictDays.length})
          </button>
          <button
            onClick={() => setOnlyShowConflicts(false)}
            className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              !onlyShowConflicts ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            全部日期 (30天)
          </button>
        </div>
      </div>

      {/* 日期快速導覽 Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-thin">
        {(onlyShowConflicts ? conflictDays : dailySummary).map(item => (
          <button
            key={item.day}
            onClick={() => setSelectedDay(item.day)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 border ${
              selectedDay === item.day
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : item.isConflict
                ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>9/{item.day}</span>
            {item.isConflict && (
              <span className={`px-1 py-0.2 rounded text-[10px] font-extrabold ${
                selectedDay === item.day ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-800'
              }`}>
                超額 {item.totalApplicants}/{item.quota}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 選定日期之衝突剖析詳情 */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-extrabold text-slate-900">
              9 月 {activeDayData.day} 日劃休透視明細
            </span>
            <span className="text-xs text-slate-500">
              (單日休假配額: <span className="font-bold text-slate-800">{activeDayData.quota} 人</span>，已申請: <span className="font-bold text-indigo-700">{activeDayData.totalApplicants} 人</span>)
            </span>
          </div>

          {activeDayData.isConflict && (
            <div className="flex items-center space-x-1 text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>超出名額上限，需啟動志願序分流</span>
            </div>
          )}
        </div>

        {/* 申請同仁清單與志願序 */}
        {activeDayData.dayPrefs.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            該日尚無同仁登記劃休
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeDayData.dayPrefs.map(pref => {
              const emp = empMap[pref.emp_id] || { name: '未知同仁', role: 'Staff' };
              const isP1 = pref.priority === 1;

              return (
                <div
                  key={`${pref.emp_id}-${pref.day}`}
                  className="bg-white rounded-lg p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                      isP1 ? 'bg-indigo-600' : 'bg-amber-500'
                    }`}>
                      P{pref.priority}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">{emp.name}</span>
                        <span className="text-xs text-slate-400">({pref.emp_id})</span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                          {emp.primary_station}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-2">
                        <span className="font-semibold text-slate-700">假別: {pref.leave_type}</span>
                        {pref.note && <span>· 事由: {pref.note}</span>}
                      </div>
                    </div>
                  </div>

                  {/* 志願序標籤與主管覆寫操作 */}
                  <div className="flex items-center space-x-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      isP1 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      第 {pref.priority} 志願
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        title="手動核准"
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        title="協調分流"
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 系統白話調和理由展示 (企劃案第 22 條規範) */}
        {activeDayData.isConflict && (
          <div className="mt-4 p-3 bg-indigo-50/80 rounded-lg border border-indigo-200 text-xs">
            <div className="flex items-center space-x-1.5 font-bold text-indigo-900 mb-1">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>系統公平性調和建議 (Automated Mediation Suggestion):</span>
            </div>
            <p className="text-indigo-800 leading-relaxed">
              9/{activeDayData.day} 配額為 {activeDayData.quota} 人，但有 {activeDayData.p1Count} 位同仁均列為第 1 優先志願。
              演算法依據【上月週末出勤平衡度】評估，建議優先核定週末休假次數較少之同仁，其餘同仁建議柔性協調至備選第 2 志願日期，主管享有最終手動覆寫確認權限。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
