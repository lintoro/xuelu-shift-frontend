import React, { useState } from 'react';
import { Calendar, Award, Clock, ArrowLeftRight, Download, CheckCircle, CheckCircle2, ShieldAlert, Sparkles, User, BookOpen, FileCheck2, AlertCircle, FileText, Check } from 'lucide-react';
import { SHIFT_TYPES, isWorkingShift } from '../../types/scheduler.js';
import { checkEmployeeHolidayConsent } from '../../data/holidayTransferStore.js';
import LeavePassbookModal from './LeavePassbookModal.jsx';

export default function MyDashboard({
  currentUser,
  scheduleMap,
  stations,
  leaveBalances,
  swapRequests,
  rules,
  passbookTransactions = [],
  isSettlementPublished = false,
  signOffList = {},
  holidayConsents = {},
  onSignHolidayConsent,
  onSignOff,
  onExportMyIcs,
  onNavigateTab
}) {
  const [isPassbookOpen, setIsPassbookOpen] = useState(false);
  const totalDays = rules.days_in_month || 30;
  const yearMonth = rules.target_year_month || '2026-09';
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));
  const balance = leaveBalances[currentUser.emp_id] || { annualLeaveDays: 0, compTimeHours: 0 };

  const mySchedule = scheduleMap[currentUser.emp_id] || {};

  // 統計個人本月數據
  let myWorkDays = 0;
  let myOffDays = 0;
  let myTotalHours = 0;

  const myShiftsList = [];
  for (let d = 1; d <= totalDays; d++) {
    const shift = mySchedule[d];
    if (isWorkingShift(shift?.shift_type)) {
      myWorkDays++;
      const hrs = shift.actual_hours !== undefined ? shift.actual_hours : shift.work_hours || 8;
      myTotalHours += hrs;
      myShiftsList.push({ day: d, shift, shiftInfo: SHIFT_TYPES[shift.shift_type] });
    } else if (shift?.shift_type) {
      myOffDays++;
    }
  }

  // 個人相關之調班單
  const mySwaps = swapRequests.filter(
    s => s.applicant_id === currentUser.emp_id || s.target_id === currentUser.emp_id
  );

  const isSigned = !!signOffList[currentUser.emp_id];
  const mySignInfo = signOffList[currentUser.emp_id];

  // 國定假日出勤調移同意檢核
  const holidayConsentInfo = checkEmployeeHolidayConsent({
    empId: currentUser.emp_id,
    yearMonth,
    scheduleMap,
    consentsMap: holidayConsents
  });

  return (
    <div className="space-y-6 mb-8">
      {/* 歡迎橫幅 */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-2xl shadow-inner">
              {currentUser.name[0]}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black">{currentUser.name} 同仁，歡迎回來！</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-xs">
                  工號: {currentUser.emp_id}
                </span>
                {currentUser.is_admin && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-black shadow-xs">
                    ★ 系統管理員
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-100 mt-1">
                業務角色: <span className="font-bold">{currentUser.role === 'Manager' ? '營運高管' : currentUser.role === 'Leader' ? '站點組長' : currentUser.role === 'PT' ? '計時同仁' : '正職同仁'}</span>
                {' · '}主屬站點: <span className="font-bold">{stationMap[currentUser.primary_station] || currentUser.primary_station}</span>
                {currentUser.can_solo && ' (具備獨立顧站 solo 資格)'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateTab && onNavigateTab('SWAPS')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-purple-500/30 hover:bg-purple-500/50 border border-purple-300/40 text-white font-bold text-xs backdrop-blur-xs transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-purple-200" />
              <span>🔄 申請個人自調挪休</span>
            </button>

            <button
              onClick={() => onNavigateTab && onNavigateTab('SWAPS')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 text-white font-bold text-xs backdrop-blur-xs transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <User className="w-3.5 h-3.5 text-white" />
              <span>👥 與同事對調班表</span>
            </button>

            <button
              onClick={onExportMyIcs}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white text-indigo-700 font-extrabold text-xs shadow-md hover:bg-indigo-50 transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>手機日曆 (.ics)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 國定假日調移出勤同意簽認卡片 (服務業免雙薪法律閉環) */}
      {holidayConsentInfo.required && (
        <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
          holidayConsentInfo.pendingCount === 0
            ? 'bg-emerald-50/80 border-emerald-300'
            : 'bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border-rose-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                holidayConsentInfo.pendingCount === 0 ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {holidayConsentInfo.pendingCount === 0 ? <CheckCircle2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    holidayConsentInfo.pendingCount === 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900 animate-pulse'
                  }`}>
                    {holidayConsentInfo.pendingCount === 0 ? '國假調移同意已簽認' : '重要勞基法簽署：待同意'}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    {yearMonth} 國定假日出勤調移同意書（依法免計雙薪協議）
                  </h3>
                </div>
                <div className="text-xs text-slate-600 mt-1.5 leading-relaxed space-y-1">
                  {holidayConsentInfo.holidays.map(h => (
                    <div key={h.date} className="p-2.5 rounded-xl bg-white/80 border border-slate-200/80">
                      <p>
                        依《勞動基準法》第 37、39 條及勞雇雙方約定，本月份適逢法定國定假日【<strong className="text-rose-700">{h.name} ({h.date})</strong>】，排定出勤【<strong className="text-indigo-700">{h.shiftCode} 班</strong>】。
                        經雙方事前協商合意，該國定假日調移至【<strong className="text-emerald-700">{yearMonth}-{h.suggestedOffDay < 10 ? '0' + h.suggestedOffDay : h.suggestedOffDay} (OFF)</strong>】休假。
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        • 同意要旨：本人同意於原國定假日依班表出勤，並配合調移休假，出勤日按正常工時給付工資（免另計加倍工資/雙薪）。
                        {h.isConsented && (
                          <span className="block text-emerald-700 font-bold mt-0.5">
                            ✓ 電子簽名完成時間: {h.consentData?.signed_at} (雜湊防偽驗證通過)
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center self-end md:self-auto">
              {holidayConsentInfo.pendingCount === 0 ? (
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold bg-white/90 px-3 py-2 rounded-xl border border-emerald-300">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>已同意調移 (免雙薪)</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (onSignHolidayConsent) {
                      holidayConsentInfo.holidays.forEach(h => {
                        if (!h.isConsented) {
                          onSignHolidayConsent(h.consentKey, {
                            emp_id: currentUser.emp_id,
                            emp_name: currentUser.name,
                            holiday_name: h.name,
                            holiday_date: h.date,
                            shift_code: h.shiftCode,
                            transferred_off_date: `${yearMonth}-${h.suggestedOffDay < 10 ? '0' + h.suggestedOffDay : h.suggestedOffDay}`,
                            signed_at: new Date().toLocaleString('zh-TW', { hour12: false })
                          });
                        }
                      });
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md shadow-rose-600/30 transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>本人已審閱並同意國假調移</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 月底實勤雙確認定稿卡片 (需求 #004 閉環機制) */}
      {isSettlementPublished && (
        <div className={`rounded-2xl border p-5 shadow-sm transition-all ${
          isSigned 
            ? 'bg-emerald-50/80 border-emerald-300' 
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3.5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                isSigned ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
              }`}>
                {isSigned ? <CheckCircle2 className="w-6 h-6" /> : <FileCheck2 className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-black ${
                    isSigned ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {isSigned ? '雙確認已完成' : '考勤月底結算：待簽認'}
                  </span>
                  <h3 className="text-sm font-black text-slate-900">
                    {yearMonth} 月底實勤定稿班表二次覆核確認
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {isSigned ? (
                    <>您已於 <strong className="text-emerald-800">{mySignInfo?.signed_at}</strong> 完成實勤定稿簽認。本月核定出勤 <strong>{myWorkDays} 天</strong>（實勤約 <strong>{myTotalHours} 小時</strong>），出勤狀態已結案歸檔。</>
                  ) : (
                    <>主管已正式發布本月實勤定稿班表！經線上調動與現場實勤覆核後，您的實際出勤為 <strong className="text-indigo-700">{myWorkDays} 天</strong>、休假 <strong className="text-emerald-700">{myOffDays} 天</strong>、工時約 <strong className="text-indigo-700">{myTotalHours} 小時</strong>。請核對下方日曆無誤後，進行電子簽署完成閉環流程。</>
                  )}
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center self-end md:self-auto">
              {isSigned ? (
                <div className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>已完成電子簽署</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSignOff && onSignOff(currentUser.emp_id)}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs font-black shadow-md shadow-amber-200 active:scale-95 transition-all cursor-pointer"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>確認出勤無誤 · 電子簽認</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 個人指標卡片列 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-bold mb-1">本月預定出勤</div>
          <div className="text-2xl font-black text-indigo-600">
            {myWorkDays} <span className="text-xs font-normal text-slate-500">天</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">累積工時約 {myTotalHours} 小時</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs text-slate-500 font-bold mb-1">本月休假天數</div>
          <div className="text-2xl font-black text-emerald-600">
            {myOffDays} <span className="text-xs font-normal text-slate-500">天</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">符合法定 10 天標準</div>
        </div>

        {currentUser.role !== 'PT' ? (
          <>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative group">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-500 font-bold">週年制法定特休</div>
                <button
                  type="button"
                  onClick={() => setIsPassbookOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>明細存摺</span>
                </button>
              </div>
              <div className="text-2xl font-black text-amber-600">
                {balance.annualLeaveDays} <span className="text-xs font-normal text-slate-500">天整</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">到職週年前有效 · 純天數管理</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative group">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-500 font-bold">可用彈性補休</div>
                <button
                  type="button"
                  onClick={() => setIsPassbookOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>明細存摺</span>
                </button>
              </div>
              <div className="text-2xl font-black text-purple-600">
                {balance.compTimeHours} <span className="text-xs font-normal text-slate-500">小時</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">12/31 歸零結算 · 純時數管理</div>
            </div>
          </>
        ) : (
          <div className="col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-bold mb-1">PT 時薪工時存摺</div>
              <div className="text-2xl font-black text-amber-600">{myTotalHours} 小時</div>
              <div className="text-[11px] text-slate-400 mt-0.5">發放當月時薪對帳基準</div>
            </div>
            <button
              onClick={() => onNavigateTab('LEAVE_PORTAL')}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold cursor-pointer"
            >
              填報意向日曆 →
            </button>
          </div>
        )}
      </div>

      {/* 我的當月值勤日曆清單 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">我在此月份 ({yearMonth}) 的出勤班別</h3>
          </div>
          <span className="text-xs text-slate-400">出勤前 1 小時手機日曆自動提醒</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const shift = mySchedule[day];
            const isOff = !shift || shift.shift_type === 'OFF' || shift.shift_type === 'TERM_OFF';
            const shiftInfo = SHIFT_TYPES[shift?.shift_type];
            const dateObj = new Date(2026, 8, day);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

            return (
              <div
                key={day}
                className={`p-2.5 rounded-xl border text-center flex flex-col justify-between min-h-[75px] ${
                  isOff 
                    ? 'bg-rose-50/50 border-rose-200 text-rose-700' 
                    : shiftInfo 
                    ? `${shiftInfo.color} border shadow-2xs` 
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className={isWeekend ? 'text-rose-600' : 'text-slate-600'}>{day}日</span>
                  <span className="text-[9px] opacity-75">{isOff ? '休' : shift?.shift_type}</span>
                </div>

                <div className="my-1 font-black text-xs">
                  {isOff ? '例休' : shiftInfo?.name || shift?.shift_type}
                </div>

                <div className="text-[9px] truncate opacity-90">
                  {isOff ? '0h' : stationMap[shift?.station_id] || shift?.station_id}
                </div>

                {shift?.is_labor_violation_override && (
                  <div className="mt-1">
                    <span className="px-1 py-0.5 rounded bg-rose-600 text-white font-black text-[8px] block shadow-2xs">
                      ⚠️ 特准實勤 {shift.actual_hours}h
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 我的調班申請單追蹤 */}
      {mySwaps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-slate-100">
            <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">我的調班申請進度</h3>
          </div>

          <div className="space-y-2">
            {mySwaps.map(req => {
              const isSelf = req.type === 'SELF_RESCHEDULE';
              return (
                <div key={req.swap_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className={`font-bold ${isSelf ? 'text-purple-900' : 'text-slate-800'}`}>
                      {isSelf 
                        ? `【🔄 個人自調挪休】9/${req.applicant_day} 改休 ⇄ 9/${req.target_day} 改到班 (${req.target_shift}班)`
                        : `【👥 雙人對調】與 ${req.target_name} 換班 (9/${req.applicant_day} ⇄ 9/${req.target_day})`
                      }
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">{req.reason}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                    req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {req.status === 'APPROVED' ? '✓ 已生效' : '二階審核中'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 個人假勤存摺明細對帳彈窗 */}
      {isPassbookOpen && (
        <LeavePassbookModal
          currentUser={currentUser}
          balance={balance}
          transactions={passbookTransactions}
          onClose={() => setIsPassbookOpen(false)}
        />
      )}
    </div>
  );
}
