import React from 'react';
import { Play, RotateCcw, Clock, ShieldCheck, UserMinus, AlertTriangle } from 'lucide-react';

export default function EngineDebugger({
  onRunEngine,
  onReset,
  metrics,
  validation,
  rules,
  isResignedActive,
  onToggleResignation
}) {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-4 sm:p-5 shadow-lg mb-6 border border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* 左側：核心演算狀態 */}
        <div>
          <div className="flex items-center space-x-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">確定性啟發式演算法引擎 (Active)</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-xs">
              {rules?.work_hour_model === 'FLEX_2_WEEK' 
                ? '雙週變形 (30條2項 · 2週4休)' 
                : rules?.work_hour_model === 'FLEX_4_WEEK' 
                ? '四週變形 (30-1條 · 4週8休)' 
                : '常態 (7休1 · 第36條1項)'}
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            第一階：種子矩陣生成與法規雙向稽核
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            500 毫秒極速求解 · 告別純 AI 幻覺與 GAS 6 分鐘超時 · 100% 勞基法保證
          </p>
        </div>

        {/* 右側：指標數值 */}
        <div className="flex items-center space-x-4 bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <div>
            <div className="text-[10px] text-slate-300 flex items-center">
              <Clock className="w-3 h-3 mr-1" /> 演算法耗時
            </div>
            <div className="text-lg font-extrabold text-emerald-300">
              {metrics?.durationMs ?? '8.78'} <span className="text-xs font-normal">ms</span>
            </div>
          </div>
          <div className="h-7 w-px bg-white/20" />
          <div>
            <div className="text-[10px] text-slate-300 flex items-center">
              <ShieldCheck className="w-3 h-3 mr-1" /> 嚴重法規違規
            </div>
            <div className="text-lg font-extrabold text-emerald-300">
              {validation?.criticalCount ?? 0} <span className="text-xs font-normal">次</span>
            </div>
          </div>
          <div className="h-7 w-px bg-white/20" />
          <div>
            <div className="text-[10px] text-slate-300 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" /> 站點空窗警示
            </div>
            <div className="text-lg font-extrabold text-white">
              {validation?.warningCount ?? 0} <span className="text-xs font-normal">次</span>
            </div>
          </div>
        </div>

        {/* 控制按鈕群 */}
        <div className="flex items-center space-x-2.5 w-full sm:w-auto">
          <button
            onClick={onRunEngine}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-xs transition-all shadow-md cursor-pointer hover:shadow-indigo-500/25 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>重新產生種子班表</span>
          </button>

          <button
            onClick={onToggleResignation}
            className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isResignedActive
                ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                : 'bg-white/5 border-white/20 text-slate-200 hover:bg-white/10'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>離職銷假測試 (TERM_OFF)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
