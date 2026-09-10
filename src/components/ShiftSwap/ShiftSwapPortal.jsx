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
  Calendar
} from 'lucide-react';
import { precheckSwapCompliance } from '../../data/swapStore.js';
import { SHIFT_TYPES, isWorkingShift } from '../../types/scheduler.js';

export default function ShiftSwapPortal({
  employees,
  stations,
  rules,
  scheduleMap,
  swapRequests,
  onAddSwapRequest,
  onFirstReview,
  onFinalApprove,
  currentEmpId,
  shiftTypes = SHIFT_TYPES
}) {
  const currentEmp = employees.find(e => e.emp_id === currentEmpId) || employees[0];
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

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
      if (s && s.shift_type && s.shift_type !== 'OFF' && s.shift_type !== 'TERM_OFF') {
        days.push({ day: d, shift: s.shift_type, stationId: s.station_id });
      }
    }
    return days;
  }, [scheduleMap, currentEmp?.emp_id]);

  const myOffDays = useMemo(() => {
    const days = [];
    for (let d = 1; d <= 30; d++) {
      const s = scheduleMap[currentEmp?.emp_id]?.[d];
      if (!s || s.shift_type === 'OFF') {
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
        status: 'PENDING_FIRST_REVIEW',
        first_review: {
          reviewer_id: currentEmp.primary_station,
          reviewer_name: `${stationMap[currentEmp.primary_station] || '站點'}組長`,
          status: 'PENDING',
          notes: ''
        },
        final_review: {
          reviewer_id: 'B111014',
          reviewer_name: '林慶忠 (營運主管)',
          status: 'PENDING',
          notes: ''
        }
      };

      onAddSwapRequest(newSwap);
      setReason('');
      setFeedbackMsg(`已成功發起【個人自調挪休】申請（9/${applicantDay} 改休 ⇄ 9/${targetDay} 改上班），已送交組長初審！`);
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    // 雙人對調
    const targetEmp = employees.find(e => e.emp_id === targetEmpId);
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
      status: 'PENDING_FIRST_REVIEW',
      first_review: {
        reviewer_id: currentEmp.primary_station,
        reviewer_name: `${stationMap[currentEmp.primary_station] || '站點'}組長`,
        status: 'PENDING',
        notes: ''
      },
      final_review: {
        reviewer_id: 'B111014',
        reviewer_name: '林慶忠 (營運主管)',
        status: 'PENDING',
        notes: ''
      }
    };

    onAddSwapRequest(newSwap);
    setReason('');
    setFeedbackMsg(`已成功發起與 ${targetEmp?.name} 的雙人對調申請，已進入第一階初審管線！`);
    setTimeout(() => setFeedbackMsg(''), 4000);
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

          {/* 事由與即時安全鎖預檢指示 */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {swapType === 'SELF_RESCHEDULE' ? '個人挪休原因 (必填)' : '雙人對調事由 (必填)'}
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                swapType === 'SELF_RESCHEDULE'
                  ? '請填寫挪休事由，如：家庭臨時照顧需求，申請將 9/10 出勤改至 9/14 到班...'
                  : '請填寫調班原因，如：參加外部培訓、個人行程調配...'
              }
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* 安全預檢結果卡片 */}
          <div className={`p-3.5 rounded-xl border mb-4 ${
            precheckResult.isSafe 
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900' 
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div className="flex items-center space-x-2 font-bold text-xs">
              {precheckResult.isSafe ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    剛性合規安全預檢通過：{swapType === 'SELF_RESCHEDULE' ? '自調挪休' : '換班'}後符合《勞基法》第 36 條 7 休 1 (連勤 $\le 6$ 天) 且滿足站點顧站門檻！
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>剛性合規阻擋：調整後將觸犯以下法規或邏輯限制，系統已鎖死送出：</span>
                </>
              )}
            </div>

            {!precheckResult.isSafe && precheckResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-rose-700 pl-6 list-disc">
                {precheckResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}

            {precheckResult.warnings?.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-700 pl-6 list-disc">
                {precheckResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!precheckResult.isSafe}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-bold text-xs shadow-sm transition-all ${
                precheckResult.isSafe
                  ? swapType === 'SELF_RESCHEDULE'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white cursor-pointer active:scale-95'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {swapType === 'SELF_RESCHEDULE' ? '送出個人自調挪休審核單' : '送出二階審核申請'}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* 區塊 2: 二階核決清單 (初審 / 終審) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">二階核決簽核進度中心</h2>
          <span className="text-xs text-slate-500">
            第一階：組長初審 (First Review) → 第二階：主管終審 (Final Approval)
          </span>
        </div>

        {swapRequests.length === 0 ? (
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
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800'
                          : isPendingFirst
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {isApproved ? '已生效' : isRejected ? '已駁回' : isPendingFirst ? '待組長初審' : '待主管終審'}
                      </span>

                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        isSelf ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {isSelf ? '個人自調挪休' : '雙人班表對調'}
                      </span>

                      <span className="text-xs font-extrabold text-slate-900">
                        {isSelf ? (
                          <span>
                            {req.applicant_name}：9/{req.applicant_day} (原{req.applicant_shift}班改休假) ⇄ 9/{req.target_day} (原休假改出勤{req.target_shift}班)
                          </span>
                        ) : (
                          <span>
                            {req.applicant_name} (9/{req.applicant_day} {req.applicant_shift}班) ⇄ {req.target_name} (9/{req.target_day} {req.target_shift}班)
                          </span>
                        )}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      申請時間: {new Date(req.created_at).toLocaleString('zh-TW')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    事由: {req.reason}
                  </div>

                  {/* 二階管線進度條與審核按鈕 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center space-x-4">
                      {/* 初審標籤 */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">初審 (站點組長):</span>
                        <span className={`font-bold ${
                          req.first_review.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {req.first_review.status === 'APPROVED' ? '✓ 通過' : '審核中'}
                        </span>
                      </div>

                      <span>→</span>

                      {/* 終審標籤 */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">終審 (營運高管):</span>
                        <span className={`font-bold ${
                          req.final_review.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {req.final_review.status === 'APPROVED' ? '✓ 核准覆寫' : '待終審'}
                        </span>
                      </div>
                    </div>

                    {/* 審核操作按鈕 */}
                    <div className="flex items-center space-x-2">
                      {isPendingFirst && (
                        <button
                          onClick={() => onFirstReview(req.swap_id, true)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>組長初審通過</span>
                        </button>
                      )}

                      {isPendingFinal && (
                        <button
                          onClick={() => onFinalApprove(req.swap_id, true)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>高管終審核准 (即時覆寫班表)</span>
                        </button>
                      )}

                      {(isPendingFirst || isPendingFinal) && (
                        <button
                          onClick={() => isPendingFirst ? onFirstReview(req.swap_id, false) : onFinalApprove(req.swap_id, false)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>駁回</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
