// src/components/Admin/MonthlyRulesModal.jsx
import React, { useState } from 'react';
import { Settings2, X, Save, ShieldAlert, Calendar, Check, Sliders, Lock, Users, Award, UserCheck } from 'lucide-react';

export default function MonthlyRulesModal({
  isOpen,
  onClose,
  rules,
  onSaveRules,
  currentMonth,
  stations = [],
  employees = [],
  onSaveStations
}) {
  const [activeTab, setActiveTab] = useState('QUOTA_RULES'); // 'QUOTA_RULES' | 'STATION_STAFFING'

  // Tab 1: 全館劃休配額與法規規則
  const [formData, setFormData] = useState({
    max_preferred_days: rules?.max_preferred_days || 4,
    max_weekend_days: rules?.max_weekend_days || 1,
    required_off_days: rules?.required_off_days || 10,
    default_daily_quota: rules?.default_daily_quota || 2,
    default_closing_time_weekday: rules?.default_closing_time_weekday || '18:00',
    default_closing_time_weekend: rules?.default_closing_time_weekend || '19:00'
  });

  // Tab 2: 9 大站點平日/假日最低人數與當月組長
  const [stationList, setStationList] = useState(() => {
    return (stations || []).map(st => ({
      ...st,
      leader_emp_id: st.leader_emp_id || st.leader_id || '',
      min_staff_weekday: st.min_staff_weekday !== undefined ? Number(st.min_staff_weekday) : 1,
      min_staff_weekend: st.min_staff_weekend !== undefined ? Number(st.min_staff_weekend) : 2
    }));
  });

  const [feedback, setFeedback] = useState('');

  if (!isOpen) return null;

  // 正規化站點代碼比對
  const normalizeStationId = (id) => {
    if (!id) return '';
    const upper = String(id).toUpperCase().trim();
    if (upper === 'ST_OPS' || upper === 'ST_ADMIN') return 'ST_ADMIN';
    if (upper === 'ST_EXTREME' || upper === 'ST_EXPERIENCE') return 'ST_EXPERIENCE';
    return upper;
  };

  // 取得站點名稱
  const getStationName = (stId) => {
    const target = normalizeStationId(stId);
    const found = stations.find(s => normalizeStationId(s.station_id) === target);
    return found ? found.station_name : stId;
  };

  // 更新單一站點之平日/假日人數或組長
  const handleUpdateStation = (stationId, field, value) => {
    setStationList(prev => prev.map(st => {
      if (st.station_id === stationId) {
        return { ...st, [field]: value };
      }
      return st;
    }));
  };

  // 統計全館平日與假日總需求人數
  const totalWeekdayMin = stationList.reduce((sum, s) => sum + (Number(s.min_staff_weekday) || 0), 0);
  const totalWeekendMin = stationList.reduce((sum, s) => sum + (Number(s.min_staff_weekend) || 0), 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 1. 儲存全月劃休法規規則
    if (onSaveRules) {
      onSaveRules({
        ...rules,
        max_preferred_days: Number(formData.max_preferred_days),
        max_weekend_days: Number(formData.max_weekend_days),
        required_off_days: Number(formData.required_off_days),
        default_daily_quota: Number(formData.default_daily_quota),
        default_closing_time_weekday: formData.default_closing_time_weekday,
        default_closing_time_weekend: formData.default_closing_time_weekend
      });
    }

    // 2. 儲存各組平假日人數與組長選派
    if (onSaveStations) {
      onSaveStations(stationList);
    }

    setFeedback('已成功儲存全月排班營運規則、各組平假日出勤人數與組長配置！');

    setTimeout(() => {
      setFeedback('');
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 animate-scaleUp flex flex-col max-h-[90vh] my-auto overflow-hidden">
        {/* 標頭 (固定置頂) */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>【{currentMonth}】每月排班與各組營運規則總控</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
                  Manager 專屬
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                一站式配置：全館劃休配額 ＋ 9 大組別平日/假日出勤人力與當月組長
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 雙分頁切換列 (Tabs) */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 sm:px-5 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('QUOTA_RULES')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'QUOTA_RULES'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. 全館劃休配額與法規</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('STATION_STAFFING')}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'STATION_STAFFING'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. 各組平假日出勤與組長選派</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
              9 大組別
            </span>
          </button>
        </div>

        {feedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2 shrink-0">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* 滾動內容區 */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
            {activeTab === 'QUOTA_RULES' ? (
              /* ================== Tab 1: 全館劃休配額與法規 ================== */
              <>
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

                {/* 3. 當月全場應休總天數 (勞基法固定天數，鎖定不可改) 與 單日劃休配額 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>全月法定應休總天數</span>
                      </label>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                        🔒 法定固定天數
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      依勞動基準法由曆法自動固定計算（雙週84工時/一例一休及國定假日），禁止隨意變動。
                    </p>
                    <div className="relative">
                      <input
                        type="number"
                        readOnly
                        disabled
                        value={formData.required_off_days}
                        className="w-full bg-slate-100/90 border border-slate-300 rounded-lg p-2 font-black font-mono text-center text-slate-700 cursor-not-allowed select-none shadow-inner"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">天</span>
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200">
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        <span>單日全館劃休配額 (人)</span>
                      </label>
                      <span className="text-xs font-black text-indigo-700 font-mono">
                        {formData.default_daily_quota} 名
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">
                      全場每日允許同時劃休之正職同仁總人數上限（支援彈性拉動至 10 名以上）。
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min={1}
                        max={15}
                        step={1}
                        value={formData.default_daily_quota}
                        onChange={(e) => setFormData({ ...formData, default_daily_quota: Number(e.target.value) })}
                        className="flex-1 accent-indigo-600 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={1}
                        max={15}
                        required
                        value={formData.default_daily_quota}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(15, Number(e.target.value) || 1));
                          setFormData({ ...formData, default_daily_quota: val });
                        }}
                        className="w-16 border border-indigo-300 bg-white rounded-lg p-1.5 font-bold font-mono text-center text-indigo-900 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
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
              </>
            ) : (
              /* ================== Tab 2: 各組平假日出勤與組長選派 ================== */
              <>
                {/* 總結資訊 Bar */}
                <div className="p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <div>
                      <span className="font-bold text-slate-800 text-xs">9 大組別人力與組長矩陣</span>
                      <span className="text-[11px] text-slate-500 block">設定各組每日最低值勤人力，即時連動一鍵排班與三級合規檢核</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 text-[10px]">平日最低總合: </span>
                      <span className="font-black text-indigo-700">{totalWeekdayMin} 名/日</span>
                    </div>
                    <div className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-slate-500 text-[10px]">假日最低總合: </span>
                      <span className="font-black text-purple-700">{totalWeekendMin} 名/日</span>
                    </div>
                  </div>
                </div>

                {/* 9 大站點設定網格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {stationList.map(st => {
                    const targetStationId = normalizeStationId(st.station_id);
                    const currentLeaderId = st.leader_emp_id || '';

                    // 候選人資格過濾 (排除自主排班高管、排除兼職PT、排除非Active同仁)
                    const candidates = (employees || []).filter(e => {
                      if (e.is_self_scheduled || e.role === 'PT') return false;
                      if (e.status && e.status !== 'Active') return false;

                      const isPrimary = normalizeStationId(e.primary_station) === targetStationId;
                      const isSupported = (e.supported_stations || [])
                        .map(s => normalizeStationId(s))
                        .includes(targetStationId);

                      return isPrimary || isSupported || e.emp_id === currentLeaderId;
                    });

                    // 排序：主站同仁置頂，再依支援主站排序，最後依工號排序
                    candidates.sort((a, b) => {
                      const isPriA = normalizeStationId(a.primary_station) === targetStationId;
                      const isPriB = normalizeStationId(b.primary_station) === targetStationId;
                      if (isPriA !== isPriB) return isPriA ? -1 : 1;

                      const stA = normalizeStationId(a.primary_station) || '';
                      const stB = normalizeStationId(b.primary_station) || '';
                      if (stA !== stB) return stA.localeCompare(stB);

                      return (a.emp_id || '').localeCompare(b.emp_id || '');
                    });

                    return (
                      <div
                        key={st.station_id}
                        className="bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors shadow-2xs flex flex-col justify-between"
                      >
                        {/* 站點名稱與組長狀態 */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span>{st.station_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">({st.station_id})</span>
                          </div>
                          {currentLeaderId ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              組長在勤
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-200 text-slate-600">
                              未指派組長
                            </span>
                          )}
                        </div>

                        {/* 組長選派下拉 */}
                        <div className="mb-2.5">
                          <label className="text-[10px] text-slate-500 font-bold block mb-1">
                            當月排班組長 (Leader)：
                          </label>
                          <select
                            value={currentLeaderId}
                            onChange={(e) => handleUpdateStation(st.station_id, 'leader_emp_id', e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                          >
                            <option value="">(未指派 / 主管統籌)</option>
                            {candidates.map(e => {
                              const isPrimary = normalizeStationId(e.primary_station) === targetStationId;
                              const stationLabel = getStationName(e.primary_station);
                              return (
                                <option key={e.emp_id} value={e.emp_id}>
                                  [{stationLabel}] {e.name} ({e.emp_id}){isPrimary ? '' : ' [支援]'}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 平假日最低人數步進器 */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
                          {/* 平日最少人數 */}
                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <div className="text-[10px] text-slate-600 font-bold mb-1">
                              平日最少 (週一~五)
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleUpdateStation(st.station_id, 'min_staff_weekday', Math.max(0, (Number(st.min_staff_weekday) || 0) - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-sm text-indigo-700">
                                {st.min_staff_weekday || 0} 名
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateStation(st.station_id, 'min_staff_weekday', Math.min(5, (Number(st.min_staff_weekday) || 0) + 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* 假日最少人數 */}
                          <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col justify-between">
                            <div className="text-[10px] text-slate-600 font-bold mb-1">
                              假日最少 (週六~日)
                            </div>
                            <div className="flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => handleUpdateStation(st.station_id, 'min_staff_weekend', Math.max(0, (Number(st.min_staff_weekend) || 0) - 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                -
                              </button>
                              <span className="font-mono font-black text-sm text-purple-700">
                                {st.min_staff_weekend || 0} 名
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateStation(st.station_id, 'min_staff_weekend', Math.min(10, (Number(st.min_staff_weekend) || 0) + 1))}
                                className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center cursor-pointer active:scale-95"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 底部按鈕區 (固定置底) */}
          <div className="p-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/90 rounded-b-2xl">
            <div className="text-[11px] text-slate-500 font-semibold">
              ★ 修改後將即時寫入本機與雲端，並連動自動排班引擎目標人數
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>儲存並套用全館規則</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
