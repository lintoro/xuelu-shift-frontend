// src/components/Timeline/SchedulingTimelineStepper.jsx
import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  Users, 
  FileCheck, 
  FastForward, 
  RotateCcw,
  HelpCircle
} from 'lucide-react';
import { TIMELINE_STAGES, getTimelineStatus } from '../../engine/schedulingTimelineEngine.js';

export default function SchedulingTimelineStepper({
  currentSimulatedDate,
  onSimulateDateChange,
  currentUser
}) {
  const [showSimulator, setShowSimulator] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const activeDate = currentSimulatedDate || '2026-09-10';
  const statusInfo = getTimelineStatus(activeDate);
  const currentStage = statusInfo.currentStage;
  const currentStep = currentStage?.step || 0;

  // 快速切換模擬日期的預設情境
  const quickDatePresets = [
    { label: '9/10 主管設定', date: '2026-09-10', desc: '調移/休假/指定組長' },
    { label: '9/12 員工劃選', date: '2026-09-12', desc: '正職劃休/PT報班' },
    { label: '9/18 組長初審', date: '2026-09-18', desc: '衝突透視/組長初核' },
    { label: '9/20 高管覆審', date: '2026-09-20', desc: '全場調度/AI調優' },
    { label: '9/24 排定截止', date: '2026-09-24', desc: '全館排定/鎖定發布' },
    { label: '9/25 全員簽回', date: '2026-09-25', desc: '正式班表公告簽回' },
    { label: '9/30 月底確認', date: '2026-09-30', desc: '出勤確認/實勤覆核' },
    { label: '10/02 次月簽認', date: '2026-10-02', desc: '全月考勤電子簽認' }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-6 transition">
      {/* 頂部橫幅：當前階段概況與時光機展開按鈕 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-black">
            <Clock className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                月度排班生命週期
              </span>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                {currentStage?.title || '常態勤務調班期'}
                <span className="text-xs font-normal text-slate-300">({currentStage?.periodText})</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <span>{statusInfo.statusLabel}</span>
              <span className="text-indigo-400">·</span>
              <span className="text-amber-300 font-medium">{statusInfo.deadlineText}</span>
            </p>
          </div>
        </div>

        {/* 右側操作按鈕 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTaskDetail(prev => !prev)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition flex items-center gap-1 cursor-pointer border border-white/10"
            title="查看當前階段任務清單"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>任務說明</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSimulator(prev => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              showSimulator
                ? 'bg-amber-400 text-slate-950 shadow-amber-400/20'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>時光機模擬切換</span>
          </button>
        </div>
      </div>

      {/* 展開之時光機 (Date Travel Simulator) 面板 */}
      {showSimulator && (
        <div className="px-5 py-3.5 bg-amber-500/10 border-b border-amber-500/20 animate-fadeIn text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
              <FastForward className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>時限排程時光機測試器 (主管除錯與驗收專用)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">自訂模擬日期：</span>
              <input
                type="date"
                value={activeDate}
                onChange={(e) => onSimulateDateChange && onSimulateDateChange(e.target.value)}
                className="px-2 py-1 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 font-mono text-xs text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => onSimulateDateChange && onSimulateDateChange('2026-09-10')}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                title="還原至預設 2026-09-10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {quickDatePresets.map(p => {
              const isSelected = activeDate === p.date;
              return (
                <button
                  key={p.date}
                  type="button"
                  onClick={() => onSimulateDateChange && onSimulateDateChange(p.date)}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="text-[11px] truncate font-semibold">{p.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 任務說明抽屜 */}
      {showTaskDetail && currentStage?.keyTasks && (
        <div className="px-5 py-3 bg-indigo-50/50 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 text-xs animate-fadeIn">
          <div className="font-bold text-indigo-950 dark:text-indigo-200 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              【{currentStage.title}】關鍵排班任務重點 (負責角色: {currentStage.roleLabel})
            </span>
            <button
              type="button"
              onClick={() => setShowTaskDetail(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {currentStage.keyTasks.map((task, idx) => (
              <div key={idx} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200/60 dark:border-indigo-800/40 text-slate-700 dark:text-slate-200 text-[11px] flex items-start gap-1.5 shadow-2xs">
                <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{task}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 水平 8 步驟排程時間軸 Stepper */}
      <div className="p-4 overflow-x-auto scrollbar-none">
        <div className="min-w-[760px] flex items-center justify-between relative">
          {/* 背景貫穿線 */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-800 z-0" />

          {TIMELINE_STAGES.map((st, idx) => {
            const isCompleted = currentStep > st.step;
            const isCurrent = currentStep === st.step;
            const isUpcoming = currentStep < st.step;

            return (
              <div key={st.id} className="relative z-10 flex flex-col items-center flex-1 group">
                {/* 節點圓圈 */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition shadow-sm ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 scale-110 animate-pulse'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                  }`}
                  title={`${st.title} (${st.periodText})`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <span>{st.step}</span>
                  )}
                </div>

                {/* 標題與日期說明 */}
                <div className="mt-2 text-center">
                  <div className={`text-xs font-bold whitespace-nowrap ${
                    isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {st.shortTitle}
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap mt-0.5">
                    {st.periodText}
                  </div>
                </div>

                {/* 當前階段指示標籤 */}
                {isCurrent && (
                  <span className="absolute -bottom-5 px-1.5 py-0.2 rounded text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 whitespace-nowrap border border-indigo-200">
                    進行中
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
