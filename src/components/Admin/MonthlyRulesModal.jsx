// src/components/Admin/MonthlyRulesModal.jsx
import React, { useState } from 'react';
import { Settings2, X, Save, ShieldAlert, Calendar, Check, Sliders } from 'lucide-react';

export default function MonthlyRulesModal({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  currentMonth
}) {
  const [formData, setFormData] = useState({
    max_preferred_days: rules.max_preferred_days || 4,
    max_weekend_days: rules.max_weekend_days || 1,
    required_off_days: rules.required_off_days || 10,
    default_daily_quota: rules.default_daily_quota || 2,
    default_closing_time_weekday: rules.default_closing_time_weekday || '18:00',
    default_closing_time_weekend: rules.default_closing_time_weekend || '19:00'
  });
  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveRules({
      ...rules,
      max_preferred_days: Number(formData.max_preferred_days),
      max_weekend_days: Number(formData.max_weekend_days),
      required_off_days: Number(formData.required_off_days),
      default_daily_quota: Number(formData.default_daily_quota),
      default_closing_time_weekday: formData.default_closing_time_weekday,
      default_closing_time_weekend: formData.default_closing_time_weekend
    });
    setFeedback('已成功儲存全月排班劃休限制規則與閉店時間！');

    setTimeout(() => {
      setFeedback('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-scaleUp">
        {/* 標頭 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                【{currentMonth}】全月排班劃休限制規則設定
              </h3>
              <p className="text-[11px] text-slate-500">
                營運高階主管 (Manager) 專屬：動態設定同仁劃休額度與法定假總數
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="mb-4 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* 1. 每人每月自選休假天數上限 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>每人每月志願劃休天數上限 (max_preferred_days)</span>
              </label>
              <span className="text-xs font-black text-indigo-600 font-mono">
                {formData.max_preferred_days} 天
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              限制正職同仁在「志願劃休門戶」全月最多可自選之預排休假總天數（預設 4 天）。
            </p>
            <input
              type="range"
              min={1}
              max={10}
              value={formData.max_preferred_days}
              onChange={(e) => setFormData({ ...formData, max_preferred_days: e.target.value })}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* 2. 週末假日劃休天數上限 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>週末假日劃休天數上限 (max_weekend_days)</span>
              </label>
              <span className="text-xs font-black text-rose-600 font-mono">
                {formData.max_weekend_days} 天
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              保障商場週末營運尖峰人力：每位同仁全月週六、週日自選休假上限（預設 1 天）。
            </p>
            <input
              type="range"
              min={0}
              max={4}
              value={formData.max_weekend_days}
              onChange={(e) => setFormData({ ...formData, max_weekend_days: e.target.value })}
              className="w-full accent-rose-600 cursor-pointer"
            />
          </div>

          {/* 3. 當月全場應休總天數與配額 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                全月法定應休總天數
              </label>
              <input
                type="number"
                min={4}
                max={15}
                required
                value={formData.required_off_days}
                onChange={(e) => setFormData({ ...formData, required_off_days: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 font-bold font-mono text-center"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                單日全館劃休配額 (人)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                required
                value={formData.default_daily_quota}
                onChange={(e) => setFormData({ ...formData, default_daily_quota: e.target.value })}
                className="w-full border border-slate-300 rounded-lg p-2 font-bold font-mono text-center"
              />
            </div>
          </div>

          {/* 4. 方洲算理：營業時間與閉店班動態調度 */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
            <div className="flex items-center space-x-1.5 font-bold text-amber-950 mb-1.5">
              <span>🏛️ 方洲算理：每日營業時間與閉店班排程</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-[10px] text-amber-800 font-bold block mb-0.5">平日閉店時間</label>
                <select
                  value={formData.default_closing_time_weekday || '18:00'}
                  onChange={(e) => setFormData({ ...formData, default_closing_time_weekday: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 text-xs font-bold text-amber-950"
                >
                  <option value="18:00">18:00 (剛性不排 C 班)</option>
                  <option value="19:00">19:00 (延時營業)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-amber-800 font-bold block mb-0.5">假日閉店時間</label>
                <select
                  value={formData.default_closing_time_weekend || '19:00'}
                  onChange={(e) => setFormData({ ...formData, default_closing_time_weekend: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-lg p-1.5 text-xs font-bold text-amber-950"
                >
                  <option value="19:00">19:00 (核心站點排 C 班)</option>
                  <option value="18:00">18:00 (提早打烊不排 C 班)</option>
                  <option value="20:00">20:00 (大節慶延時)</option>
                </select>
              </div>
            </div>
            <p className="text-[10px] text-amber-700 leading-tight">
              • 平日 18:00 閉店時剛性不排晚班 C 班；假日 19:00 閉店時，服務台/收銀/清潔組將指派 C 班鎖門清帳，純體驗展區不排 C 班。
            </p>
          </div>


          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>儲存並套用規則</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
