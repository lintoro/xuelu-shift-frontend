// src/components/Admin/AnnualHolidayTransfer.jsx
import React, { useState, useMemo } from 'react';
import { Calendar, Scale, ShieldCheck, AlertCircle, Info, Check, Plus, Minus, UserCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { 
  ANNUAL_HOLIDAY_PLANS, 
  HOLIDAY_ORIGIN_EVENTS, 
  STATUTORY_HOLIDAYS, 
  calculateAnnualBalance,
  getHolidaysInMonth,
  checkEmployeeHolidayConsent 
} from '../../data/holidayTransferStore.js';

export default function AnnualHolidayTransfer({ 
  employees = [],
  scheduleMap = {},
  currentMonth = '2026-09',
  holidayConsents = {},
  onSignHolidayConsent
}) {
  const [selectedYear, setSelectedYear] = useState('2026');
  const [plansByYear, setPlansByYear] = useState(ANNUAL_HOLIDAY_PLANS);
  const [testHireDate, setTestHireDate] = useState('2026-05-01'); // 測試新進人員到職日防呆

  const currentPlan = useMemo(() => {
    return plansByYear[selectedYear] || plansByYear['2026'];
  }, [plansByYear, selectedYear]);

  // 動態計算全年度法定休假總天數、調移總天數、實際休假總天數與平帳狀態
  const { totalStatutory, totalOffset, totalActual, isBalanced } = useMemo(() => {
    return calculateAnnualBalance(currentPlan);
  }, [currentPlan]);

  // 微調特定月份之調移天數
  const handleAdjustOffset = (monthNumber, delta) => {
    setPlansByYear(prev => {
      const yearPlan = prev[selectedYear] || prev['2026'];
      const updated = yearPlan.map(m => {
        if (m.month !== monthNumber) return m;
        const newOffset = m.transferOffset + delta;
        return {
          ...m,
          transferOffset: newOffset,
          actualOff: m.statutoryOff + newOffset
        };
      });
      return {
        ...prev,
        [selectedYear]: updated
      };
    });
  };

  // 檢驗新人在特定還假月份是否白放假
  const testNewHireEligible = (hireDateStr, originDateStr) => {
    return new Date(hireDateStr) <= new Date(originDateStr);
  };

  // 統計當月國定假日之同仁出勤與同意簽認狀態
  const currentMonthHolidays = useMemo(() => {
    return getHolidaysInMonth(currentMonth);
  }, [currentMonth]);

  const holidayDutySummary = useMemo(() => {
    if (!currentMonthHolidays.length) return null;

    let totalDutyEmployees = 0;
    let consentedCount = 0;
    const dutyList = [];

    employees.forEach(emp => {
      const consentInfo = checkEmployeeHolidayConsent({
        empId: emp.emp_id,
        yearMonth: currentMonth,
        scheduleMap,
        consentsMap: holidayConsents
      });

      if (consentInfo.required) {
        totalDutyEmployees++;
        const isAllConsented = consentInfo.pendingCount === 0;
        if (isAllConsented) consentedCount++;

        dutyList.push({
          emp,
          holidays: consentInfo.holidays,
          isAllConsented,
          pendingCount: consentInfo.pendingCount
        });
      }
    });

    const isAllComplete = totalDutyEmployees > 0 && consentedCount === totalDutyEmployees;

    return {
      totalDutyEmployees,
      consentedCount,
      isAllComplete,
      dutyList
    };
  }, [currentMonthHolidays, employees, scheduleMap, holidayConsents, currentMonth]);

  return (
    <div className="space-y-6 mb-8">
      {/* 頂部主卡片：年度國定假日專案調移設定面板 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                全年度國定假日專案調移設定面板（年度放假平帳管理）
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              依《勞基法》第 37、39 條規範 · 服務業假日調移免雙薪合規體系 · 全年度法定天數動態加總平帳
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* 年度選擇器 */}
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <span className="text-slate-500 pl-2">年度:</span>
              <button
                onClick={() => setSelectedYear('2026')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedYear === '2026' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2026 年
              </button>
              <button
                onClick={() => setSelectedYear('2027')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  selectedYear === '2027' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2027 年 (預估)
              </button>
            </div>

            {/* 動態平帳指示燈 */}
            <div className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border ${
              isBalanced 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              <div className="text-xs">
                <div className="font-extrabold flex items-center space-x-1">
                  <span>
                    {isBalanced 
                      ? `全年度法定 ${totalStatutory} 天完全平帳 (放行)` 
                      : `不平帳警告 (淨額偏差 ${totalOffset > 0 ? `+${totalOffset}` : totalOffset} 天)`}
                  </span>
                </div>
                <div className="text-[10px] opacity-85">
                  法定應休 {totalStatutory} 天 ＝ 實排 {totalActual} 天 (調移淨額: {totalOffset}d)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 12 個月調移矩陣網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {currentPlan.map(item => {
            const isBorrowed = item.transferOffset < 0;
            const isReturned = item.transferOffset > 0;

            return (
              <div
                key={item.month}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  isBorrowed
                    ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                    : isReturned
                    ? 'bg-blue-50/70 border-blue-300 text-blue-900'
                    : 'bg-slate-50/80 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 font-bold">
                  <span className="text-sm font-black">{item.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold ${
                    isBorrowed ? 'bg-amber-200 text-amber-900' : isReturned ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {item.transferOffset === 0 ? '常態' : item.transferOffset > 0 ? `+${item.transferOffset}d 還` : `${item.transferOffset}d 借`}
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-600 mb-2">
                  <div className="flex justify-between">
                    <span>法定應休:</span>
                    <span className="font-semibold">{item.statutoryOff} 天</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>實排天數:</span>
                    <span className={isReturned ? 'text-blue-700' : isBorrowed ? 'text-amber-700' : ''}>
                      {item.actualOff} 天
                    </span>
                  </div>
                </div>

                {/* 調移加減微調按鈕 */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] text-slate-400 truncate max-w-[70px]" title={item.note}>{item.note}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleAdjustOffset(item.month, -1)}
                      title="減少 1 天"
                      className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer active:scale-95"
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAdjustOffset(item.month, 1)}
                      title="增加 1 天"
                      className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 借還大檔去向與來源連線標記 */}
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 mb-6 text-xs text-indigo-950">
          <div className="flex items-center space-x-2 font-bold mb-2 text-indigo-900">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>2026 年度專案調移借還去向明細（透明化對帳）</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {HOLIDAY_ORIGIN_EVENTS.map(evt => (
              <div key={evt.event_id} className="bg-white/80 p-2.5 rounded-lg border border-indigo-100">
                <span className="font-bold text-indigo-900">{evt.name}</span>
                <div className="text-[11px] text-slate-600 mt-0.5">原生日: {evt.origin_date}</div>
                <div className="text-[11px] font-semibold text-indigo-700 mt-1">{evt.return_mapping}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 節日原生日與新進/離職同仁防呆說明 */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center space-x-2 font-bold text-slate-800 mb-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>節日原生日與到職/離職勞動權益防呆規範 (Anti-Windfall & Severance Guard)</span>
          </div>
          <div className="space-y-1.5 text-slate-600 leading-relaxed">
            <p>
              • <strong>新進同仁防白放假</strong>：若同仁到職日晚於節日原生日（如 2026/05 到職晚於春節），在後續還假月（6月、11月）維持常態，不補給假日。
            </p>
            <p>
              • <strong>離職同仁未還假清算</strong>：若同仁於春節/大檔有借假出勤，但在還假月份前離職，離職結算時依《勞基法》第 39 條需折算未休工資補發，杜絕少發工資爭議。
            </p>
          </div>
        </div>
      </div>

      {/* 下方卡片：當月國定假日同仁調移同意簽認看板 (服務業免雙薪法律閉環) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                本月份 ({currentMonth}) 國定假日同仁出勤調移簽認進度看板
              </h3>
              <p className="text-xs text-slate-500">
                服務業國假出勤免除加倍工資（雙薪）之法律依據：需取得個別出勤同仁之調移同意簽認
              </p>
            </div>
          </div>

          {holidayDutySummary ? (
            <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-2 ${
              holidayDutySummary.isAllComplete
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full ${holidayDutySummary.isAllComplete ? 'bg-emerald-500' : 'bg-amber-500 animate-ping'}`} />
              <span>
                {holidayDutySummary.isAllComplete
                  ? `🎉 本月全員 (${holidayDutySummary.consentedCount}/${holidayDutySummary.totalDutyEmployees}) 完成調移同意簽署 · 依法免計雙薪`
                  : `⚠️ 簽認中：已同意 ${holidayDutySummary.consentedCount} 人 / 共 ${holidayDutySummary.totalDutyEmployees} 人排定出勤`}
              </span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">本月份無國定假日出勤調移需求</span>
          )}
        </div>

        {holidayDutySummary && holidayDutySummary.dutyList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-bold">員工工號 / 姓名</th>
                  <th className="py-2 px-3 font-bold">主屬站點</th>
                  <th className="py-2 px-3 font-bold">國定假日排定出勤節日</th>
                  <th className="py-2 px-3 font-bold">指定調移休假日</th>
                  <th className="py-2 px-3 font-bold text-right">調移同意簽認狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {holidayDutySummary.dutyList.map(({ emp, holidays, isAllConsented }) => (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.emp_id} ({emp.role})</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">
                      {emp.primary_station}
                    </td>
                    <td className="py-2.5 px-3">
                      {holidays.map(h => (
                        <div key={h.date} className="inline-flex items-center space-x-1.5 mr-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                            {h.name} ({currentMonth}-{h.day < 10 ? '0' + h.day : h.day}) [{h.shiftCode}班]
                          </span>
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3">
                      {holidays.map(h => (
                        <div key={h.date} className="text-slate-600 font-medium">
                          調移至 {currentMonth}-{h.suggestedOffDay < 10 ? '0' + h.suggestedOffDay : h.suggestedOffDay} (OFF)
                        </div>
                      ))}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isAllConsented ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已簽認 (免雙薪)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold border border-amber-200 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>待同仁工作台簽認</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            {currentMonthHolidays.length > 0 
              ? '本月雖有國定假日，但目前全體同仁於國假當日皆未排班出勤（或全員排休），無須簽認調移出勤同意書。'
              : '本月份為常態門市營運月，無國定假日排定。'}
          </div>
        )}
      </div>
    </div>
  );
}
