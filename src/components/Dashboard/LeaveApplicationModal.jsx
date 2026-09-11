import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, AlertCircle, CheckCircle2, Send, ShieldAlert } from 'lucide-react';
import { LEAVE_TYPE_LABELS } from '../../data/leaveStore.js';
import { isWorkingShift } from '../../types/scheduler.js';

export default function LeaveApplicationModal({
  isOpen,
  onClose,
  currentUser,
  scheduleMap,
  rules,
  leaveBalances,
  onSubmitLeaveApplication
}) {
  if (!isOpen) return null;

  const totalDays = rules.days_in_month || 30;
  const yearMonth = rules.target_year_month || '2026-09';
  const mySchedule = scheduleMap[currentUser?.emp_id] || {};
  const balance = leaveBalances[currentUser?.emp_id] || { annualLeaveDays: 0, compTimeHours: 0 };

  // 取得當日日期 (基準：如 2026-09-11 則今日為 11)
  // 核心防呆：只能請「當月未來臨的日子 (Date > Today)」
  const todayDate = 11; // 基準模擬日 9/11

  // 篩選出「未來臨且有排班出勤」的有效日期清單
  const availableFutureWorkDays = useMemo(() => {
    const list = [];
    for (let d = todayDate + 1; d <= totalDays; d++) {
      const shift = mySchedule[d];
      if (shift && isWorkingShift(shift.shift_type)) {
        list.push({
          day: d,
          dateStr: `${yearMonth}-${d < 10 ? '0' + d : d}`,
          shiftCode: shift.shift_type,
          stationId: shift.station_id || currentUser?.primary_station
        });
      }
    }
    return list;
  }, [mySchedule, totalDays, yearMonth, currentUser?.primary_station]);

  const [selectedDay, setSelectedDay] = useState(availableFutureWorkDays[0]?.day || (todayDate + 1));
  const [selectedLeaveType, setSelectedLeaveType] = useState('AL'); // AL, CT, PERSONAL, SICK
  const [reason, setReason] = useState('個人家庭重要事務');
  const [feedback, setFeedback] = useState('');

  // 檢核選定假別的餘額是否足夠
  const balanceCheck = useMemo(() => {
    if (selectedLeaveType === 'AL') {
      const daysLeft = balance.annualLeaveDays || 0;
      return {
        isValid: daysLeft >= 1,
        message: daysLeft >= 1 ? `可用特休天數：${daysLeft} 天` : `特休天數不足（目前剩餘 0 天），無法申請！`
      };
    }
    if (selectedLeaveType === 'CT') {
      const hoursLeft = balance.compTimeHours || 0;
      return {
        isValid: hoursLeft >= 8,
        message: hoursLeft >= 8 ? `可用補休時數：${hoursLeft} 小時 (折抵全日 8 小時)` : `補休時數不足 8 小時（目前剩餘 ${hoursLeft} 小時），無法申請！`
      };
    }
    return { isValid: true, message: '依法照實申報' };
  }, [selectedLeaveType, balance]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!balanceCheck.isValid) return;

    if (availableFutureWorkDays.length === 0) {
      setFeedback('本月未來已無排定之出勤日可申請請假！');
      return;
    }

    const targetDayInfo = availableFutureWorkDays.find(d => d.day === Number(selectedDay));
    const newApp = {
      app_id: `LA_${Date.now()}_${currentUser.emp_id}`,
      emp_id: currentUser.emp_id,
      emp_name: currentUser.name,
      station_id: targetDayInfo?.stationId || currentUser.primary_station,
      date: targetDayInfo?.dateStr || `${yearMonth}-${selectedDay}`,
      day: Number(selectedDay),
      leave_type: selectedLeaveType,
      hours: 8,
      days: 1,
      reason: reason || '個人事前請假申請',
      status: 'PENDING_LEADER', // 啟動二重核可管線：待組長初審
      created_at: new Date().toISOString()
    };

    onSubmitLeaveApplication(newApp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-scaleUp">
        {/* 表頭 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              📝
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">線上請假申請單 (事前請假 · 二重核可制)</h3>
              <p className="text-[11px] text-slate-500">
                僅限申請當月未來臨之出勤日 · 送出後經組長初審與高管終審
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 核心法規防呆提示卡 */}
        <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-[11px] text-indigo-900">
            <span className="font-bold">營運考勤規則提醒：</span>
            <p>
              1. 依現場管理規範，事前請假<strong>只能申請今日之後的未來出勤日</strong>（已過去之缺勤事實請洽主管於「實勤覆核」中處理）。
            </p>
            <p>
              2. 審核流程採<strong>【二重核可制】</strong>：送出後先由站點組長初審把關人力，再由營運主管 (Manager) 終審核發並自動更新班表與存摺。
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 請假日期選擇 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              請假日期 (僅列出今日之後且已排班之出勤日)
            </label>
            {availableFutureWorkDays.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-bold">
                ⚠️ 當月今日之後已無排定之出勤日（或已全為排休），無可請假日。
              </div>
            ) : (
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg p-2.5 text-xs font-bold bg-white cursor-pointer"
              >
                {availableFutureWorkDays.map(item => (
                  <option key={item.day} value={item.day}>
                    {item.dateStr} (原排定: {item.shiftCode} 班 · 全日 8 小時)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 假別選擇 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              申請假別 (特休/補休核准後自動扣抵存摺)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: 'AL', name: '特休假 (AL)', sub: `餘額: ${balance.annualLeaveDays || 0} 天`, color: 'purple' },
                { type: 'CT', name: '補休假 (CT)', sub: `餘額: ${balance.compTimeHours || 0} 小時`, color: 'amber' },
                { type: 'PERSONAL', name: '事假 (扣全薪)', sub: '依出勤扣發', color: 'rose' },
                { type: 'SICK', name: '病假 (扣半薪)', sub: '出具就醫收據', color: 'blue' }
              ].map(item => (
                <button
                  type="button"
                  key={item.type}
                  onClick={() => setSelectedLeaveType(item.type)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedLeaveType === item.type
                      ? 'border-indigo-600 bg-indigo-50/70 ring-1 ring-indigo-600 text-indigo-950 font-bold'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="text-xs">{item.name}</div>
                  <div className="text-[10px] text-slate-500">{item.sub}</div>
                </button>
              ))}
            </div>

            {/* 額度校驗警示 */}
            <div className={`mt-2 p-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 ${
              balanceCheck.isValid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {balanceCheck.isValid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
              <span>{balanceCheck.message}</span>
            </div>
          </div>

          {/* 請假原因 */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              請假事由 (快捷下拉或手動輸入)
            </label>
            <div className="space-y-1.5">
              <select
                value={reason}
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    setReason('');
                  } else {
                    setReason(e.target.value);
                  }
                }}
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-slate-50 font-medium"
              >
                <option value="個人家庭重要事務">🏠 個人家庭重要事務 (預設)</option>
                <option value="親友婚慶需返鄉出席">💒 親友婚慶需返鄉出席</option>
                <option value="身體不適需就醫休養">🏥 身體不適需就醫休養</option>
                <option value="辦理個人法律/行政證件">📄 辦理個人法律/行政證件</option>
                <option value="CUSTOM">✏️ 其他（手動輸入事由）</option>
              </select>

              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="若選「其他」或需補充，請在此輸入具體事由..."
                className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {feedback && (
            <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg">
              {feedback}
            </div>
          )}

          {/* 按鈕群 */}
          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!balanceCheck.isValid || availableFutureWorkDays.length === 0}
              className={`flex items-center space-x-1.5 px-5 py-2 rounded-lg text-white font-bold text-xs shadow-xs transition-all ${
                balanceCheck.isValid && availableFutureWorkDays.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>送出二重核可請假單</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
