import React, { useState } from 'react';
import { 
  FileCheck2, 
  CheckCircle2, 
  Clock, 
  Download, 
  Send, 
  AlertCircle, 
  AlertTriangle,
  Users, 
  ShieldCheck, 
  Calendar, 
  Sparkles, 
  FileSpreadsheet 
} from 'lucide-react';
import { isWorkingShift } from '../../types/scheduler.js';
import { getTimelineStatus } from '../../engine/schedulingTimelineEngine.js';
import { checkEmployeeHolidayConsent } from '../../data/holidayTransferStore.js';

export default function MonthlySettlementPanel({
  employees,
  stations,
  scheduleMap,
  swapRequests,
  rules,
  isSettlementPublished,
  signOffList = {},
  holidayConsents = {},
  onPublishSettlement,
  onExportSettlementCsv,
  currentSimulatedDate
}) {
  const statusInfo = getTimelineStatus(currentSimulatedDate || '2026-09-10');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const yearMonth = rules.target_year_month || '2026-09';
  const totalDays = rules.days_in_month || 30;
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // 結算統計計算
  const staffSummaries = employees.filter(e => !e.is_self_scheduled).map(emp => {
    const myShifts = scheduleMap[emp.emp_id] || {};
    let actualWorkDays = 0;
    let actualOffDays = 0;
    let totalWorkHours = 0;
    let overtimeDiffHours = 0;
    let compTimeDeductHours = 0;
    let annualLeaveDeductHours = 0;
    let personalLeaveHours = 0;
    let sickLeaveHours = 0;
    const violationList = [];

    for (let d = 1; d <= totalDays; d++) {
      const s = myShifts[d];
      if (s && isWorkingShift(s.shift_type)) {
        actualWorkDays++;
        const hours = s.actual_hours !== undefined ? s.actual_hours : (s.work_hours || 8);
        totalWorkHours += hours;
        if (s.actual_diff_hours) {
          overtimeDiffHours += s.actual_diff_hours;
        }
      } else {
        actualOffDays++;
      }

      // 統計請假折抵明細 (區分扣全薪/扣半薪/全薪存摺)
      if (s && s.actual_diff_hours < 0) {
        const diffAbs = Math.abs(s.actual_diff_hours);
        const dtype = s.actual_deduction_type;
        if (dtype === 'PERSONAL_LEAVE') {
          personalLeaveHours += diffAbs;
        } else if (dtype === 'SICK_LEAVE') {
          sickLeaveHours += diffAbs;
        } else if (dtype === 'ANNUAL_LEAVE') {
          annualLeaveDeductHours += diffAbs;
        } else {
          // COMP_TIME 或預設
          compTimeDeductHours += diffAbs;
        }
      }

      if (s && s.is_labor_violation_override) {
        violationList.push({
          day: d,
          actualHours: s.actual_hours,
          violations: s.labor_violations || [],
          manager: s.override_manager || {}
        });
      }
    }

    // 調班次數
    const mySwapsCount = swapRequests.filter(
      r => r.status === 'APPROVED' && (r.applicant_id === emp.emp_id || r.target_id === emp.emp_id)
    ).length;

    const isSigned = !!signOffList[emp.emp_id];
    const signedAt = signOffList[emp.emp_id]?.signed_at;

    // 國定假日出勤調移同意檢核 (服務業免雙薪合法憑據)
    const holidayConsentInfo = checkEmployeeHolidayConsent({
      empId: emp.emp_id,
      yearMonth,
      scheduleMap,
      consentsMap: holidayConsents
    });

    let holidayConsentStatus = 'NONE'; // NONE, CONSENTED, PENDING
    let holidayConsentLabel = '常態無國假出勤';
    if (holidayConsentInfo.required) {
      if (holidayConsentInfo.pendingCount === 0) {
        holidayConsentStatus = 'CONSENTED';
        holidayConsentLabel = '已簽署同意(免雙薪)';
      } else {
        holidayConsentStatus = 'PENDING';
        holidayConsentLabel = `⚠️ 待簽認(${holidayConsentInfo.pendingCount}節日)`;
      }
    }

    return {
      emp,
      actualWorkDays,
      actualOffDays,
      totalWorkHours,
      overtimeDiffHours,
      compTimeDeductHours,
      annualLeaveDeductHours,
      personalLeaveHours,
      sickLeaveHours,
      mySwapsCount,
      isSigned,
      signedAt,
      violationCount: violationList.length,
      violationList,
      holidayConsentInfo,
      holidayConsentStatus,
      holidayConsentLabel
    };
  });

  const totalEmployeesCount = staffSummaries.length;
  const signedCount = staffSummaries.filter(s => s.isSigned).length;
  const completionRate = totalEmployeesCount > 0 ? Math.round((signedCount / totalEmployeesCount) * 100) : 0;

  // 發布月底出勤確認
  const handlePublish = () => {
    onPublishSettlement();
    setFeedbackMsg(`已成功發布 ${yearMonth} 月底實勤定稿班表確認通知！全員工作台已同步開啟二次到班簽認。`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  // 匯出 CSV 清冊 (含法規合規與主管強制核實加註提醒，以及事假扣全薪/病假扣半薪明細、國定假日調移同意狀態)
  const handleExportCsv = () => {
    let csvContent = '工號,姓名,業務角色,主屬站點,出勤天數,休假天數,實勤總工時,延長加班與差額時數(依法計發加班費或意願換補休),事假折抵(扣全薪),病假與照顧假(扣半薪),補休折抵(全薪),特休折抵(全薪),線上調動次數,國定假日調移同意(服務業免雙薪法律憑據),勞基法合規與主管強制核實加註,月底簽認狀態,簽認時間戳記\n';
    staffSummaries.forEach(s => {
      let violationNote = '法定合規出勤';
      if (s.violationCount > 0) {
        const details = s.violationList.map(v => 
          `[9/${v.day} 實勤${v.actualHours}h超標: 經營運高管 ${v.manager?.name || '陳鵬宇'} 強制核定 (事由: ${v.manager?.emergency_reason || '現場緊急調度'})]`
        ).join('; ');
        violationNote = `⚠️ 存在 ${s.violationCount} 筆主管強制核實超時違規勤務: ${details}`;
      }
      csvContent += `"${s.emp.emp_id}","${s.emp.name}","${s.emp.role}","${stationMap[s.emp.primary_station] || s.emp.primary_station}","${s.actualWorkDays}","${s.actualOffDays}","${s.totalWorkHours}","${s.overtimeDiffHours >= 0 ? '+' : ''}${s.overtimeDiffHours}","${s.personalLeaveHours > 0 ? `${s.personalLeaveHours}h` : '0h'}","${s.sickLeaveHours > 0 ? `${s.sickLeaveHours}h` : '0h'}","${s.compTimeDeductHours > 0 ? `${s.compTimeDeductHours}h` : '0h'}","${s.annualLeaveDeductHours > 0 ? `${s.annualLeaveDeductHours}h` : '0h'}","${s.mySwapsCount}","${s.holidayConsentLabel}","${violationNote}","${s.isSigned ? '已確認' : '待簽認'}","${s.signedAt || '-'}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `學旅營運處_${yearMonth}_考勤月底結算對帳單.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 考勤結算時限階段提醒 (Issue #016) */}
      {statusInfo.currentStage?.id === 'MONTH_END_ACTUAL' && (
        <div className="p-4 rounded-xl border border-cyan-300 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-950 dark:text-cyan-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 animate-pulse" />
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>【階段 7/8 · 當月底出勤確認日】今日完成當月出勤確認與實勤微調覆核</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-200 dark:bg-cyan-900 text-cyan-900 dark:text-cyan-100 font-black">
                  今日截止
                </span>
              </div>
              <p className="text-[11px] text-cyan-800 dark:text-cyan-300 mt-0.5">
                營運高管與站點組長請於今日內完成全體同仁當月出勤實況確認、延長工時核發及 4 大請假折抵。
              </p>
            </div>
          </div>
        </div>
      )}

      {statusInfo.currentStage?.id === 'NEXT_MONTH_SIGNOFF' && (
        <div className="p-4 rounded-xl border border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>【階段 8/8 · 次月 2 日考勤結算簽認截止日】全員完成實勤考勤電子簽認對帳閉環</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-teal-200 dark:bg-teal-900 text-teal-900 dark:text-teal-100 font-black">
                  次月 2 日截止
                </span>
              </div>
              <p className="text-[11px] text-teal-800 dark:text-teal-300 mt-0.5">
                請督促全體同仁於次月 2 日 23:59 前核對全月總工時、事假、病假與補休特休明細並完成線上簽認。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 頂部 Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                考勤月底結算中心與實勤定稿雙確認閉環
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              核心決策 13 & 需求 #004：前月預排確認 + 當月月底二次定稿簽認 · 調動/自調/覆核全紀錄平帳對帳
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>匯出結算清冊 CSV</span>
            </button>

            {!isSettlementPublished ? (
              <button
                onClick={handlePublish}
                className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>發布月底實勤確認通知</span>
              </button>
            ) : (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>實勤定稿已正式發布</span>
              </span>
            )}
          </div>
        </div>

        {feedbackMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
        )}

        {/* 雙確認閉環進度概覽卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block mb-1">閉環第一階段</span>
            <div className="text-sm font-black text-slate-800 flex items-center space-x-1">
              <span className="text-emerald-600">✓ 前月 3 號預排確認</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">次月排班已於月初鎖定發布</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block mb-1">閉環第二階段</span>
            <div className="text-sm font-black text-indigo-700">
              {isSettlementPublished ? '● 月底實勤定稿發布中' : '○ 等候月底最後一天發布'}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">納入調班、自調與現場實勤</p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block mb-1">同仁簽認進度</span>
            <div className="text-xl font-black text-slate-900 font-mono">
              {signedCount} / {totalEmployeesCount} <span className="text-xs text-slate-400 font-normal">人已確認</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" 
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-bold block mb-1">全館總實勤工時</span>
            <div className="text-xl font-black text-purple-700 font-mono">
              {staffSummaries.reduce((sum, s) => sum + s.totalWorkHours, 0)} <span className="text-xs text-slate-400 font-normal">小時</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">正職出勤 + PT 計時到班總和</p>
          </div>
        </div>

        {/* 說明橫幅 */}
        <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>雙確認閉環制度意義</strong>：月初預排班表確保專責與法定休假；月底最後一天依現場實際調動（對調/自調/加班微調）再次發布定稿，由同仁親自電子簽認，杜絕補休與工時認知爭議。
            </span>
          </div>
        </div>
      </div>

      {/* 全員考勤結算與簽認對帳表格 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800">
              全體在勤人員月底實勤結算對帳名冊 ({yearMonth})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            簽核完成率：{completionRate}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="p-2.5 font-bold">工號</th>
                <th className="p-2.5 font-bold">同仁姓名</th>
                <th className="p-2.5 font-bold">角色</th>
                <th className="p-2.5 font-bold">主屬站點</th>
                <th className="p-2.5 font-bold text-center">實到天數</th>
                <th className="p-2.5 font-bold text-center">排休天數</th>
                <th className="p-2.5 font-bold text-right">實勤總工時</th>
                <th className="p-2.5 font-bold text-right" title="正職延長工時認列：依法以計發加班費為法定原則；同仁亦得依自主意願轉入補休存摺">
                  加班/差額時數
                </th>
                <th className="p-2.5 font-bold text-center" title="事假(扣全薪)、病假(扣半薪)、補休或特休沖抵時數">
                  請假扣抵明細
                </th>
                <th className="p-2.5 font-bold text-center">調動次數</th>
                <th className="p-2.5 font-bold text-center">國假調移同意 (免雙薪)</th>
                <th className="p-2.5 font-bold text-center">法規合規與主管加註</th>
                <th className="p-2.5 font-bold text-center">月底簽認狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffSummaries.map(({ emp, actualWorkDays, actualOffDays, totalWorkHours, overtimeDiffHours, compTimeDeductHours, annualLeaveDeductHours, personalLeaveHours, sickLeaveHours, mySwapsCount, isSigned, signedAt, violationCount, violationList, holidayConsentStatus }) => {
                const isPT = emp.role === 'PT';
                return (
                  <tr key={emp.emp_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2.5 font-mono font-bold text-slate-900">{emp.emp_id}</td>
                    <td className="p-2.5 font-bold text-slate-800 flex items-center space-x-1.5">
                      <span>{emp.name}</span>
                      {violationCount > 0 && (
                        <span className="p-0.5 rounded bg-rose-100 text-rose-700" title={`本月含 ${violationCount} 筆高管特准超時違規出勤`}>
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPT ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isPT ? '計時 PT' : '正職同仁'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-600 font-medium">
                      {stationMap[emp.primary_station] || emp.primary_station}
                    </td>
                    <td className="p-2.5 text-center font-mono font-bold text-slate-800">
                      {actualWorkDays} 天
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-600">
                      {actualOffDays} 天
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold text-indigo-700">
                      {totalWorkHours} 小時
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">
                      {isPT ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={overtimeDiffHours > 0 ? 'text-emerald-600' : overtimeDiffHours < 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {overtimeDiffHours > 0 ? `+${overtimeDiffHours}h` : overtimeDiffHours < 0 ? `${overtimeDiffHours}h` : '0h'}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono text-[11px]">
                      {personalLeaveHours > 0 || sickLeaveHours > 0 || compTimeDeductHours > 0 || annualLeaveDeductHours > 0 ? (
                        <div className="flex flex-col space-y-0.5 items-center">
                          {personalLeaveHours > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                              事假 {personalLeaveHours}h (扣全薪)
                            </span>
                          )}
                          {sickLeaveHours > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                              病假 {sickLeaveHours}h (扣半薪)
                            </span>
                          )}
                          {compTimeDeductHours > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              補休 {compTimeDeductHours}h
                            </span>
                          )}
                          {annualLeaveDeductHours > 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                              特休 {annualLeaveDeductHours}h
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center font-mono text-slate-500">
                      {mySwapsCount > 0 ? (
                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-bold">
                          {mySwapsCount} 次
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {holidayConsentStatus === 'CONSENTED' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px]">
                          ✓ 已同意免雙薪
                        </span>
                      ) : holidayConsentStatus === 'PENDING' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px] animate-pulse">
                          ⚠️ 待同意簽認
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[10px]">常態無國假出勤</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {violationCount > 0 ? (
                        <span 
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[10px] cursor-help shadow-2xs"
                          title={violationList.map(v => `9/${v.day} 實勤${v.actualHours}h超標 (核定高管: ${v.manager?.name || '陳鵬宇'} · 事由: ${v.manager?.emergency_reason || '緊急搶修支援'})`).join('\n')}
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>⚠️ 特准超時 ({violationCount}天)</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-medium">
                          ✓ 法定合規
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {isSigned ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold" title={signedAt}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>已簽認</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-medium">
                          待簽認
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
