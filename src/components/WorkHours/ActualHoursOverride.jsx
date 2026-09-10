import React, { useState, useMemo } from 'react';
import { Clock, Check, AlertCircle, Sparkles, FileText, Save, AlertTriangle, ShieldCheck, UserCheck, Calendar } from 'lucide-react';

/**
 * 主管端實勤覆核與工時微調面板 (Hours Override)
 * 依照主管【需求 #003】規範重構：
 * 1. 實際出勤開始時間、結束時間下拉選單 (每 30 分鐘一刻度)
 * 2. 實際休息時間下拉選單 (0, 0.5, 1, 1.5, 2 小時)
 * 3. 勞基法第 35 條防呆 (連續出勤滿 4 小時強制配置 >= 0.5 小時休息)
 * 4. 自動工時比對：正職自動增減補休時數，PT 結算實際到班工時
 * 5. 日期嚴格防呆：僅開放當日 (含今日之前)，未來未發生日期全面鎖定禁止選取
 */
export default function ActualHoursOverride({
  employees,
  stations,
  scheduleMap,
  onOverrideHours
}) {
  // 業務設定：當前系統營運當日 (9 月 10 日)
  const TODAY_DAY = 10;

  const [selectedDay, setSelectedDay] = useState(10);
  const [selectedEmpId, setSelectedEmpId] = useState('B112001'); // 預設李俐旻
  const [isAbsent, setIsAbsent] = useState(false); // 當日未到勤/全日請假

  // 時間選單選項產生器 (每 30 分鐘一刻度)
  const startTimeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'
  ];

  const endTimeOptions = [
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00'
  ];

  const breakOptions = [
    { value: 0, label: '0 小時 (無休息)' },
    { value: 0.5, label: '0.5 小時 (30 分鐘)' },
    { value: 1, label: '1.0 小時 (60 分鐘)' },
    { value: 1.5, label: '1.5 小時 (90 分鐘)' },
    { value: 2, label: '2.0 小時 (120 分鐘)' }
  ];

  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [breakHours, setBreakHours] = useState(1.0);
  const [actualNoteInput, setActualNoteInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const currentEmp = employees.find(e => e.emp_id === selectedEmpId) || employees[0];
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  const scheduledShift = scheduleMap[currentEmp?.emp_id]?.[selectedDay];
  const scheduledHours = scheduledShift?.work_hours || 0;
  const isPT = currentEmp?.role === 'PT';

  // 時間字串轉小數小時 (如 "08:30" -> 8.5)
  const timeToDecimal = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return h + (m || 0) / 60;
  };

  // 當選擇同仁或日期變更時，依原排班別智能初始化起訖時間
  const syncShiftDefaults = (empId, day) => {
    const s = scheduleMap[empId]?.[day];
    const shiftCode = s?.shift_type;
    if (s?.actual_start_time && s?.actual_end_time) {
      setStartTime(s.actual_start_time);
      setEndTime(s.actual_end_time);
      setBreakHours(s.actual_break_hours !== undefined ? s.actual_break_hours : 1.0);
      setIsAbsent(false);
      return;
    }
    if (!shiftCode || shiftCode === 'OFF' || shiftCode === 'TERM_OFF') {
      setIsAbsent(true);
      return;
    }
    setIsAbsent(false);
    switch (shiftCode) {
      case 'A':
        setStartTime('08:30');
        setEndTime('17:30');
        setBreakHours(1.0);
        break;
      case 'B':
        setStartTime('10:00');
        setEndTime('19:00');
        setBreakHours(1.0);
        break;
      case 'C':
        setStartTime('13:30');
        setEndTime('22:30');
        setBreakHours(1.0);
        break;
      case 'D':
        setStartTime('11:00');
        setEndTime('20:00');
        setBreakHours(1.0);
        break;
      default:
        setStartTime('10:00');
        setEndTime('19:00');
        setBreakHours(1.0);
    }
  };

  // 跨度與淨工時計算
  const startDec = timeToDecimal(startTime);
  const endDec = timeToDecimal(endTime);
  const totalSpanHours = isAbsent ? 0 : Math.max(0, endDec - startDec);
  const netActualHours = isAbsent ? 0 : Math.max(0, totalSpanHours - breakHours);

  // 勞基法第 35 條檢核：工作滿 4 小時必須有至少 0.5 小時 (30分鐘) 休息時間
  const isLaborLaw35Violated = !isAbsent && totalSpanHours >= 4.5 && breakHours < 0.5;

  // 勞基法第 32 條檢核：單日總工時不得超過 12 小時
  const isLaborLaw32Violated = !isAbsent && netActualHours > 12;

  // 工時差額 (淨實勤 - 原排定)
  const hoursDiff = isAbsent ? (0 - scheduledHours) : (netActualHours - scheduledHours);

  // 執行覆核送出
  const handleSaveOverride = (e) => {
    e.preventDefault();

    // 勞基法第 35 條剛性防呆
    if (isLaborLaw35Violated) {
      setFeedbackMsg('剛性阻擋：違反《勞基法》第 35 條！在勤滿 4 小時未配置至少 0.5 小時休息時間，無法送出！');
      setTimeout(() => setFeedbackMsg(''), 5000);
      return;
    }

    // 勞基法第 32 條剛性防呆
    if (isLaborLaw32Violated) {
      setFeedbackMsg('剛性阻擋：違反《勞基法》第 32 條！單日總工時不得超過 12 小時！');
      setTimeout(() => setFeedbackMsg(''), 5000);
      return;
    }

    if (!isAbsent && endDec <= startDec) {
      setFeedbackMsg('時間邏輯錯誤：出勤結束時間必須晚於開始時間！');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    onOverrideHours({
      empId: currentEmp.emp_id,
      day: selectedDay,
      actualHours: netActualHours,
      startTime: isAbsent ? null : startTime,
      endTime: isAbsent ? null : endTime,
      breakHours: isAbsent ? 0 : breakHours,
      diffHours: hoursDiff,
      isAbsent: isAbsent,
      notes: actualNoteInput || (
        isAbsent 
          ? '全日未到勤核定' 
          : `實勤覆核 ${startTime}~${endTime} (休${breakHours}h, 淨${netActualHours}h, 差額${hoursDiff >= 0 ? '+' : ''}${hoursDiff}h)`
      )
    });

    const resultNote = isPT
      ? `PT 人員實際到班結算 ${netActualHours} 小時，已累計至本月總工時！`
      : hoursDiff > 0
      ? `正職加班增額 +${hoursDiff} 小時，已自動為 ${currentEmp.name} 累計補休！`
      : hoursDiff < 0
      ? `正職出勤短少 ${hoursDiff} 小時，已自動扣減補休！`
      : `出勤工時完全符合原排 (${netActualHours}h)，補休無變動。`;

    setFeedbackMsg(`已成功覆核 ${currentEmp.name} 於 9/${selectedDay} 日實勤！${resultNote}`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 頂部標題 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              主管端實勤覆核與工時微調面板 (Hours Override)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心決策 13 & 8-6：打卡起訖精確覆核 · 勞基法 35 條休息防呆 · 正職補休/PT工時自動連動
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>勞基法 35 條防呆已啟用</span>
          </span>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
            今日：9 月 {TODAY_DAY} 日
          </span>
        </div>
      </div>

      {/* 限制提示橫幅 */}
      <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            <strong>實勤覆核限制規則</strong>：實勤覆核僅開放<strong>當日（9/{TODAY_DAY}日）及以前</strong>已發生之出勤紀錄；未來尚未發生之日期全數反灰停用。
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="font-semibold">{feedbackMsg}</span>
        </div>
      )}

      {/* 覆核操作表單 */}
      <form onSubmit={handleSaveOverride} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 text-xs">
          {/* 1. 選擇同仁 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">覆核同仁對象</label>
            <select
              value={selectedEmpId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedEmpId(id);
                syncShiftDefaults(id, selectedDay);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
            >
              {employees.filter(e => !e.is_self_scheduled).map(e => (
                <option key={e.emp_id} value={e.emp_id}>
                  {e.name} ({stationMap[e.primary_station] || e.primary_station} · {e.role === 'PT' ? '計時PT' : '正職'})
                </option>
              ))}
            </select>
          </div>

          {/* 2. 選擇日期 (落實未來日期反灰鎖定) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              出勤日期 (限今日前)
            </label>
            <select
              value={selectedDay}
              onChange={(e) => {
                const d = Number(e.target.value);
                setSelectedDay(d);
                syncShiftDefaults(selectedEmpId, d);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
                const isFuture = d > TODAY_DAY;
                return (
                  <option key={d} value={d} disabled={isFuture}>
                    9 月 {d} 日 {isFuture ? '(未來未到班 · 鎖定)' : d === TODAY_DAY ? '(今日)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. 原排定工時 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">系統原排定班別與工時</label>
            <div className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-between">
              <span>{scheduledShift?.shift_type || 'OFF'} 班</span>
              <span className="text-indigo-600">{scheduledHours} 小時</span>
            </div>
          </div>

          {/* 4. 到勤狀態切換 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">當日到勤註記</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsAbsent(false)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  !isAbsent 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                實際出勤
              </button>
              <button
                type="button"
                onClick={() => setIsAbsent(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  isAbsent 
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                未到勤/公假
              </button>
            </div>
          </div>
        </div>

        {/* 出勤打卡時段與休息下拉選單 */}
        {!isAbsent ? (
          <div className="p-4 rounded-xl bg-white border border-slate-200 mb-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
              {/* 開始時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">實際出勤開始時間</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                >
                  {startTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 結束時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">實際出勤結束時間</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                >
                  {endTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 休息時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">實際休息時間 (勞基法35條)</label>
                <select
                  value={breakHours}
                  onChange={(e) => setBreakHours(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                >
                  {breakOptions.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 勞基法第 35 條防呆提示 */}
            {isLaborLaw35Violated && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center space-x-2 mb-2 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold">
                  ⚠️ 違反《勞基法》第 35 條：在勤跨度達 {totalSpanHours} 小時（滿 4 小時），休息時間至少需配置 0.5 小時（30分鐘）！請調整休息時間。
                </span>
              </div>
            )}

            {/* 淨工時與差額即時試算橫幅 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">在勤時間總跨度：</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{totalSpanHours} 小時</span>
              </div>

              <div>
                <span className="text-slate-500 block">扣除休息後淨實勤：</span>
                <span className="font-mono font-black text-indigo-700 text-sm">{netActualHours} 小時</span>
              </div>

              <div>
                <span className="text-slate-500 block">
                  {isPT ? '計時 PT 結算：' : '正職排班差額比對：'}
                </span>
                {isPT ? (
                  <span className="font-bold text-amber-700">
                    累計到班 {netActualHours}h (計薪對帳基準)
                  </span>
                ) : (
                  <span className={`font-bold font-mono text-sm ${
                    hoursDiff > 0 ? 'text-emerald-600' : hoursDiff < 0 ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {hoursDiff > 0 ? `+${hoursDiff} 小時 (自動增加補休)` : hoursDiff < 0 ? `${hoursDiff} 小時 (扣減補休)` : '0 小時 (相符)'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 mb-4 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>當日註記為「全日未到勤/公假」，實勤工時將核定為 0 小時。</span>
            </div>
            {!isPT && (
              <span className="font-bold text-rose-700 font-mono">
                排班短少 -{scheduledHours} 小時
              </span>
            )}
          </div>
        )}

        {/* 現場備註與加班事由 */}
        <div className="mb-4 text-xs">
          <label className="font-bold text-slate-700 block mb-1">現場微調事由與核定備註</label>
          <input
            type="text"
            value={actualNoteInput}
            onChange={(e) => setActualNoteInput(e.target.value)}
            placeholder="如：晚間現場突發人潮尖峰，經組長同意延長支援 1.5 小時..."
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLaborLaw35Violated || isLaborLaw32Violated}
            className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>儲存實勤覆核並連動補休/PT工時</span>
          </button>
        </div>
      </form>
    </div>
  );
}
