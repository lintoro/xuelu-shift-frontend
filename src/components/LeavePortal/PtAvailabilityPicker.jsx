import React, { useState } from 'react';
import { Calendar, Sparkles, CheckCircle, XCircle, AlertCircle, HelpCircle } from 'lucide-react';

export default function PtAvailabilityPicker({
  employee,
  availability,
  rules,
  dailyQuotas,
  onSaveAvailability
}) {
  const totalDays = rules.days_in_month || 30;
  const [year, month] = (rules.target_year_month || '2026-09').split('-').map(Number);
  const maxDays = employee.max_monthly_days || 10;

  // 當前 PT 的報班狀態
  const myAvail = availability[employee.emp_id] || {};

  // 計算已報「可上班」的天數
  const availableDaysCount = Object.values(myAvail).filter(v => v === 'AVAILABLE').length;
  const unavailableDaysCount = Object.values(myAvail).filter(v => v === 'UNAVAILABLE').length;

  const [confirmDialog, setConfirmDialog] = useState(null); // 尖峰管制日柔性確認彈窗
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 產生整月日曆格
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const calendarDays = [];

  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ isEmpty: true, key: `empty-${i}` });
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const quotaInfo = dailyQuotas[d] || { quota: 2, isRestricted: false };
    const currentStatus = myAvail[d] || null;

    calendarDays.push({
      isEmpty: false,
      day: d,
      isWeekend,
      dayOfWeek,
      isRestricted: quotaInfo.isRestricted,
      tag: quotaInfo.tag,
      currentStatus,
      key: `day-${d}`
    });
  }

  // 點擊切換狀態
  const handleToggleStatus = (day, cell) => {
    const current = myAvail[day];

    if (!current) {
      // None -> AVAILABLE
      updateStatus(day, 'AVAILABLE');
    } else if (current === 'AVAILABLE') {
      // AVAILABLE -> UNAVAILABLE
      if (cell.isRestricted) {
        // 柔性引導確認
        setConfirmDialog({
          day,
          tag: cell.tag || '大檔活動日',
          action: () => updateStatus(day, 'UNAVAILABLE')
        });
      } else {
        updateStatus(day, 'UNAVAILABLE');
      }
    } else {
      // UNAVAILABLE -> None
      updateStatus(day, null);
    }
  };

  const updateStatus = (day, newStatus) => {
    const updated = { ...myAvail };
    if (newStatus) {
      updated[day] = newStatus;
    } else {
      delete updated[day];
    }
    onSaveAvailability(employee.emp_id, updated);
    setConfirmDialog(null);
  };

  // 一鍵填寫週末全部可上班
  const handleSetAllWeekendsAvailable = () => {
    const updated = { ...myAvail };
    calendarDays.forEach(cell => {
      if (!cell.isEmpty && cell.isWeekend) {
        updated[cell.day] = 'AVAILABLE';
      }
    });
    onSaveAvailability(employee.emp_id, updated);
    setFeedbackMsg('已批次標記全月週末為「✨ 可上班」！');
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      {/* 標題與 PT 進度警示條 (PT Quota Gauge) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              {employee.name} 計時人員 (PT) 雙軌報班日曆
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            正向報「✨ 可上班」/ 反向登記「🚫 不可排班」· 支援彈性候選池調度
          </p>
        </div>

        {/* PT Quota Gauge 進度條 */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-w-[200px]">
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-semibold text-slate-600">已登記可出勤</span>
            <span className={`font-bold ${
              availableDaysCount > maxDays ? 'text-rose-600' : availableDaysCount >= maxDays ? 'text-amber-600' : 'text-indigo-600'
            }`}>
              {availableDaysCount} / {maxDays} 天 (約定上限)
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                availableDaysCount > maxDays 
                  ? 'bg-rose-500' 
                  : availableDaysCount >= maxDays 
                  ? 'bg-amber-500' 
                  : 'bg-indigo-600'
              }`}
              style={{ width: `${Math.min((availableDaysCount / maxDays) * 100, 100)}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
            <span>不可排班: {unavailableDaysCount} 天</span>
            <span>{availableDaysCount >= maxDays ? '已達約定天數' : '名額充裕'}</span>
          </div>
        </div>
      </div>

      {/* 快捷操作與圖例 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/60 text-xs">
        <div className="flex items-center space-x-4">
          <span className="font-semibold text-amber-900">點擊切換循環:</span>
          <span className="flex items-center space-x-1 text-slate-600">
            <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300" />
            <span>未登記</span>
          </span>
          <span>→</span>
          <span className="flex items-center space-x-1 text-emerald-700 font-semibold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>可上班</span>
          </span>
          <span>→</span>
          <span className="flex items-center space-x-1 text-rose-700 font-semibold">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>不可排班</span>
          </span>
        </div>

        <button
          onClick={handleSetAllWeekendsAvailable}
          className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded text-amber-900 font-semibold text-[11px] cursor-pointer transition-colors shadow-2xs"
        >
          ⚡ 一鍵填報全月週末可排
        </button>
      </div>

      {/* 回饋訊息 */}
      {feedbackMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 日曆網格 */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="grid grid-cols-7 bg-slate-100 text-slate-600 text-center text-xs font-bold py-2 border-b border-slate-200">
          <div className="text-rose-600">週日</div>
          <div>週一</div>
          <div>週二</div>
          <div>週三</div>
          <div>週四</div>
          <div>週五</div>
          <div className="text-rose-600">週六</div>
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
          {calendarDays.map(cell => {
            if (cell.isEmpty) {
              return <div key={cell.key} className="h-20 bg-slate-50/40" />;
            }

            const isAvailable = cell.currentStatus === 'AVAILABLE';
            const isUnavailable = cell.currentStatus === 'UNAVAILABLE';

            return (
              <div
                key={cell.key}
                onClick={() => handleToggleStatus(cell.day, cell)}
                className={`min-h-[84px] p-2 transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isAvailable
                    ? 'bg-emerald-50/70 hover:bg-emerald-50 ring-1 ring-emerald-300'
                    : isUnavailable
                    ? 'bg-rose-50/70 hover:bg-rose-50 ring-1 ring-rose-300'
                    : cell.isRestricted
                    ? 'bg-amber-50/30 hover:bg-amber-50/60'
                    : cell.isWeekend
                    ? 'bg-rose-50/20 hover:bg-rose-50/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${cell.isWeekend ? 'text-rose-600' : 'text-slate-800'}`}>
                    {cell.day}
                  </span>

                  {cell.isRestricted && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-semibold">
                      ✨ 尖峰
                    </span>
                  )}
                </div>

                {/* 狀態呈現 */}
                <div className="my-auto text-center">
                  {isAvailable ? (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-2xs">
                      <CheckCircle className="w-3 h-3" />
                      <span>可上班</span>
                    </div>
                  ) : isUnavailable ? (
                    <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-2xs">
                      <XCircle className="w-3 h-3" />
                      <span>不可排</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-300">未填報</span>
                  )}
                </div>

                <div className="text-[9px] text-slate-400 text-right">
                  {cell.tag || (cell.isWeekend ? '假日尖峰' : '平日')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 尖峰管制日柔性確認對話框 */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center space-x-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">營運尖峰日報假提醒</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              9 月 {confirmDialog.day} 日為【{confirmDialog.tag}】，館內人潮眾多且人手需求較大。確認您該日無法前來出勤支援嗎？
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                我想想，改為可上班
              </button>
              <button
                onClick={confirmDialog.action}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                確認不排班
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
