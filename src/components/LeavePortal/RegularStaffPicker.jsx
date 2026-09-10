import React, { useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Trash2, HeartHandshake, ShieldAlert, Sparkles } from 'lucide-react';

export default function RegularStaffPicker({
  employee,
  preferences,
  allPreferences,
  dailyQuotas,
  rules,
  leaveBalance,
  onSavePreferences
}) {
  const totalDays = rules.days_in_month || 30;
  const [year, month] = (rules.target_year_month || '2026-09').split('-').map(Number);

  // 當前同仁的劃休志願
  const myPrefs = preferences.filter(p => p.emp_id === employee.emp_id);

  // 統計已選天數與週末天數
  const totalSelected = myPrefs.length;
  const weekendSelected = myPrefs.filter(p => {
    const d = new Date(year, month - 1, p.day).getDay();
    return d === 0 || d === 6;
  }).length;

  const [activeDay, setActiveDay] = useState(null); // 目前正在編輯的日期
  const [selectedPriority, setSelectedPriority] = useState(1);
  const [selectedLeaveType, setSelectedLeaveType] = useState('自選例休');
  const [compHours, setCompHours] = useState(8);
  const [note, setNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 產生整月日曆格
  const calendarDays = [];
  // 計算第一天星期幾 (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // 補前面的空白格
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ isEmpty: true, key: `empty-${i}` });
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 取得當日每日配額
    const quotaInfo = dailyQuotas[d] || { quota: rules.default_daily_quota || 2, isRestricted: false };
    // 計算全體已申請人數（不分志願）
    const totalApplicants = allPreferences.filter(p => p.day === d).length;
    const isFull = totalApplicants >= quotaInfo.quota;
    const isRestricted = quotaInfo.quota === 0;

    // 本人是否已選
    const myPref = myPrefs.find(p => p.day === d);

    calendarDays.push({
      isEmpty: false,
      day: d,
      isWeekend,
      dayOfWeek,
      quotaInfo,
      totalApplicants,
      isFull,
      isRestricted,
      myPref,
      key: `day-${d}`
    });
  }

  // 點擊日曆格子
  const handleDayClick = (cell) => {
    if (cell.isEmpty) return;

    if (cell.isRestricted) {
      setFeedbackMsg(`第 ${cell.day} 天為 ${cell.quotaInfo.tag || '營運管制日'}，全員禁休！`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    if (cell.myPref) {
      // 載入既有設定供修改
      setActiveDay(cell.day);
      setSelectedPriority(cell.myPref.priority || 1);
      setSelectedLeaveType(cell.myPref.leave_type || '自選例休');
      setCompHours(cell.myPref.comp_hours || 8);
      setNote(cell.myPref.note || '');
    } else {
      // 新增劃休防呆檢查
      if (totalSelected >= (rules.max_preferred_days || 4)) {
        setFeedbackMsg(`已達自選休假上限（每月最多 ${rules.max_preferred_days || 4} 天）！請先取消其他日期`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }

      if (cell.isWeekend && weekendSelected >= (rules.max_weekend_days || 1)) {
        setFeedbackMsg(`已達週末休假上限（每月最多 ${rules.max_weekend_days || 1} 天）！請選週間平日`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }

      setActiveDay(cell.day);
      // 若當日已滿額，預設建議登記為備選第 2 志願
      setSelectedPriority(cell.isFull ? 2 : 1);
      setSelectedLeaveType('自選例休');
      setCompHours(8);
      setNote('');
    }
  };

  // 儲存當日志願
  const handleSaveDayPref = () => {
    if (!activeDay) return;

    // 特休與補休餘額防呆
    if (selectedLeaveType === '特休' && (leaveBalance.annualLeaveDays || 0) <= 0) {
      setFeedbackMsg('特休假可用天數不足！');
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    if (selectedLeaveType === '補休' && (leaveBalance.compTimeHours || 0) < compHours) {
      setFeedbackMsg(`補休時數不足（可用 ${leaveBalance.compTimeHours || 0} 小時，欲申請 ${compHours} 小時）！`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    const updated = myPrefs.filter(p => p.day !== activeDay);
    updated.push({
      emp_id: employee.emp_id,
      day: activeDay,
      priority: selectedPriority,
      leave_type: selectedLeaveType,
      comp_hours: selectedLeaveType === '補休' ? compHours : 0,
      note
    });

    onSavePreferences(employee.emp_id, updated);
    setActiveDay(null);
    setFeedbackMsg(`已成功更新 ${activeDay} 日自選劃休意向！`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 刪除當日劃休
  const handleDeleteDayPref = (dayToDelete) => {
    const updated = myPrefs.filter(p => p.day !== dayToDelete);
    onSavePreferences(employee.emp_id, updated);
    if (activeDay === dayToDelete) setActiveDay(null);
    setFeedbackMsg(`已取消 ${dayToDelete} 日劃休`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      {/* 標題與額度即時儀表 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {employee.name} 同仁志願序自選排休 (Mobile-First)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            填寫第 1 / 第 2 志願序分流 · 截止日前可自由修改 · 告別秒殺搶休壓力
          </p>
        </div>

        {/* 額度進度卡片 */}
        <div className="flex items-center space-x-3">
          {/* 自選總天數 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[120px]">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>自選額度</span>
              <span className="font-bold text-slate-800">{totalSelected} / {rules.max_preferred_days || 4} 天</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  totalSelected >= 4 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${(totalSelected / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* 週末天數 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 min-w-[110px]">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>週末上限</span>
              <span className={`font-bold ${weekendSelected >= 1 ? 'text-amber-600' : 'text-slate-800'}`}>
                {weekendSelected} / {rules.max_weekend_days || 1} 天
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  weekendSelected >= 1 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${(weekendSelected / 1) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 提示訊息回饋 */}
      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 日曆主網格 */}
      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {/* 星期表頭 */}
        <div className="grid grid-cols-7 bg-slate-100 text-slate-600 text-center text-xs font-bold py-2 border-b border-slate-200">
          <div className="text-rose-600">週日</div>
          <div>週一</div>
          <div>週二</div>
          <div>週三</div>
          <div>週四</div>
          <div>週五</div>
          <div className="text-rose-600">週六</div>
        </div>

        {/* 日期格子 */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-white">
          {calendarDays.map(cell => {
            if (cell.isEmpty) {
              return <div key={cell.key} className="h-24 bg-slate-50/40" />;
            }

            const isSelected = !!cell.myPref;
            const isEditing = activeDay === cell.day;

            return (
              <div
                key={cell.key}
                onClick={() => handleDayClick(cell)}
                className={`min-h-[96px] p-2 relative transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isEditing
                    ? 'bg-indigo-50 ring-2 ring-indigo-500 z-10'
                    : isSelected
                    ? cell.myPref.priority === 1
                      ? 'bg-indigo-50/60 hover:bg-indigo-50'
                      : 'bg-amber-50/60 hover:bg-amber-50'
                    : cell.isRestricted
                    ? 'bg-slate-100/80 cursor-not-allowed opacity-75'
                    : cell.isWeekend
                    ? 'bg-rose-50/20 hover:bg-rose-50/50'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* 格子頂部：日期數字與狀態標記 */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${
                    cell.isWeekend ? 'text-rose-600' : 'text-slate-800'
                  }`}>
                    {cell.day}
                  </span>

                  {cell.isRestricted ? (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-200 text-slate-600 font-semibold">
                      大檔禁休
                    </span>
                  ) : cell.isFull && !isSelected ? (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-700 font-semibold">
                      已額滿
                    </span>
                  ) : null}
                </div>

                {/* 本人已劃休徽章 */}
                {isSelected ? (
                  <div className="my-auto">
                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center justify-between ${
                      cell.myPref.priority === 1
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-amber-500 text-white shadow-xs'
                    }`}>
                      <span>第 {cell.myPref.priority} 志願</span>
                      <span className="text-[9px] font-normal opacity-90">{cell.myPref.leave_type}</span>
                    </div>
                    {cell.myPref.note && (
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        {cell.myPref.note}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center my-auto text-[10px] text-slate-300">
                    點擊選休
                  </div>
                )}

                {/* 底部名額提示 */}
                <div className="text-[9px] text-slate-400 flex items-center justify-between mt-1">
                  <span>配額 {cell.quotaInfo.quota}</span>
                  {cell.totalApplicants > 0 && (
                    <span className="font-semibold text-slate-500">
                      {cell.totalApplicants} 人已填
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 編輯選定日期彈跳卡片 */}
      {activeDay && (
        <div className="mt-5 p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/40 animate-slideDown">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h3 className="text-sm font-bold text-indigo-950 flex items-center space-x-1.5">
              <span>設定 9 月 {activeDay} 日劃休意願</span>
              {dailyQuotas[activeDay]?.quota < 2 && (
                <span className="text-xs text-amber-700 font-normal">
                  (當日名額較緊，建議登記為第 2 志願)
                </span>
              )}
            </h3>

            {myPrefs.some(p => p.day === activeDay) && (
              <button
                onClick={() => handleDeleteDayPref(activeDay)}
                className="text-xs text-rose-600 hover:text-rose-700 flex items-center space-x-1 font-semibold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>取消此日劃休</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {/* 志願序選擇 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">志願序等級</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPriority(1)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedPriority === 1
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  第 1 志願 (優先)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPriority(2)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    selectedPriority === 2
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  第 2 志願 (備選)
                </button>
              </div>
            </div>

            {/* 假別選擇 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">假別型態</label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="自選例休">自選例休 (法定常態休假)</option>
                <option value="特休">法定特休 (扣特休存摺，餘額 {leaveBalance.annualLeaveDays} 天)</option>
                <option value="補休">彈性補休 (扣補休時數，餘額 {leaveBalance.compTimeHours} 小時)</option>
              </select>
            </div>

            {/* 補休時數或備註 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {selectedLeaveType === '補休' ? '補休請假時數' : '事由備註 (選填)'}
              </label>
              {selectedLeaveType === '補休' ? (
                <select
                  value={compHours}
                  onChange={(e) => setCompHours(Number(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={4}>4 小時 (半天)</option>
                  <option value={8}>8 小時 (全天)</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="如：家中有事、進修..."
                  className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              )}
            </div>
          </div>

          {/* 儲存按鈕 */}
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setActiveDay(null)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-200/60 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveDayPref}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm cursor-pointer active:scale-95"
            >
              儲存此日志願
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
