import React, { useState } from 'react';
import { Calendar, CheckCircle, AlertCircle, Trash2, HeartHandshake, ShieldAlert, Sparkles, Clock, Lock } from 'lucide-react';
import { checkActionTimelineEligibility } from '../../engine/schedulingTimelineEngine.js';

export default function RegularStaffPicker({
  employee,
  preferences,
  allPreferences,
  dailyQuotas,
  rules,
  leaveBalance,
  onSavePreferences,
  currentSimulatedDate
}) {
  const totalDays = rules.days_in_month || 30;
  const [year, month] = (rules.target_year_month || '2026-09').split('-').map(Number);

  // 檢查排班時限合規性 (每月 12 ~ 17 日開放同仁預訂)
  const timelineCheck = checkActionTimelineEligibility(
    'SUBMIT_PREFERENCE',
    employee?.role || 'Staff',
    currentSimulatedDate || '2026-09-10'
  );

  // 當前同仁的劃休志願
  const myPrefs = preferences.filter(p => p.emp_id === employee.emp_id);

  // 1. 核心業務分離：特休與補休不占每月固定選休額度 (需求 1)
  const regularPrefs = myPrefs.filter(p => p.leave_type !== 'AL' && p.leave_type !== 'CT' && p.leave_type !== '特休' && p.leave_type !== '補休');
  const regularSelected = regularPrefs.length;
  const regularWeekendSelected = regularPrefs.filter(p => {
    const d = new Date(year, month - 1, p.day).getDay();
    return d === 0 || d === 6;
  }).length;

  const alSelectedCount = myPrefs.filter(p => p.leave_type === 'AL' || p.leave_type === '特休').length;
  const ctSelectedCount = myPrefs.filter(p => p.leave_type === 'CT' || p.leave_type === '補休').length;

  // 2. 劃休月份剛性鎖定：已排定或非次月月份禁止劃休 (需求 2)
  // 假定 2026-09 為當前營運發布月份，小於等於 2026-09 或明確標記 is_published 即鎖定
  const isMonthLocked = rules.is_published || (rules.target_year_month && rules.target_year_month <= '2026-09');

  const [activeDay, setActiveDay] = useState(null); // 目前正在編輯的日期
  const [selectedPriority, setSelectedPriority] = useState(1);
  const [selectedLeaveType, setSelectedLeaveType] = useState('OFF'); // OFF, AL, CT
  const [compHours, setCompHours] = useState(8);
  const [note, setNote] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 產生整月日曆格
  const calendarDays = [];
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  // 補前面的空白格
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ isEmpty: true, key: `empty-${i}` });
  }

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const quotaInfo = dailyQuotas[d] || { quota: rules.default_daily_quota || 2, isRestricted: false };
    const totalApplicants = allPreferences.filter(p => p.day === d).length;
    const isFull = totalApplicants >= quotaInfo.quota;
    const isRestricted = quotaInfo.quota === 0;
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

    // 劃休鎖定檢查 (需求 2)
    if (isMonthLocked) {
      setFeedbackMsg(`【${rules.target_year_month || '本月'}】班表已排定定稿，已關閉志願劃休！若有異動請至工作台使用【線上請假】或【線上調班】。`);
      setTimeout(() => setFeedbackMsg(''), 4500);
      return;
    }

    if (cell.isRestricted) {
      setFeedbackMsg(`第 ${cell.day} 天為 ${cell.quotaInfo.tag || '營運管制日'}，全員禁休！`);
      setTimeout(() => setFeedbackMsg(''), 3000);
      return;
    }

    if (cell.myPref) {
      // 載入既有設定供修改
      setActiveDay(cell.day);
      setSelectedPriority(cell.myPref.priority || 1);
      setSelectedLeaveType(cell.myPref.leave_type || 'OFF');
      setCompHours(cell.myPref.comp_hours || 8);
      setNote(cell.myPref.note || '');
    } else {
      // 新增日曆格
      setActiveDay(cell.day);
      setSelectedPriority(cell.isFull ? 2 : 1);
      setSelectedLeaveType('OFF');
      setCompHours(8);
      setNote('');
    }
  };

  // 儲存當日志願
  const handleSaveDayPref = () => {
    if (!activeDay) return;

    if (isMonthLocked) {
      setFeedbackMsg('本月班表已排定定稿，無法變更劃休！請改用線上請假或調班。');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    const currentDayPref = myPrefs.find(p => p.day === activeDay);
    const isSwitchingToRegular = selectedLeaveType === 'OFF';
    const wasRegular = currentDayPref && (currentDayPref.leave_type === 'OFF' || currentDayPref.leave_type === '自選例休');

    // 1. 若為一般劃休 (OFF)：受限於固定選休天數上限
    if (isSwitchingToRegular && !wasRegular) {
      if (regularSelected >= (rules.max_preferred_days || 4)) {
        setFeedbackMsg(`已達常規自選休假上限（每月最多 ${rules.max_preferred_days || 4} 天）！特休與補休則不在此限。`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }

      const activeDateObj = new Date(year, month - 1, activeDay);
      const isWeekendDay = activeDateObj.getDay() === 0 || activeDateObj.getDay() === 6;
      if (isWeekendDay && regularWeekendSelected >= (rules.max_weekend_days || 1)) {
        setFeedbackMsg(`已達常規週末休假上限（每月最多 ${rules.max_weekend_days || 1} 天）！請選週間平日。`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }
    }

    // 2. 若為特休 (AL)：不占固定額度，僅檢核存摺餘額
    if (selectedLeaveType === 'AL') {
      const currentAvailableAl = leaveBalance.annualLeaveDays || 0;
      if (currentAvailableAl <= 0) {
        setFeedbackMsg('特休假可用天數不足（個人存摺餘額為 0 天）！無法排定特休。');
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }
    }

    // 3. 若為補休 (CT)：不占固定額度，僅檢核補休存摺
    if (selectedLeaveType === 'CT') {
      const currentAvailableCt = leaveBalance.compTimeHours || 0;
      if (currentAvailableCt < 8) {
        setFeedbackMsg(`補休時數不足全日 8 小時（目前可用 ${currentAvailableCt} 小時）！無法排定全日補休。`);
        setTimeout(() => setFeedbackMsg(''), 4000);
        return;
      }
    }

    const updated = myPrefs.filter(p => p.day !== activeDay);
    updated.push({
      emp_id: employee.emp_id,
      day: activeDay,
      priority: selectedPriority,
      leave_type: selectedLeaveType,
      comp_hours: selectedLeaveType === 'CT' ? 8 : 0,
      note
    });

    onSavePreferences(employee.emp_id, updated);
    setActiveDay(null);
    const leaveLabel = selectedLeaveType === 'AL' 
      ? '法定特休 (獨立扣存摺，不占劃休額度)' 
      : selectedLeaveType === 'CT' 
      ? '彈性補休 (獨立扣存摺，不占劃休額度)' 
      : '常態例休';
    setFeedbackMsg(`已成功登記 ${month}/${activeDay} 日 ${leaveLabel} 志願意向！`);
    setTimeout(() => setFeedbackMsg(''), 3500);
  };

  // 刪除當日劃休
  const handleDeleteDayPref = (dayToDelete) => {
    if (isMonthLocked) {
      setFeedbackMsg('本月班表已排定定稿，無法在此刪除！請改用線上請假或調班。');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }
    const updated = myPrefs.filter(p => p.day !== dayToDelete);
    onSavePreferences(employee.emp_id, updated);
    if (activeDay === dayToDelete) setActiveDay(null);
    setFeedbackMsg(`已取消 ${dayToDelete} 日劃休`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      {/* 鎖定提示橫幅 (需求 2) */}
      {isMonthLocked && (
        <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-900">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold">【{rules.target_year_month || '當前月份'}】班表已排定發布 · 志願劃休已截止</span>
            <p className="mt-0.5 text-amber-700">
              依營運規範，已排定之月份無法再申請或變更志願劃休。若當月有突發行程或休假需求，請至「我的工作台」使用<strong>【📝 線上請假】</strong>或至<strong>【🔄 線上調班】</strong>提出申請。
            </p>
          </div>
        </div>
      )}

      {/* 標題與額度即時儀表 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              {employee.name} 同仁自選排休 (支援特休/補休獨立計數)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            常規自選休假受限於月額度 · 特休與補休直接扣抵個人存摺，不占用固定選休天數
          </p>
        </div>

        {/* 額度進度卡片 (需求 1 獨立呈現) */}
        <div className="flex items-center flex-wrap gap-2">
          {/* 常規自選天數 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 min-w-[110px]">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>常規劃休</span>
              <span className="font-bold text-slate-800">{regularSelected} / {rules.max_preferred_days || 4} 天</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  regularSelected >= (rules.max_preferred_days || 4) ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (regularSelected / (rules.max_preferred_days || 4)) * 100)}%` }}
              />
            </div>
          </div>

          {/* 週末天數 */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 min-w-[100px]">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>週末上限</span>
              <span className={`font-bold ${regularWeekendSelected >= (rules.max_weekend_days || 1) ? 'text-amber-600' : 'text-slate-800'}`}>
                {regularWeekendSelected} / {rules.max_weekend_days || 1} 天
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  regularWeekendSelected >= (rules.max_weekend_days || 1) ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${Math.min(100, (regularWeekendSelected / (rules.max_weekend_days || 1)) * 100)}%` }}
              />
            </div>
          </div>

          {/* 特休/補休獨立卡片 */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-lg p-2 min-w-[130px]">
            <div className="text-[11px] text-purple-700 font-bold mb-0.5">
              個人存摺排假 (不占額度)
            </div>
            <div className="text-[11px] text-slate-600 flex items-center space-x-2">
              <span>特休: <strong className="text-purple-800">{alSelectedCount}天</strong></span>
              <span>補休: <strong className="text-amber-700">{ctSelectedCount}天</strong></span>
            </div>
          </div>
        </div>
      </div>


      {/* 排班時限排程提醒卡片 (Issue #016) */}
      {!timelineCheck.allowed ? (
        <div className="mb-4 p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold flex items-center gap-2">
              <span>【排班時限管控提醒】一般同仁志願預訂時限管控</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 font-semibold">
                開放時段：每月 12 日 ~ 17 日
              </span>
            </div>
            <p className="text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              {timelineCheck.reason}
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold">🟢 目前處於「一般同仁劃休預訂開放期 (每月 12 ~ 17 日)」</span>
          </div>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
            請於 17 日 23:59 前完成劃休志願登記
          </span>
        </div>
      )}

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
                    <div className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center justify-between shadow-2xs ${
                      cell.myPref.leave_type === 'AL'
                        ? 'bg-amber-500 text-white'
                        : cell.myPref.leave_type === 'CT'
                        ? 'bg-purple-600 text-white'
                        : cell.myPref.priority === 1
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-600 text-white'
                    }`}>
                      <span>第 {cell.myPref.priority} 志願</span>
                      <span className="text-[9px] font-black opacity-95">
                        {cell.myPref.leave_type === 'AL' ? '特休(AL)' : cell.myPref.leave_type === 'CT' ? '補休(CT)' : '例休'}
                      </span>
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

            {/* 假別選擇 (需求 #006 方案 A) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">假別型態 (全日排定)</label>
              <select
                value={selectedLeaveType}
                onChange={(e) => setSelectedLeaveType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="OFF">自選常態例休 (一般排休，不扣存摺)</option>
                <option value="AL">
                  法定特休 (全日8h · 扣特休 1 天 · 餘額 {leaveBalance.annualLeaveDays || 0} 天)
                </option>
                <option value="CT">
                  彈性補休 (全日8h · 扣補休 8 小時 · 餘額 {leaveBalance.compTimeHours || 0} 小時)
                </option>
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
