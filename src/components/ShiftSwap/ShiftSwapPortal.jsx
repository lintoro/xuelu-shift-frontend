import React, { useState, useMemo } from 'react';
import { 
  ArrowLeftRight, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Clock, 
  Send, 
  UserCheck, 
  Check, 
  X,
  FileCheck,
  User,
  Calendar,
  ShieldAlert,
  Sparkles,
  Lock
} from 'lucide-react';
import { precheckSwapCompliance } from '../../data/swapStore.js';
import { SHIFT_TYPES, isWorkingShift, isOffShift } from '../../types/scheduler.js';
import { canEmployeeSoloAtStation } from '../../data/mockMasterData.js';

export default function ShiftSwapPortal({
  employees,
  stations,
  rules,
  scheduleMap,
  swapRequests,
  onAddSwapRequest,
  onFirstReview,
  onFinalApprove,
  leaveApplications = [],
  onFirstReviewLeave,
  onFinalApproveLeave,
  currentEmpId,
  currentUser,
  shiftTypes = SHIFT_TYPES
}) {
  const currentEmp = currentUser || employees.find(e => e.emp_id === currentEmpId) || employees[0];
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // 審核權限判定：組長初審 (Leader/Manager/Admin)、高管終審 (Manager/Admin)；一般 Staff / PT 僅有填報權，無審核核准權
  const isManager = currentEmp?.role === 'Manager';
  const isAdmin = !!currentEmp?.is_admin;
  const isLeader = currentEmp?.role === 'Leader';
  const canFirstReview = isLeader || isManager || isAdmin;
  const canFinalApprove = isManager || isAdmin;

  // 核決進度中心分頁：SWAPS (調班) 或 LEAVES (事前請假)
  const [reviewTab, setReviewTab] = useState('SWAPS');

  // 申請模式：SWAP (雙人對調) 或 SELF_RESCHEDULE (個人自調挪休)
  const [swapType, setSwapType] = useState('SWAP');


  // 表單狀態
  const [targetEmpId, setTargetEmpId] = useState(
    employees.find(e => e.emp_id !== currentEmp.emp_id && !e.is_self_scheduled)?.emp_id || ''
  );
  const [applicantDay, setApplicantDay] = useState(10);
  const [targetDay, setTargetDay] = useState(14);
  const [targetShiftCode, setTargetShiftCode] = useState('B'); // 個人挪休轉上班之班別
  const [reason, setReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 取得申請人當月上班日與休假日清單
  const myWorkDays = useMemo(() => {
    const days = [];
    for (let d = 1; d <= 30; d++) {
      const s = scheduleMap[currentEmp?.emp_id]?.[d];
      if (s && s.shift_type && isWorkingShift(s.shift_type)) {
        days.push({ day: d, shift: s.shift_type, stationId: s.station_id });
      }
    }
    return days;
  }, [scheduleMap, currentEmp?.emp_id]);

  const myOffDays = useMemo(() => {
    const days = [];
    for (let d = 1; d <= 30; d++) {
      const s = scheduleMap[currentEmp?.emp_id]?.[d];
      if (!s || isOffShift(s.shift_type)) {
        days.push(d);
      }
    }
    return days;
  }, [scheduleMap, currentEmp?.emp_id]);

  // 取得當前班別
  const applicantCurrentShift = scheduleMap[currentEmp.emp_id]?.[applicantDay];
  const targetCurrentShift = swapType === 'SWAP' ? scheduleMap[targetEmpId]?.[targetDay] : null;

  // 即時執行換班/自調合規預檢 (Safety Pre-check)
  const precheckResult = useMemo(() => {
    return precheckSwapCompliance({
      scheduleMap,
      applicantId: currentEmp.emp_id,
      targetId: swapType === 'SWAP' ? targetEmpId : currentEmp.emp_id,
      applicantDay,
      targetDay,
      type: swapType,
      targetShiftCode,
      employees,
      stations,
      rules
    });
  }, [scheduleMap, currentEmp.emp_id, targetEmpId, applicantDay, targetDay, swapType, targetShiftCode, employees, stations, rules]);

  // 送出申請
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!precheckResult.isSafe) {
      setFeedbackMsg('換班/自調預檢未通過，系統已依勞基法與站點門檻啟動剛性阻擋！');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    const isManagerApplicant = currentEmp.role === 'Manager';
    const initStatus = isManagerApplicant ? 'PENDING_ADMIN_VERIFY' : 'PENDING_FIRST_REVIEW';

    if (swapType === 'SELF_RESCHEDULE') {
      const newSwap = {
        swap_id: `SWAP_${Date.now()}`,
        applicant_id: currentEmp.emp_id,
        applicant_name: currentEmp.name,
        applicant_day: applicantDay,
        applicant_shift: applicantCurrentShift?.shift_type || 'B',
        target_id: currentEmp.emp_id,
        target_name: currentEmp.name,
        target_day: targetDay,
        target_shift: targetShiftCode,
        type: 'SELF_RESCHEDULE',
        reason: reason || '個人行程調整，申請自己休假與上班互調挪休',
        created_at: new Date().toISOString(),
        status: initStatus,
        is_manager_self_declared: isManagerApplicant,
        first_review: isManagerApplicant ? {
          reviewer_id: 'SYSTEM',
          reviewer_name: '免初審 (最高主管自主業務裁定)',
          status: 'APPROVED',
          notes: '最高主管親自申報，業務實質裁定'
        } : {
          reviewer_id: currentEmp.primary_station,
          reviewer_name: `${stationMap[currentEmp.primary_station] || '站點'}組長`,
          status: 'PENDING',
          notes: ''
        },
        final_review: isManagerApplicant ? {
          reviewer_id: 'ADMIN',
          reviewer_name: '待系統管理員 (Admin) 行政合規備查',
          status: 'PENDING',
          notes: ''
        } : {
          reviewer_id: 'B111155',
          reviewer_name: '陳鵬宇 (營運主管)',
          status: 'PENDING',
          notes: ''
        }
      };

      onAddSwapRequest(newSwap);
      setReason('');
      if (isManagerApplicant) {
        setFeedbackMsg(`已成功發起【最高主管自主申報】自調挪休，已送交系統管理員 (Admin) 進行行政合規備查歸檔！`);
      } else {
        setFeedbackMsg(`已成功發起【個人自調挪休】申請（9/${applicantDay} 改休 ⇄ 9/${targetDay} 改上班），已送交組長初審！`);
      }
      setTimeout(() => setFeedbackMsg(''), 5000);
      return;
    }

    // 雙人對調
    const targetEmp = employees.find(e => e.emp_id === targetEmpId);
    const isSpecial = !!precheckResult.hasSpecialWarning;
    const newSwap = {
      swap_id: `SWAP_${Date.now()}`,
      applicant_id: currentEmp.emp_id,
      applicant_name: currentEmp.name,
      applicant_day: applicantDay,
      applicant_shift: applicantCurrentShift?.shift_type || 'OFF',
      target_id: targetEmpId,
      target_name: targetEmp?.name || targetEmpId,
      target_day: targetDay,
      target_shift: targetCurrentShift?.shift_type || 'OFF',
      type: 'SWAP',
      reason: reason || '個人行程調整申請對調',
      created_at: new Date().toISOString(),
      status: initStatus,
      is_manager_self_declared: isManagerApplicant,
      is_special_swap: isSpecial,
      special_warnings: precheckResult.specialWarningList || [],
      first_review: isManagerApplicant ? {
        reviewer_id: 'SYSTEM',
        reviewer_name: '免初審 (最高主管自主業務裁定)',
        status: 'APPROVED',
        notes: '最高主管親自申報，業務實質裁定'
      } : {
        reviewer_id: currentEmp.primary_station,
        reviewer_name: `${stationMap[currentEmp.primary_station] || '站點'}組長`,
        status: 'PENDING',
        notes: ''
      },
      final_review: isManagerApplicant ? {
        reviewer_id: 'ADMIN',
        reviewer_name: '待系統管理員 (Admin) 行政合規備查',
        status: 'PENDING',
        notes: ''
      } : {
        reviewer_id: 'B111155',
        reviewer_name: '陳鵬宇 (營運主管)',
        status: 'PENDING',
        notes: ''
      }
    };

    onAddSwapRequest(newSwap);
    setReason('');
    const specialNote = isSpecial ? '【⚠️ 跨組/非獨立特例調班】' : '';
    if (isManagerApplicant) {
      setFeedbackMsg(`已成功發起【最高主管自主申報】${specialNote}雙人對調，已送交系統管理員 (Admin) 進行行政合規備查歸檔！`);
    } else {
      setFeedbackMsg(`已成功發起${specialNote}與 ${targetEmp?.name} 的雙人對調申請，已進入第一階初審管線！`);
    }
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 區塊 1: 線上發起調班換班/個人自調申請單 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                線上調班申請與個人挪休門戶 (Shift Swap & Reschedule)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              核心決策 11 & 需求 #001：雙人對調 / 個人自調挪休 · 勞基法 7 休 1 剛性預檢 · 二階安全核決
            </p>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-medium">
            申請人: <span className="font-bold text-slate-900">{currentEmp.name}</span> ({currentEmp.emp_id})
          </div>
        </div>

        {/* 模式切換按鈕 */}
        <div className="flex space-x-2 mb-4">
          <button
            type="button"
            onClick={() => setSwapType('SWAP')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              swapType === 'SWAP'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            雙人班表對調 (Swap with Colleague)
          </button>
          <button
            type="button"
            onClick={() => {
              setSwapType('SELF_RESCHEDULE');
              if (myWorkDays.length > 0) setApplicantDay(myWorkDays[0].day);
              if (myOffDays.length > 0) setTargetDay(myOffDays[0]);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              swapType === 'SELF_RESCHEDULE'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            個人自調挪休 (Self-Reschedule 我的休假/上班調整)
          </button>
        </div>

        {/* 提示訊息 */}
        {feedbackMsg && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitRequest}>
          {swapType === 'SWAP' ? (
            /* 模式 A：雙人對調表單 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 申請人 (我) 方時段 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  【我方出勤】我的原定班別
                </span>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">選擇我方日期</label>
                    <select
                      value={applicantDay}
                      onChange={(e) => setApplicantDay(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold cursor-pointer"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>9 月 {d} 日</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">當前原班別</label>
                    <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-700">
                      {applicantCurrentShift?.shift_type || 'OFF'} (
                      {stationMap[applicantCurrentShift?.station_id] || '休假'})
                    </div>
                  </div>
                </div>
              </div>

              {/* 對調同仁方時段 */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  【對調對象】欲更換之同仁與日期
                </span>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">選擇對調同仁</label>
                    <select
                      value={targetEmpId}
                      onChange={(e) => setTargetEmpId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold cursor-pointer"
                    >
                      {employees.filter(e => e.emp_id !== currentEmp.emp_id && !e.is_self_scheduled).map(e => (
                        <option key={e.emp_id} value={e.emp_id}>{e.name} ({stationMap[e.primary_station] || e.primary_station})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">對方日期</label>
                    <select
                      value={targetDay}
                      onChange={(e) => setTargetDay(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-bold cursor-pointer"
                    >
                      {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>9 月 {d} 日</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500">
                  對方當前班別: <span className="font-bold text-indigo-700">
                    {targetCurrentShift?.shift_type || 'OFF'} ({stationMap[targetCurrentShift?.station_id] || '休假'})
                  </span>
                </div>
                {targetCurrentShift?.station_id && targetCurrentShift?.shift_type !== 'OFF' && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      我對該站支援資格：
                    </span>
                    {(currentEmp.primary_station === targetCurrentShift.station_id || currentEmp.supported_stations?.includes(targetCurrentShift.station_id)) ? (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                        ✓ 具備常規支援資格
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>⚠️ 未具備常規支援 (需二階特准)</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 模式 B：個人自調挪休表單 */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* 原出勤日 (轉為休假) */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-950 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>【原出勤日】選擇欲轉為休假的日子</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">原出勤日期</label>
                    <select
                      value={applicantDay}
                      onChange={(e) => setApplicantDay(Number(e.target.value))}
                      className="w-full bg-white border border-purple-300 rounded-lg p-2 text-xs font-bold cursor-pointer text-slate-800"
                    >
                      {myWorkDays.map(item => (
                        <option key={item.day} value={item.day}>
                          9月{item.day}日 ({item.shift}班)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">調整後狀態</label>
                    <div className="p-2 bg-purple-100 border border-purple-200 rounded-lg text-xs font-bold text-purple-800">
                      轉為例假/休息 (OFF)
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-purple-700">
                  此日期原本安排有排班勤務，送審核准後將自動釋放為休假日。
                </p>
              </div>

              {/* 原休假日 (轉為上班) */}
              <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950 mb-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  <span>【原休假日】選擇挪調出勤上班的日子</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">原休假日期</label>
                    <select
                      value={targetDay}
                      onChange={(e) => setTargetDay(Number(e.target.value))}
                      className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs font-bold cursor-pointer text-slate-800"
                    >
                      {myOffDays.map(d => (
                        <option key={d} value={d}>
                          9月{d}日 (原為 OFF)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">預計上班班別</label>
                    <select
                      value={targetShiftCode}
                      onChange={(e) => setTargetShiftCode(e.target.value)}
                      className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs font-bold cursor-pointer text-indigo-700"
                    >
                      {Object.values(shiftTypes || SHIFT_TYPES)
                        .filter(s => isWorkingShift(s.code))
                        .map(s => (
                          <option key={s.code} value={s.code}>
                            {s.code}班 ({s.name} {s.startTime}-{s.endTime})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-700">
                  此日原為個人例休，送審核准後將自動轉為出勤勤務，總休假天數維持不變。
                </p>
              </div>
            </div>
          )}

          {/* 事由與即時安全鎖預檢指示 (快捷下拉選單 + 預設載入，非剛性必填) */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {swapType === 'SELF_RESCHEDULE' ? '個人挪休原因 (可由下拉快速帶入或手動輸入)' : '調班事由說明 (可由下拉快速帶入或手動輸入)'}
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
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium cursor-pointer"
              >
                {swapType === 'SELF_RESCHEDULE' ? (
                  <>
                    <option value="個人行程自調挪休">🗓️ 個人行程自調挪休 (預設)</option>
                    <option value="家庭臨時照護需求">🏠 家庭臨時照護需求</option>
                    <option value="配合站點人流挪休">👥 配合站點人流挪休</option>
                    <option value="進修研習課程改期">📚 進修研習課程改期</option>
                    <option value="CUSTOM">✏️ 其他（手動輸入事由）</option>
                  </>
                ) : (
                  <>
                    <option value="個人行程協商">🤝 個人行程協商 (預設)</option>
                    <option value="家庭突發狀況調配">🏠 家庭突發狀況調配</option>
                    <option value="同仁互助調班">🔄 同仁互助調班</option>
                    <option value="跨組專長支援調換">⭐ 跨組專長支援調換</option>
                    <option value="CUSTOM">✏️ 其他（手動輸入事由）</option>
                  </>
                )}
              </select>

              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  swapType === 'SELF_RESCHEDULE'
                    ? '若選「其他」或需補充，可在此輸入具體說明...'
                    : '若選「其他」或需補充，可在此輸入具體說明...'
                }
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>


          {/* 安全預檢結果卡片 (支援勞基法剛性阻擋 vs 跨組特例軟性放行) */}
          {!precheckResult.isSafe ? (
            /* 剛性違法阻擋 (如勞基法 7 休 1) */
            <div className="p-3.5 rounded-xl border mb-4 bg-rose-50 border-rose-300 text-rose-900">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>🚨 剛性合規阻擋：調整後將觸犯《勞動基準法》法定紅線，系統已鎖死送出：</span>
              </div>
              {precheckResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-rose-700 pl-6 list-disc font-semibold">
                  {precheckResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : precheckResult.hasSpecialWarning ? (
            /* 軟性特例關卡提醒 (依主管指示增加彈性，不阻擋送單，但加註二階審核) */
            <div className="p-3.5 rounded-xl border mb-4 bg-amber-50/90 border-amber-300 text-amber-950">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>⚠️ 檢測到【跨組/非獨立特例調班】預警（軟性關卡放行，增加現場彈性）：</span>
              </div>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                雖然雙方未全數具備常規支援資格或現場缺乏獨立 Solo 擔當，但依現場營運彈性原則，<strong>系統不剛性阻擋送單</strong>！本申請單將自動標記為<strong>【⚠️ 跨組特例調班】</strong>，提交後需經站點組長 (Leader) 初審確認現場備援，並由營運高管 (Manager) 終審特准後方可生效。
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-900 pl-6 list-disc font-semibold">
                {precheckResult.specialWarningList.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          ) : (
            /* 完全合規通過 */
            <div className="p-3.5 rounded-xl border mb-4 bg-emerald-50/80 border-emerald-300 text-emerald-900">
              <div className="flex items-center space-x-2 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  ✓ 剛性合規安全預檢通過：{swapType === 'SELF_RESCHEDULE' ? '自調挪休' : '換班'}後符合《勞基法》第 36 條 7 休 1 且滿足站點顧站與支援門檻！
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!precheckResult.isSafe}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-xs shadow-sm transition-all ${
                precheckResult.isSafe
                  ? precheckResult.hasSpecialWarning
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white cursor-pointer active:scale-95'
                    : swapType === 'SELF_RESCHEDULE'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {!precheckResult.isSafe 
                  ? '法規違規已鎖定' 
                  : precheckResult.hasSpecialWarning 
                  ? '送出特例調班二階審核申請' 
                  : swapType === 'SELF_RESCHEDULE' 
                  ? '送出個人自調挪休審核單' 
                  : '送出二階審核申請'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* 區塊 2: 二階核決清單 (調班/挪休 vs 同仁事前請假) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">二階核決簽核進度中心</h2>
          </div>

          {/* 核決分頁切換：調班 vs 請假 */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setReviewTab('SWAPS')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                reviewTab === 'SWAPS'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🔄 線上調班/挪休 ({swapRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setReviewTab('LEAVES')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                reviewTab === 'LEAVES'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📝 同仁事前請假 ({leaveApplications.length})
            </button>
          </div>
        </div>

        {/* 分頁 A: 線上調班/挪休清單 */}
        {reviewTab === 'SWAPS' && (
          swapRequests.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              目前無待核決之調班單
            </div>
          ) : (
            <div className="space-y-3">
              {swapRequests.map(req => {
                const isApproved = req.status === 'APPROVED';
                const isRejected = req.status === 'REJECTED';
                const isPendingFirst = req.status === 'PENDING_FIRST_REVIEW';
                const isPendingFinal = req.status === 'PENDING_FINAL_REVIEW';
                const isSelf = req.type === 'SELF_RESCHEDULE';

                return (
                  <div
                    key={req.swap_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApproved
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isRejected
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2">
                        {(() => {
                          const isPendingAdminVerify = req.status === 'PENDING_ADMIN_VERIFY' || (req.is_manager_self_declared && !isApproved && !isRejected);
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              isApproved
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isPendingAdminVerify
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : isPendingFirst
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {isApproved ? '已生效' : isRejected ? '已駁回' : isPendingAdminVerify ? '待Admin備查' : isPendingFirst ? '待組長初審' : '待主管終審'}
                            </span>
                          );
                        })()}

                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isSelf ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {isSelf ? '個人自調挪休' : '雙人班表對調'}
                        </span>

                        {req.is_manager_self_declared && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-50 text-purple-900 border border-purple-300 flex items-center space-x-1 shadow-2xs">
                            <span>👑 最高主管自主申報 (待行政合規備查)</span>
                          </span>
                        )}

                        {req.is_special_swap && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center space-x-1">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>⚠️ 跨組特例 (需組長高管特准)</span>
                          </span>
                        )}

                        <span className="text-xs font-extrabold text-slate-900">
                          {isSelf ? (
                            <span>
                              {req.applicant_name}：9/{req.applicant_day} (原{req.applicant_shift}班改休假) ⇄ 9/{req.target_day} (原休假改出勤{req.target_shift}班)
                            </span>
                          ) : (
                            <span>
                              {req.applicant_name} (9/{req.applicant_day} 原{req.applicant_shift}班) ⇄ {req.target_name} (9/{req.target_day} 原{req.target_shift}班)
                            </span>
                          )}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        申請單號: {req.swap_id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mb-3">
                      <strong>申請原因：</strong>{req.reason || '無說明'}
                    </div>

                    {/* 審核操作按鈕 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-500 text-[11px]">
                        {req.created_at ? `發起時間：${req.created_at.replace('T', ' ').substring(0, 16)}` : ''}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* 初審按鈕 (Leader/Manager) */}
                        {isPendingFirst && canFirstReview && (
                          <>
                            <button
                              type="button"
                              onClick={() => onFirstReview && onFirstReview(req.swap_id, 'REJECTED', '組長退回')}
                              className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                            >
                              駁回
                            </button>
                            <button
                              type="button"
                              onClick={() => onFirstReview && onFirstReview(req.swap_id, 'APPROVED', '組長初審通過')}
                              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-2xs"
                            >
                              初審核准 (呈核高管)
                            </button>
                          </>
                        )}

                        {/* 終審按鈕 (Manager) */}
                        {isPendingFinal && canFinalApprove && (
                          <>
                            <button
                              type="button"
                              onClick={() => onFinalApprove && onFinalApprove(req.swap_id, 'REJECTED', '主管駁回')}
                              className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold"
                            >
                              終審駁回
                            </button>
                            <button
                              type="button"
                              onClick={() => onFinalApprove && onFinalApprove(req.swap_id, 'APPROVED', '主管終審核可')}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs"
                            >
                              終審核准放行 (生效班表)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* 分頁 B: 同仁事前請假單清單 (二重核可制，需求 3) */}
        {reviewTab === 'LEAVES' && (
          leaveApplications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              目前無待審核之事前請假申請單
            </div>
          ) : (
            <div className="space-y-3">
              {leaveApplications.map(app => {
                const isApproved = app.status === 'APPROVED';
                const isRejected = app.status === 'REJECTED';
                const isPendingLeader = app.status === 'PENDING_LEADER';
                const isPendingManager = app.status === 'PENDING_MANAGER';

                const leaveBadge = app.leave_type === 'AL'
                  ? { label: '特休假 (AL)', cls: 'bg-purple-100 text-purple-800' }
                  : app.leave_type === 'CT'
                  ? { label: '補休假 (CT)', cls: 'bg-amber-100 text-amber-800' }
                  : app.leave_type === 'PERSONAL'
                  ? { label: '事假 (扣全薪)', cls: 'bg-rose-100 text-rose-800' }
                  : { label: '病假 (扣半薪)', cls: 'bg-blue-100 text-blue-800' };

                return (
                  <div
                    key={app.app_id}
                    className={`p-4 rounded-xl border transition-all ${
                      isApproved
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : isRejected
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isRejected
                            ? 'bg-rose-100 text-rose-800'
                            : isPendingLeader
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {isApproved ? '已生效' : isRejected ? '已駁回' : isPendingLeader ? '待組長初審' : '待主管終審'}
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${leaveBadge.cls}`}>
                          {leaveBadge.label}
                        </span>

                        <span className="text-xs font-extrabold text-slate-900">
                          {app.emp_name} · 申請於 <strong>{app.date}</strong> 請假 ({app.hours || 8} 小時)
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400">
                        請假單號: {app.app_id}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg mb-2">
                      <strong>請假原因：</strong>{app.reason || '無備註說明'}
                    </div>

                    {app.first_review_notes && (
                      <div className="text-[11px] text-blue-700 bg-blue-50/60 p-2 rounded mb-2">
                        <strong>組長初審意見：</strong>{app.first_review_notes} ({app.first_review_time})
                      </div>
                    )}

                    {/* 請假審核操作按鈕 */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="text-slate-500 text-[11px]">
                        申請時間：{app.created_at || '今日'}
                      </div>

                      <div className="flex items-center space-x-2">
                        {/* 第一階：組長初審 */}
                        {isPendingLeader && canFirstReview && (
                          <>
                            <button
                              type="button"
                              onClick={() => onFirstReviewLeave && onFirstReviewLeave(app.app_id, 'REJECTED', '組長站點人力緊縮駁回')}
                              className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                            >
                              初審退回
                            </button>
                            <button
                              type="button"
                              onClick={() => onFirstReviewLeave && onFirstReviewLeave(app.app_id, 'APPROVED', '站點人力可協調，同意上呈')}
                              className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-2xs cursor-pointer active:scale-95"
                            >
                              組長初審核准 (呈核高管)
                            </button>
                          </>
                        )}

                        {/* 第二階：經理終審 */}
                        {isPendingManager && canFinalApprove && (
                          <>
                            <button
                              type="button"
                              onClick={() => onFinalApproveLeave && onFinalApproveLeave(app.app_id, 'REJECTED', '高管終審駁回')}
                              className="px-2.5 py-1 rounded border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold cursor-pointer"
                            >
                              終審退回
                            </button>
                            <button
                              type="button"
                              onClick={() => onFinalApproveLeave && onFinalApproveLeave(app.app_id, 'APPROVED', '營運高管核可，核發班表並扣存摺')}
                              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-2xs cursor-pointer active:scale-95"
                            >
                              👑 經理終審核准 (寫入班表與存摺)
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

