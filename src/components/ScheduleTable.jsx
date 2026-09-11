// src/components/ScheduleTable.jsx
import React, { useState } from 'react';
import { SHIFT_TYPES } from '../types/scheduler.js';
import { User, Sparkles, AlertCircle, Calendar, Filter, Clock, CheckCircle2, AlertTriangle, Cloud, FileSpreadsheet, Edit3, Send, Check, X, Sliders, ChevronRight } from 'lucide-react';
import { getTimelineStatus } from '../engine/schedulingTimelineEngine.js';
import { isStatutoryHoliday } from '../data/holidayTransferStore.js';
import { formatShiftTime } from '../utils/timeFormatUtils.js';

export default function ScheduleTable({
  scheduleResult,
  validation,
  employees,
  stations,
  rules,
  selectedDay,
  onSelectDay,
  onExportIcs,
  onExportCsv,
  onRunEngine,
  onSaveToCloud,
  currentUser,
  shiftTypes = SHIFT_TYPES,
  currentSimulatedDate,
  holidayConsents = {},
  // 微調與二階審核 props
  pendingAdjustments = [],
  onSaveAdjustment,
  onBatchApproveAdjustments,
  onRejectAdjustment,
  onSubmitAdjustmentsToManager,
  leaveBalances = {}
}) {
  const statusInfo = getTimelineStatus(currentSimulatedDate || '2026-09-10');
  const simDay = statusInfo.day;
  const isManager = currentUser?.role === 'Manager';
  const isLeader = currentUser?.role === 'Leader';
  const myLeaderStation = isLeader 
    ? (stations.find(s => s.leader_emp_id === currentUser?.emp_id) || 
       stations.find(s => s.station_id === currentUser?.primary_station)) 
    : null;

  const [filterRole, setFilterRole] = useState('ALL'); // ALL, Leader, Staff, PT, Manager
  // 組長預設聚焦本組站點，非組長預設 ALL
  const [filterStation, setFilterStation] = useState(myLeaderStation ? myLeaderStation.station_id : 'ALL');

  // 微調編輯彈窗狀態
  const [editingCell, setEditingCell] = useState(null); // { emp, day, currentShift }
  const [newShiftCode, setNewShiftCode] = useState('A');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const totalDays = scheduleResult?.totalDays || 30;
  const scheduleMap = scheduleResult?.scheduleMap || {};

  const stationNameMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));
  const effectiveShiftDefs = shiftTypes || SHIFT_TYPES;

  // 取得平假日資訊與國定假日
  const [year, month] = (rules.target_year_month || '2026-09').split('-').map(Number);
  const monthStr = month < 10 ? '0' + month : '' + month;
  const dayHeaders = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekDayStr = ['日', '一', '二', '三', '四', '五', '六'][dayOfWeek];
    const dayStr = d < 10 ? '0' + d : '' + d;
    const fullDate = `${year}-${monthStr}-${dayStr}`;
    const holidayObj = isStatutoryHoliday(fullDate);
    dayHeaders.push({ day: d, isWeekend, weekDayStr, holidayObj, fullDate });
  }

  // 雙重篩選人員（角色 + 站點/組別）
  const filteredEmployees = employees.filter(emp => {
    if (filterRole !== 'ALL') {
      if (filterRole === 'Manager') {
        if (!emp.is_self_scheduled) return false;
      } else if (emp.role !== filterRole) {
        return false;
      }
    }
    if (filterStation !== 'ALL') {
      if (emp.primary_station !== filterStation) return false;
    }
    return true;
  });

  // 判定當前登入者是否可以微調該同仁的格子
  const canEditEmployeeCell = (emp) => {
    if (emp.is_self_scheduled) return isManager;
    if (isManager) return true;
    if (isLeader && myLeaderStation) {
      return emp.primary_station === myLeaderStation.station_id || (emp.supported_stations || []).includes(myLeaderStation.station_id);
    }
    return false;
  };

  // 取得特定同仁特定日期的微調記錄
  const getCellAdjustment = (empId, day) => {
    return (pendingAdjustments || []).find(a => a.emp_id === empId && a.day === day && a.status !== 'REJECTED');
  };

  // 點擊格子開啟微調
  const handleCellClick = (emp, day, currentShift) => {
    if (!canEditEmployeeCell(emp)) return;
    const existingAdj = getCellAdjustment(emp.emp_id, day);
    const initialCode = existingAdj ? existingAdj.new_shift : (currentShift?.shift_type || 'OFF');
    setEditingCell({
      emp,
      day,
      currentShift,
      existingAdj
    });
    setNewShiftCode(initialCode);
    setAdjustmentReason(existingAdj ? existingAdj.reason : '');
  };

  // 送出單格微調暫存
  const handleSaveAdjustmentSubmit = (e) => {
    e.preventDefault();
    if (!editingCell) return;
    const { emp, day, currentShift } = editingCell;

    // 若選定特休或補休，進行額度警示防呆
    const empBalance = leaveBalances[emp.emp_id] || { annualLeaveDays: 0, compTimeHours: 0 };
    if (newShiftCode === 'AL' && empBalance.annualLeaveDays <= 0) {
      if (!window.confirm(`同仁【${emp.name}】目前可用特休天數為 0 天，確定仍要排定特休嗎？`)) {
        return;
      }
    }
    if (newShiftCode === 'CT' && empBalance.compTimeHours < 8) {
      if (!window.confirm(`同仁【${emp.name}】目前可用補休為 ${empBalance.compTimeHours} 小時（不足 8 小時），確定仍要排定補休嗎？`)) {
        return;
      }
    }

    const adjEntry = {
      adj_id: editingCell.existingAdj?.adj_id || `ADJ_${Date.now()}_${emp.emp_id}_${day}`,
      emp_id: emp.emp_id,
      emp_name: emp.name,
      primary_station: emp.primary_station,
      day: day,
      original_shift: currentShift?.shift_type || 'OFF',
      new_shift: newShiftCode,
      reason: adjustmentReason || (isLeader ? '組長站點微調' : '主管排班調整'),
      proposed_by_id: currentUser?.emp_id || 'SYS',
      proposed_by_name: currentUser?.name || '系統',
      proposed_role: currentUser?.role || 'Leader',
      status: isManager ? 'APPROVED_DIRECT' : 'DRAFT_LEADER', // Manager 直接核定或 Leader 暫存
      created_at: new Date().toISOString()
    };

    if (onSaveAdjustment) {
      onSaveAdjustment(adjEntry);
    }
    setEditingCell(null);
    setFeedbackMsg(`已成功暫存【${emp.name}】9月${day}日班別微調 (${adjEntry.original_shift} → ${adjEntry.new_shift})！`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  // 組長上呈待審清單（僅限本組未上呈之 DRAFT）
  const myStationDraftCount = (pendingAdjustments || []).filter(a => 
    a.status === 'DRAFT_LEADER' && 
    (isManager || a.primary_station === myLeaderStation?.station_id)
  ).length;

  // 待 Manager 終審之清單（包含 SUBMITTED 與 DRAFT_LEADER）
  const pendingForManager = (pendingAdjustments || []).filter(a => a.status === 'SUBMITTED' || a.status === 'DRAFT_LEADER');

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* 排班時限階段專屬提示 (Issue #016) */}
      {simDay >= 20 && simDay <= 23 && (
        <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span className="font-bold">【階段 4/8 · 營運高管覆審期 (每月 20~23 日)】全場排班調度進行中</span>
          </div>
          <span className="text-[11px] font-semibold text-amber-800">
            請 Manager 於 24 日前覆核組長微調並完成全場排定定稿
          </span>
        </div>
      )}

      {/* 微調作業操作提示橫幅 (Leader 暫存上呈 / Manager 覆核) */}
      {isLeader && myStationDraftCount > 0 && (
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-indigo-900 font-bold">
            <Edit3 className="w-4 h-4 text-indigo-600" />
            <span>本組有 {myStationDraftCount} 筆排班微調暫存中（點擊格子可繼續微調）：</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onSubmitAdjustmentsToManager) {
                onSubmitAdjustmentsToManager(myLeaderStation?.station_id);
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>確認本組微調 · 一鍵上呈經理覆核</span>
          </button>
        </div>
      )}

      {isManager && pendingForManager.length > 0 && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-amber-900 font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>🔔 收到站點組長上呈之班表微調申請 (共 {pendingForManager.length} 筆待覆核)：</span>
          </div>
          <button
            type="button"
            onClick={() => setIsReviewModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>審核組長微調清單 ({pendingForManager.length})</span>
          </button>
        </div>
      )}

      {feedbackMsg && (
        <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* 控制工具列 */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        {/* 左側：身分過濾與站點/組別過濾 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 角色過濾 */}
          <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-1 text-xs shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">全部身分 ({employees.length}人)</option>
              <option value="Leader">🛡️ 站點組長</option>
              <option value="Staff">👤 正職同仁</option>
              <option value="PT">⏱️ 計時人員 (PT)</option>
              <option value="Manager">👑 營運高管</option>
            </select>
          </div>

          {/* 站點/組別過濾 (組長預設聚焦本組) */}
          <div className="flex items-center space-x-1 bg-white border border-slate-300 rounded-lg p-1 text-xs shadow-2xs">
            <span className="text-[11px] font-bold text-indigo-600 ml-1">組別:</span>
            <select
              value={filterStation}
              onChange={(e) => setFilterStation(e.target.value)}
              className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">全館 9 大營業站點</option>
              {stations.map(st => (
                <option key={st.station_id} value={st.station_id}>
                  {st.station_name} {myLeaderStation?.station_id === st.station_id ? '★ 本組' : ''}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            呈現 {filteredEmployees.length} 位同仁
          </span>
        </div>

        {/* 右側：主管智慧排班、發布雲端、匯出 */}
        <div className="flex items-center flex-wrap gap-2">
          {isManager && (
            <>
              <button
                onClick={() => onRunEngine && onRunEngine()}
                title="重新啟動排班引擎進行智慧排班計算"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>啟動智慧排班</span>
              </button>

              <button
                onClick={() => onSaveToCloud && onSaveToCloud()}
                title="將當前排班結果發布並持久化儲存至 Google 試算表"
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors active:scale-95"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>儲存至Google試算表</span>
              </button>
            </>
          )}

          <div className="flex items-center space-x-1.5 pl-1 border-l border-slate-200">
            <button
              onClick={() => onExportIcs && onExportIcs()}
              title="下載我的專屬手機日曆 (.ics)，支援 iPhone 與 Google Calendar"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>匯出我的 .ics</span>
            </button>

            <button
              onClick={() => onExportCsv && onExportCsv()}
              title="匯出全館美化班表 Excel / CSV (含例休與休假註記)"
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-bold shadow-2xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              <span>匯出全館 CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 排班矩陣大表 Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {/* 人員固定欄 */}
              <th className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 z-20 bg-slate-50 min-w-[140px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                同仁 / 站點
              </th>

              {/* 1 ~ 30 日表頭 */}
              {dayHeaders.map(({ day, isWeekend, weekDayStr, holidayObj }) => {
                const isSelected = selectedDay === day;
                return (
                  <th
                    key={day}
                    id={`schedule-day-col-${day}`}
                    onClick={() => onSelectDay(day)}
                    className={`p-1.5 text-center border-r border-slate-200 min-w-[34px] cursor-pointer transition-colors select-none relative ${
                      isSelected 
                        ? 'bg-indigo-600 text-white font-extrabold shadow-inner' 
                        : holidayObj
                        ? 'bg-rose-100/70 text-rose-900 hover:bg-rose-200/70'
                        : isWeekend 
                        ? 'bg-rose-50/70 text-rose-700 hover:bg-rose-100/70' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    title={holidayObj ? `法定國定假日：${holidayObj.name}` : `點擊檢視 9月${day}日 (${weekDayStr}) 站點合規燈號`}
                  >
                    {holidayObj && (
                      <div className="text-[8px] leading-tight font-black text-rose-600 bg-white/90 rounded px-0.5 mb-0.5 truncate">
                        {holidayObj.name.includes('中秋') ? '中秋' : holidayObj.name.includes('國慶') ? '國慶' : '國假'}
                      </div>
                    )}
                    <div className="text-[11px] font-bold leading-none">{day}</div>
                    <div className={`text-[9px] mt-0.5 ${isSelected ? 'text-indigo-100' : isWeekend ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                      {weekDayStr}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={totalDays + 1} className="p-8 text-center text-slate-400 text-xs">
                  目前篩選條件下無符合條件之同仁。
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isEmpManager = emp.is_self_scheduled;
                const canEditThisEmp = canEditEmployeeCell(emp);

                return (
                  <tr key={emp.emp_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* 同仁名稱與標籤欄 */}
                    <td className="p-2.5 border-r border-slate-200 sticky left-0 z-10 bg-white shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate max-w-[90px]">{emp.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          isEmpManager 
                            ? 'bg-purple-100 text-purple-700' 
                            : emp.role === 'Leader'
                            ? 'bg-blue-100 text-blue-700'
                            : emp.role === 'PT'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isEmpManager ? '高管' : emp.role === 'Leader' ? '組長' : emp.role === 'PT' ? 'PT' : '正職'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {stationNameMap[emp.primary_station] || emp.primary_station}
                        {emp.can_solo && ' · Solo'}
                      </div>
                    </td>

                    {/* 1 ~ 30 日班別格 */}
                    {dayHeaders.map(({ day, isWeekend, holidayObj }) => {
                      const shift = scheduleMap[emp.emp_id]?.[day];
                      const shiftCode = shift?.shift_type;
                      const cellAdj = getCellAdjustment(emp.emp_id, day);
                      // 若有暫存微調，視覺優先展示微調擬改班別
                      const effectiveCode = cellAdj ? cellAdj.new_shift : shiftCode;
                      const shiftDef = effectiveShiftDefs[effectiveCode];

                      let cellBg = isWeekend ? 'bg-rose-50/20' : '';
                      if (holidayObj) cellBg = 'bg-rose-50/40';
                      let pillStyle = 'text-slate-300';
                      let label = '-';

                      if (isEmpManager) {
                        pillStyle = 'text-slate-300 font-light';
                        label = '留白';
                      } else if (effectiveCode === 'REG_OFF') {
                        pillStyle = 'bg-rose-600 text-white font-black border border-rose-700 shadow-2xs';
                        label = '例';
                      } else if (effectiveCode === 'OFF' || effectiveCode === 'REST_OFF') {
                        pillStyle = 'bg-rose-100 text-rose-700 font-bold border border-rose-200';
                        label = '休';
                      } else if (effectiveCode === 'TERM_OFF') {
                        pillStyle = 'bg-slate-200 text-slate-500 font-semibold';
                        label = '空';
                      } else if (effectiveCode === 'AL') {
                        pillStyle = 'bg-amber-100 text-amber-800 font-bold border border-amber-300';
                        label = '特';
                      } else if (effectiveCode === 'CT') {
                        pillStyle = 'bg-purple-100 text-purple-800 font-bold border border-purple-300';
                        label = '補';
                      } else if (shiftDef) {
                        label = effectiveCode;
                        pillStyle = `${shiftDef.color || 'bg-indigo-100 text-indigo-800'} font-bold border shadow-2xs`;
                      }

                      // 國定假日出勤調移簽認狀態檢核
                      const isHolidayDuty = holidayObj && effectiveCode && !['OFF', 'REG_OFF', 'REST_OFF', 'TERM_OFF'].includes(effectiveCode) && !isEmpManager;
                      const consentKey = `${rules.target_year_month || '2026-09'}_${day}_${emp.emp_id}`;
                      const isConsented = isHolidayDuty ? !!holidayConsents[consentKey] : false;

                      let holidayTooltip = '';
                      if (isHolidayDuty) {
                        holidayTooltip = isConsented 
                          ? `\n[國假調移: ${emp.name} 已同意出勤免雙薪]` 
                          : `\n[⚠️ 國假調移: 待同仁同意簽署 (服務業免雙薪要件)]`;
                      }

                      const adjTooltip = cellAdj ? `\n[微調提案: 原 ${cellAdj.original_shift} 擬改為 ${cellAdj.new_shift} (${cellAdj.reason}) - 待審核]` : '';

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(emp, day, shift)}
                          className={`p-1 text-center border-r border-slate-100 relative ${cellBg} ${
                            selectedDay === day ? 'bg-indigo-50/50' : ''
                          } ${canEditThisEmp ? 'cursor-pointer hover:ring-1 hover:ring-indigo-400' : ''}`}
                          title={
                            shift || cellAdj
                              ? `${emp.name} | ${day}日: ${effectiveCode || '留白'} (${stationNameMap[shift?.station_id || emp.primary_station] || '-'}) - ${shiftDef?.name || ''}${holidayTooltip}${adjTooltip}`
                              : ''
                          }
                        >
                          <div
                            className={`w-6 h-6 mx-auto rounded flex items-center justify-center text-[11px] transition-transform relative ${pillStyle}`}
                          >
                            {label}

                            {/* 微調待審標記（琥珀色指示點） */}
                            {cellAdj && (
                              <span 
                                title={`微調提案中: ${cellAdj.original_shift} → ${cellAdj.new_shift}`}
                                className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-white flex items-center justify-center text-[7px] text-white font-black"
                              >
                                改
                              </span>
                            )}

                            {isHolidayDuty && (
                              <span 
                                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white ${
                                  isConsented ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'
                                }`} 
                              />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 底部班別圖例說明（修復時間格式與一例一休標籤） */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700">圖例說明：</span>

          {/* 法定一例一休與請假標章 */}
          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 rounded text-[10px] font-black flex items-center justify-center bg-rose-600 text-white">例</span>
            <span className="font-semibold text-rose-800">法定例休</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-rose-100 text-rose-700 border border-rose-200">休</span>
            <span>一般休假</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-amber-100 text-amber-800 border border-amber-300">特</span>
            <span>排定特休</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center bg-purple-100 text-purple-800 border border-purple-300">補</span>
            <span>排定補休</span>
          </div>

          {/* 各出勤班別 */}
          {Object.values(effectiveShiftDefs).filter(s => !['OFF', 'TERM_OFF', 'AL', 'CT', 'REG_OFF', 'REST_OFF'].includes(s.code)).map(s => {
            const timeDisplay = s.startTime && s.startTime !== '-' 
              ? ` (${formatShiftTime(s.startTime)}~${formatShiftTime(s.endTime)})` 
              : '';
            return (
              <div key={s.code} className="flex items-center space-x-1">
                <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center ${s.color || 'bg-slate-200 text-slate-700'}`}>
                  {s.code}
                </span>
                <span>{s.name}{timeDisplay}</span>
              </div>
            );
          })}
        </div>

        <div className="text-slate-400">
          ★ 組長可微調本組同仁格子並一鍵上呈；經理可點選全館覆核定稿
        </div>
      </div>

      {/* 彈窗 1: 格子快速微調抽屜/彈窗 (Quick Shift Adjuster) */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveAdjustmentSubmit} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  排班微調: {editingCell.emp.name} ({9}月{editingCell.day}日)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-slate-500">原排定班別:</span>
                  <span className="font-bold text-slate-800">{editingCell.currentShift?.shift_type || '留白/休'}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">主屬站點:</span>
                  <span className="font-semibold text-slate-700">{stationNameMap[editingCell.emp.primary_station] || editingCell.emp.primary_station}</span>
                </div>
              </div>

              {/* 選擇新擬班別 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">新擬排定班別 / 請假</label>
                <select
                  value={newShiftCode}
                  onChange={(e) => setNewShiftCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-bold text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <optgroup label="營業出勤班別">
                    {Object.values(effectiveShiftDefs).filter(s => !['OFF', 'TERM_OFF', 'AL', 'CT', 'REG_OFF', 'REST_OFF'].includes(s.code)).map(s => (
                      <option key={s.code} value={s.code}>
                        {s.code} {s.name} ({formatShiftTime(s.startTime)}~{formatShiftTime(s.endTime)})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="法定休假 (一例一休)">
                    <option value="REG_OFF">🟥 例 法定例休 (剛性不可出勤)</option>
                    <option value="REST_OFF">⬜ 休 一般休假 (休息日輪休)</option>
                  </optgroup>
                  <optgroup label="事前請假 (排定即扣存摺)">
                    <option value="AL">🟨 特 排定特休 (可用: {leaveBalances[editingCell.emp.emp_id]?.annualLeaveDays || 0} 天)</option>
                    <option value="CT">🟪 補 排定補休 (可用: {leaveBalances[editingCell.emp.emp_id]?.compTimeHours || 0} 小時)</option>
                  </optgroup>
                </select>
              </div>

              {/* 微調原因 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">微調調整原因 / 說明</label>
                <input
                  type="text"
                  required
                  placeholder="如：站點尖峰支援調整、同仁排特休..."
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
              >
                {isManager ? '確認直接覆核套用' : '暫存微調 (待上呈)'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 彈窗 2: Manager 審核微調清單彈窗 (Approval Modal) */}
      {isReviewModalOpen && isManager && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  站點組長上呈微調覆審中心 (共 {pendingForManager.length} 筆)
                </h3>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs mb-4">
              {pendingForManager.map(adj => (
                <div key={adj.adj_id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{adj.emp_name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({adj.emp_id})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        9月{adj.day}日
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold">
                        提案人: {adj.proposed_by_name}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center space-x-2 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold text-slate-600">原: {adj.original_shift}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-black">新: {adj.new_shift}</span>
                      <span className="text-slate-500 italic truncate max-w-xs">— {adj.reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (onRejectAdjustment) onRejectAdjustment(adj.adj_id);
                      }}
                      className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px]"
                    >
                      駁回
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs"
              >
                關閉
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onBatchApproveAdjustments) {
                    onBatchApproveAdjustments(pendingForManager);
                  }
                  setIsReviewModalOpen(false);
                  setFeedbackMsg(`已成功全數核准 ${pendingForManager.length} 筆微調並套用入排班大表！`);
                  setTimeout(() => setFeedbackMsg(''), 3000);
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95"
              >
                一鍵全部核准並套入班表
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
