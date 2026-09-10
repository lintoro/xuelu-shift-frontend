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
  FileCheck
} from 'lucide-react';
import { precheckSwapCompliance } from '../../data/swapStore.js';
import { SHIFT_TYPES } from '../../types/scheduler.js';

export default function ShiftSwapPortal({
  employees,
  stations,
  rules,
  scheduleMap,
  swapRequests,
  onAddSwapRequest,
  onFirstReview,
  onFinalApprove,
  currentEmpId
}) {
  const currentEmp = employees.find(e => e.emp_id === currentEmpId) || employees[0];
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // 申請表單狀態
  const [targetEmpId, setTargetEmpId] = useState(
    employees.find(e => e.emp_id !== currentEmp.emp_id && !e.is_self_scheduled)?.emp_id || ''
  );
  const [applicantDay, setApplicantDay] = useState(10);
  const [targetDay, setTargetDay] = useState(10);
  const [reason, setReason] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // 取得雙方當日當前班別
  const applicantCurrentShift = scheduleMap[currentEmp.emp_id]?.[applicantDay];
  const targetCurrentShift = scheduleMap[targetEmpId]?.[targetDay];

  // 即時執行換班合規預檢 (Safety Pre-check)
  const precheckResult = useMemo(() => {
    if (!targetEmpId) return { isSafe: true, errors: [], warnings: [] };
    return precheckSwapCompliance({
      scheduleMap,
      applicantId: currentEmp.emp_id,
      targetId: targetEmpId,
      applicantDay,
      targetDay,
      employees,
      stations,
      rules
    });
  }, [scheduleMap, currentEmp.emp_id, targetEmpId, applicantDay, targetDay, employees, stations, rules]);

  // 送出申請
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!precheckResult.isSafe) {
      setFeedbackMsg('換班預檢未通過，系統已依勞基法與站點門檻啟動剛性阻擋！');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    const targetEmp = employees.find(e => e.emp_id === targetEmpId);
    const newSwap = {
      swap_id: `SWAP_${Date.now()}`,
      applicant_id: currentEmp.emp_id,
      applicant_name: currentEmp.name,
      applicant_day: applicantDay,
      applicant_shift: applicantCurrentShift?.shift_type || 'OFF',
      target_id: targetEmpId,
      target_name: targetEmp.name,
      target_day: targetDay,
      target_shift: targetCurrentShift?.shift_type || 'OFF',
      type: 'SWAP',
      reason: reason || '個人行程調整申請對調',
      created_at: new Date().toISOString(),
      status: 'PENDING_FIRST_REVIEW',
      first_review: {
        reviewer_id: currentEmp.primary_station,
        reviewer_name: `${stationMap[currentEmp.primary_station] || '站點'}負責人`,
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
    setFeedbackMsg(`已成功發起與 ${targetEmp.name} 的調班申請，已進入第一階初審管線！`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="space-y-6 mb-8">
      {/* 區塊 1: 線上發起調班換班申請單 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">線上調班/代班申請與安全鎖預檢</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              剛性合規安全鎖 · 即時試算連續出勤與站點 solo 資格 · 24 小時前截止防呆
            </p>
          </div>

          <div className="text-xs bg-slate-100 px-3 py-1 rounded-lg text-slate-600 font-medium">
            申請人: <span className="font-bold text-slate-900">{currentEmp.name}</span> ({currentEmp.emp_id})
          </div>
        </div>

        {/* 提示訊息 */}
        {feedbackMsg && (
          <div className="mb-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitRequest}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* 申請人 (我) 方時段 */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                【我方出勤】我的原定班別
              </span>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">選擇日期</label>
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
                      <option key={e.emp_id} value={e.emp_id}>{e.name} ({e.primary_station})</option>
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

          {/* 事由與即時安全鎖預檢指示 */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">調班事由 (必填)</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請填寫調班原因，如：參加外部課程、臨時家庭照顧需求..."
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
                  <span>剛性合規安全預檢通過：對調後雙方均符合 7 休 1 (連勤 $\le 6$ 天)、輪班間隔 $\ge 11$ 小時且滿足站點顧站門檻！</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>剛性合規阻擋：換班後將觸犯以下限制，系統已鎖死送出：</span>
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
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!precheckResult.isSafe}
              className={`flex items-center space-x-2 px-5 py-2 rounded-lg font-bold text-xs shadow-sm transition-all ${
                precheckResult.isSafe
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-75'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>送出二階審核申請</span>
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
            第一階：初審 (First Review) → 第二階：最終審核 (Final Approval)
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
                        {isApproved ? '已生效' : isRejected ? '已駁回' : isPendingFirst ? '待站點初審' : '待主管終審'}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {req.applicant_name} (9/{req.applicant_day} {req.applicant_shift}班) ⇄ {req.target_name} (9/{req.target_day} {req.target_shift}班)
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-400">
                      申請時間: {new Date(req.created_at).toLocaleString('zh-TW')}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                    事由: {req.reason}
                  </div>

                  {/* 二階管線進度條與審核按鈕 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center space-x-4">
                      {/* 初審標籤 */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">初審 (站點覆蓋):</span>
                        <span className={`font-bold ${
                          req.first_review.status === 'APPROVED' ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {req.first_review.status === 'APPROVED' ? '✓ 通過' : '審核中'}
                        </span>
                      </div>

                      <span>→</span>

                      {/* 終審標籤 */}
                      <div className="flex items-center space-x-1.5">
                        <span className="text-slate-500">終審 (主管裁定):</span>
                        <span className={`font-bold ${
                          req.final_review.status === 'APPROVED' ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          {req.final_review.status === 'APPROVED' ? '✓ 核准入庫' : '待仲裁'}
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
                          <span>站點初審通過</span>
                        </button>
                      )}

                      {isPendingFinal && (
                        <button
                          onClick={() => onFinalApprove(req.swap_id, true)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>營運主管終審核准 (即時覆蓋班表)</span>
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
