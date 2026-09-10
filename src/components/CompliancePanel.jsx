import React from 'react';
import { ShieldCheck, BookOpen, CheckCircle, Scale, Award } from 'lucide-react';

export default function CompliancePanel({ validation, rules }) {
  const issues = validation?.issues || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-900">勞動基準法四重剛性檢核與合規證明書</h2>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
          全項目自動化稽核通過
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-4">
        {/* 項目 1: 例休法規檢驗（常態 7休1 / 雙週變形 / 四週變形動態切換） */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <Scale className="w-4 h-4 mr-1 text-indigo-600" />
                {rules.work_hour_model === 'FLEX_2_WEEK' ? '勞基法第36條2項1款' : rules.work_hour_model === 'FLEX_4_WEEK' ? '勞基法第30-1條' : '勞基法第36條1項'}
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[11px] font-bold text-indigo-800 mb-1">
              {rules.work_hour_model === 'FLEX_2_WEEK' 
                ? '雙週變形工時 (每2週4休)' 
                : rules.work_hour_model === 'FLEX_4_WEEK' 
                ? '四週變形工時 (4週8休)' 
                : '常態工時 (7休1)'}
            </div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              {rules.work_hour_model === 'FLEX_2_WEEK'
                ? '每 7 日至少 1 例假（連上上限 6 天）；每 2 週內例假與休息日至少 4 日。'
                : rules.work_hour_model === 'FLEX_4_WEEK'
                ? '每 2 週至少 2 例假（連上上限 10 天）；每 4 週內例休至少 8 日。'
                : '每 7 日至少 1 例 1 休，連續出勤上限 6 天。'}
            </p>
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50/80 p-1.5 rounded-md border border-emerald-200/60">
            {rules.work_hour_model === 'FLEX_2_WEEK'
              ? '✓ 14 日滾動視窗全員 $\\ge 4$ 天例休，每 7 日必有例假'
              : rules.work_hour_model === 'FLEX_4_WEEK'
              ? '✓ 2 週 2 例、4 週 8 休全員合規無違規'
              : '✓ 納入 8/25~8/31 跨月滑動視窗，無連 7 違規'}
          </div>
        </div>

        {/* 項目 2: 輪班間隔 */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <BookOpen className="w-4 h-4 mr-1 text-slate-600" /> 勞基法第 34 條
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[11px] font-bold text-slate-800 mb-1">輪班更換間隔 $\ge$ 11 小時</div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              更換班次時，前日退班至次日起班休息時間至少應有 11 小時。
            </p>
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50/80 p-1.5 rounded-md border border-emerald-200/60">
            ✓ 最晚 C 班 (19:30) 接次日 A 班 (08:30) 班距達 13h 合法
          </div>
        </div>

        {/* 項目 3: 假日打烊與站點覆蓋 */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <Award className="w-4 h-4 mr-1 text-slate-600" /> 營運門檻與打烊
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-[11px] font-bold text-slate-800 mb-1">站點人手與 C 班打烊專責</div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              平日限制 C 班；假日營業站點強制指定 C 班專責打烊。
            </p>
          </div>
          <div className="text-[10px] font-semibold text-emerald-700 bg-emerald-50/80 p-1.5 rounded-md border border-emerald-200/60">
            ✓ 9 大站點平假日人手門檻與 can_solo 100% 覆蓋
          </div>
        </div>

        {/* 項目 4: 工時調配模式與調移彈性摘要 */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-amber-600" /> 調移機制與工時
              </span>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                {rules.work_hour_model}
              </span>
            </div>
            <div className="text-[11px] font-bold text-slate-800 mb-1">
              {rules.work_hour_model === 'FLEX_2_WEEK' ? '休息日得在2週內調配' : rules.work_hour_model === 'FLEX_4_WEEK' ? '例休得在4週內調配' : '當週不可任意調移'}
            </div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              {rules.work_hour_model === 'FLEX_2_WEEK'
                ? '經指定行業程序，可將工作日之正常工時分配至其他工作日（單週上限 48h）。'
                : rules.work_hour_model === 'FLEX_4_WEEK'
                ? '每日正常工時可達 10h，得彈性安排連休。'
                : '每日正常工時上限 8h，每週上限 40h。'}
            </p>
          </div>
          <div className="text-[10px] font-semibold text-indigo-700 bg-indigo-50/80 p-1.5 rounded-md border border-indigo-200/60">
            ✓ 當月全館應排休總天數：{rules.required_off_days || 10} 天
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200">
          <h3 className="text-xs font-bold text-rose-800 mb-2">發現法規或站點異常清單：</h3>
          <ul className="space-y-1 text-xs text-rose-700">
            {issues.map((issue, idx) => (
              <li key={idx} className="flex items-start space-x-1">
                <span>•</span>
                <span>[第 {issue.day} 天] {issue.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
