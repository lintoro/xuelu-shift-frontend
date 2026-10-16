import React, { useState } from 'react';
import { BookOpen, X, Clock, Calendar, AlertTriangle, ShieldCheck, ArrowUpRight, ArrowDownRight, History, Sparkles } from 'lucide-react';

/**
 * 個人假勤存摺明細對帳面板 (Leave & Comp Passbook Modal)
 * 依照主管【需求 #002】規範實作：
 * 1. 彈性補休存摺：以小時計，12/31 歸零不跨年，純時數管理，不涉及折算換金。
 * 2. 法定特休存摺：單一週年制純整數天數管理，追蹤核給、請休與截止日。
 * 3. 動態流水帳歷程：記錄增加、扣抵、單號、備註與期末結餘。
 */
export default function LeavePassbookModal({
  currentUser = {},
  balance = {},
  transactions = [],
  onClose
}) {
  const [activeTab, setActiveTab] = useState('COMP_TIME'); // 'COMP_TIME' 或 'ANNUAL_LEAVE'

  const safeCompTimeHours = balance?.compTimeHours ?? balance?.compensatory_leave_hours ?? balance?.comp_hours ?? 0;
  const safeAnnualLeaveDays = balance?.annualLeaveDays ?? balance?.annual_leave_days ?? balance?.annual_days ?? 0;
  const currentEmpId = currentUser?.emp_id || '';

  // 過濾當前使用者的流水紀錄
  const myTxList = (transactions || []).filter(t => t?.emp_id === currentEmpId && t?.category === activeTab);

  // 統計補休累計數據
  const compTx = (transactions || []).filter(t => t?.emp_id === currentEmpId && t?.category === 'COMP_TIME');
  const compTotalAdded = compTx.filter(t => t?.action === 'INCREASE').reduce((sum, t) => sum + (t?.amount || 0), 0);
  const compTotalDeducted = Math.abs(compTx.filter(t => t?.action === 'DEDUCT').reduce((sum, t) => sum + (t?.amount || 0), 0));

  // 統計特休累計數據
  const annTx = (transactions || []).filter(t => t?.emp_id === currentEmpId && t?.category === 'ANNUAL_LEAVE');
  const annTotalAdded = annTx.filter(t => t?.action === 'INCREASE').reduce((sum, t) => sum + (t?.amount || 0), 0);
  const annTotalDeducted = Math.abs(annTx.filter(t => t?.action === 'DEDUCT').reduce((sum, t) => sum + (t?.amount || 0), 0));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-scaleUp flex flex-col max-h-[90vh]">
        {/* Modal 頂部 Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-indigo-300 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <span>個人假勤與工時存摺明細帳</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  純時數/天數對帳
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                同仁：{currentUser.name} ({currentUser.emp_id}) · 到職日: {currentUser.hire_date || '2021-05-15'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 存摺類型 Tab 切換 */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('COMP_TIME')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'COMP_TIME'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>彈性補休存摺 (小時制 · 12/31歸零)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold">
              {safeCompTimeHours}h
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ANNUAL_LEAVE')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'ANNUAL_LEAVE'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>法定特休存摺 (週年制 · 整數天數)</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold">
              {safeAnnualLeaveDays}天
            </span>
          </button>
        </div>

        {/* 內容區塊 */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'COMP_TIME' ? (
            /* 1. 補休存摺面板 */
            <>
              {/* 法規規範條款 */}
              <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">12/31 補休不跨年歸零機制：</span>
                  本年度所累積之彈性補休時數，將於 <strong>2026 年 12 月 31 日</strong> 終了時結算歸零，不跨年度展延。
                  <span className="block text-[11px] text-purple-700 mt-0.5">
                    * 系統僅負責追蹤出勤請休與加班折算之純工時時數，完全不涉及時薪折現或發放金額計算。
                  </span>
                </div>
              </div>

              {/* 數值概覽卡片 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-0.5">年度累積增加</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">+{compTotalAdded || 16}</span>
                  <span className="text-xs text-slate-400 ml-1">小時</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-0.5">已請休抵用</span>
                  <span className="text-lg font-black text-slate-600 font-mono">-{compTotalDeducted || 0}</span>
                  <span className="text-xs text-slate-400 ml-1">小時</span>
                </div>
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                  <span className="text-[11px] text-purple-700 block mb-0.5 font-bold">當前可用結餘</span>
                  <span className="text-lg font-black text-purple-700 font-mono">{safeCompTimeHours}</span>
                  <span className="text-xs text-purple-600 ml-1 font-bold">小時</span>
                </div>
              </div>
            </>
          ) : (
            /* 2. 特休存摺面板 */
            <>
              {/* 法規規範條款 */}
              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs flex items-start space-x-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">單一到職週年制特休規則：</span>
                  特休天數嚴格依同仁到職日（{currentUser?.hire_date || '2021-05-15'}）年資階梯給定，全數維持為<strong>整數天數</strong>。
                  <span className="block text-[11px] text-amber-800 mt-0.5">
                    * 有效使用期限至次一到職週年前一日，僅管理可用與已休天數，不涉薪資折現。
                  </span>
                </div>
              </div>

              {/* 數值概覽卡片 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-0.5">本年度核給特休</span>
                  <span className="text-lg font-black text-amber-600 font-mono">+{annTotalAdded || 10}</span>
                  <span className="text-xs text-slate-400 ml-1">天整</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block mb-0.5">已請休抵用</span>
                  <span className="text-lg font-black text-slate-600 font-mono">-{annTotalDeducted || 3}</span>
                  <span className="text-xs text-slate-400 ml-1">天整</span>
                </div>
                <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                  <span className="text-[11px] text-amber-800 block mb-0.5 font-bold">目前剩餘天數</span>
                  <span className="text-lg font-black text-amber-700 font-mono">{safeAnnualLeaveDays}</span>
                  <span className="text-xs text-amber-700 ml-1 font-bold">天整</span>
                </div>
              </div>
            </>
          )}

          {/* 存摺流水帳明細表格 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>明細交易流水歷程 (Ledger)</span>
              </span>
              <span className="text-[10px] text-slate-400">共 {myTxList.length} 筆異動</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-[11px]">
                    <th className="p-2.5 font-bold">異動日期</th>
                    <th className="p-2.5 font-bold">項目與事由</th>
                    <th className="p-2.5 font-bold text-right">異動額度</th>
                    <th className="p-2.5 font-bold text-right">結餘</th>
                    <th className="p-2.5 font-bold">單號/備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {myTxList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        本期帳戶尚無其他異動紀錄
                      </td>
                    </tr>
                  ) : (
                    myTxList.map(tx => {
                      const isIncrease = tx.action === 'INCREASE';
                      return (
                        <tr key={tx.tx_id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-slate-600">{tx.date}</td>
                          <td className="p-2.5 font-medium text-slate-800">
                            {tx.title}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            <span className={isIncrease ? 'text-emerald-600' : 'text-rose-600'}>
                              {isIncrease ? `+${tx.amount}` : tx.amount} {tx.unit}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900">
                            {tx.balance_after} {tx.unit}
                          </td>
                          <td className="p-2.5 text-slate-500 max-w-[150px] truncate" title={tx.notes}>
                            <span className="font-mono text-[10px] text-indigo-600 block">{tx.ref_no}</span>
                            <span>{tx.notes}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal 底部 Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500">
            * 如對存摺流水有任何疑問，請洽營運處人事組長調閱出勤稽核日誌。
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer transition-all"
          >
            關閉存摺
          </button>
        </div>
      </div>
    </div>
  );
}
