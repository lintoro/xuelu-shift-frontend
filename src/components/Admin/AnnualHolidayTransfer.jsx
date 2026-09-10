import React, { useState } from 'react';
import { Calendar, Scale, ShieldCheck, AlertCircle, Info, Check, Plus, Minus } from 'lucide-react';
import { INITIAL_ANNUAL_HOLIDAY_PLAN, HOLIDAY_ORIGIN_EVENTS } from '../../data/holidayTransferStore.js';

export default function AnnualHolidayTransfer({ employees }) {
  const [plan, setPlan] = useState(INITIAL_ANNUAL_HOLIDAY_PLAN);
  const [testHireDate, setTestHireDate] = useState('2026-05-01'); // 測試新進人員到職日防呆

  // 計算全年度法定休假總天數、調移總天數、實際休假總天數
  const totalStatutory = plan.reduce((sum, item) => sum + item.statutoryOff, 0);
  const totalOffset = plan.reduce((sum, item) => sum + item.transferOffset, 0);
  const totalActual = plan.reduce((sum, item) => sum + item.actualOff, 0);
  const isBalanced = totalOffset === 0 && totalActual === 120;

  // 微調調移天數
  const handleAdjustOffset = (monthNumber, delta) => {
    setPlan(prev => prev.map(m => {
      if (m.month !== monthNumber) return m;
      const newOffset = m.transferOffset + delta;
      return {
        ...m,
        transferOffset: newOffset,
        actualOff: m.statutoryOff + newOffset
      };
    }));
  };

  // 檢驗新人在特定還假月份是否白放假
  const testNewHireEligible = (hireDateStr, originDateStr) => {
    return new Date(hireDateStr) <= new Date(originDateStr);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 標題與 120 天平帳指示燈 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              全年度國定假日專案調移設定面板 (120天平帳管理)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心決策 15：專案借還體系 · 節日原生日到職防呆 · 全年度 120 天完全平帳
          </p>
        </div>

        {/* 120 天平帳指示燈 */}
        <div className={`flex items-center space-x-2.5 px-4 py-2 rounded-xl border ${
          isBalanced 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900 animate-pulse'
        }`}>
          <div className={`w-3 h-3 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <div className="text-xs">
            <div className="font-extrabold flex items-center space-x-1">
              <span>{isBalanced ? '全年度 120 天完全平帳 (放行)' : `不平帳警告 (淨額偏差 ${totalOffset > 0 ? `+${totalOffset}` : totalOffset} 天)`}</span>
            </div>
            <div className="text-[10px] opacity-80">
              法定 120 天 ＝ 學旅實排 {totalActual} 天 (偏移淨額: {totalOffset}d)
            </div>
          </div>
        </div>
      </div>

      {/* 12 個月調移矩陣網格 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {plan.map(item => {
          const isBorrowed = item.transferOffset < 0;
          const isReturned = item.transferOffset > 0;

          return (
            <div
              key={item.month}
              className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                isBorrowed
                  ? 'bg-amber-50/60 border-amber-300 text-amber-900'
                  : isReturned
                  ? 'bg-blue-50/60 border-blue-300 text-blue-900'
                  : 'bg-slate-50/80 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-bold">
                <span className="text-sm">{item.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
                  isBorrowed ? 'bg-amber-200 text-amber-900' : isReturned ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-600'
                }`}>
                  {item.transferOffset === 0 ? '常態' : item.transferOffset > 0 ? `+${item.transferOffset}d 還` : `${item.transferOffset}d 借`}
                </span>
              </div>

              <div className="space-y-0.5 text-[11px] text-slate-600 mb-2">
                <div className="flex justify-between">
                  <span>法定天數:</span>
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
                <span className="text-[10px] text-slate-400 truncate max-w-[70px]">{item.note}</span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleAdjustOffset(item.month, -1)}
                    className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => handleAdjustOffset(item.month, 1)}
                    className="w-5 h-5 rounded bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 節日原生日與新進同仁防呆測試器 */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-2 font-bold text-slate-800 mb-2">
          <Info className="w-4 h-4 text-indigo-600" />
          <span>節日原生日到職防呆檢核機制 (Anti-Windfall Guard for New Hires)</span>
        </div>
        <p className="text-slate-600 mb-3 leading-relaxed">
          企劃案規範：若同仁到職日晚於節日原生日（例如 2026/05 到職，晚於春節除夕 2026/02/16），在後續還假月（6月、11月）系統自動維持常態，絕不補給假日，防止新人白放假。
        </p>

        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-lg border border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">模擬同仁到職日:</span>
            <input
              type="date"
              value={testHireDate}
              onChange={(e) => setTestHireDate(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-4">
            {HOLIDAY_ORIGIN_EVENTS.map(evt => {
              const eligible = testNewHireEligible(testHireDate, evt.origin_date);
              return (
                <div key={evt.event_id} className="flex items-center space-x-1.5">
                  <span className="text-slate-600">{evt.name} ({evt.origin_date}):</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {eligible ? '具備借還資格' : '晚於節日（排除還假）'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
