import React from 'react';
import { Calendar, Users, LayoutGrid, Eye, ArrowLeftRight, Clock, FileCheck2, BarChart3, History, Cloud, User, LogOut, CheckCircle2, RotateCw, KeyRound, Scale, Sliders, ShieldCheck, Zap, HeartHandshake, ShieldAlert, Database } from 'lucide-react';
import { ANNUAL_HOLIDAY_PLANS } from '../data/holidayTransferStore.js';

export default function Header({
  currentUser,
  currentMonth,
  onMonthChange,
  workHourModel,
  onModelChange,
  activeTab,
  onTabChange,
  onOpenChangePin,
  onLogout,
  onOpenCloudModal,
  onRefreshFromCloud,
  onOpenRulesModal,
  isCloudMode = false,
  isValid = true,
  dbConnectionStatus = 'CONNECTED',
  lastSyncTime = null,
  autoSyncStatus = 'idle'
}) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const isPT = currentUser?.role === 'PT';

  // 依雙軌解耦權限動態過濾 Tab 選單
  const allTabs = [
    { id: 'MY_DASHBOARD', label: '我的工作台', icon: User, show: true },
    { id: 'SCHEDULE', label: '排班總表', icon: LayoutGrid, show: isManager || isLeader },
    { id: 'LEAVE_PORTAL', label: isPT ? '意向報班' : '志願劃休', icon: HeartHandshake, show: !isManager || isPT },
    { id: 'CONFLICTS', label: '衝突透視', icon: Eye, show: isManager || isAdmin },
    { id: 'SWAPS', label: (isManager || isLeader || isAdmin) ? '調班二階審核' : '線上調班申請', icon: ArrowLeftRight, show: !isPT },
    { id: 'HOURS_OVERRIDE', label: '實勤覆核', icon: Clock, show: isManager || isLeader },
    { id: 'MONTHLY_SETTLEMENT', label: '月底考勤結算', icon: FileCheck2, show: isManager || isAdmin },
    // 核心決策：人事管理、班別規劃與 120 天平帳僅限營運高階 Manager，Admin 嚴格無人事與班別規劃權！
    { id: 'PERSONNEL', label: '人事管理', icon: Users, show: isManager },
    { id: 'SHIFT_SETTINGS', label: '班別主檔', icon: Clock, show: isManager },
    { id: 'HOLIDAY_TRANSFER', label: '國定假日調移', icon: Scale, show: isManager },
    { id: 'FAIRNESS', label: '公平性與AI', icon: BarChart3, show: isManager || isAdmin },
    { id: 'AUDIT_LOGS', label: '稽核回滾', icon: History, show: isManager || isAdmin }
  ];

  // 動態生成當前月與下個月選項（以 new Date() 為基準動態產生，不寫死）
  const monthOptions = React.useMemo(() => {
    const now = new Date();
    const y0 = now.getFullYear();
    const m0 = now.getMonth() + 1;
    const m0Str = `${y0}-${String(m0).padStart(2, '0')}`;

    const nextDate = new Date(y0, m0, 1);
    const y1 = nextDate.getFullYear();
    const m1 = nextDate.getMonth() + 1;
    const m1Str = `${y1}-${String(m1).padStart(2, '0')}`;

    const candidates = [m0Str, m1Str];

    if (currentMonth && !candidates.includes(currentMonth)) {
      candidates.push(currentMonth);
    }
    ['2026-09', '2026-10'].forEach(m => {
      if (!candidates.includes(m)) candidates.push(m);
    });

    candidates.sort();

    return candidates.map(mStr => {
      const [yr, mon] = mStr.split('-').map(Number);
      
      // SSOT 一致性：優先讀取全年度國假調移計畫中的實排休假天數 (actualOff)
      const yearPlan = ANNUAL_HOLIDAY_PLANS[String(yr)] || [];
      const monthPlan = yearPlan.find(p => Number(p.month) === Number(mon));
      
      let offDays = monthPlan ? monthPlan.actualOff : null;

      if (offDays === null || offDays === undefined) {
        const daysInMonth = new Date(yr, mon, 0).getDate();
        let weekendCount = 0;
        for (let d = 1; d <= daysInMonth; d++) {
          const dayOfWeek = new Date(yr, mon - 1, d).getDay();
          if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++;
        }
        offDays = weekendCount;
      }

      return {
        value: mStr,
        label: `${yr}/${String(mon).padStart(2, '0')} (休${offDays}天)`
      };
    });
  }, [currentMonth]);

  const visibleTabs = allTabs.filter(t => t.show);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      {/* 頂部主列 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* 左側系統 Logo 與標題 */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 font-black">
            學
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">學旅營運處多站點智慧排班系統</h1>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                V2.5 雲端聯調版
              </span>
            </div>
            <p className="text-[11px] text-slate-500">9大站點 · 4大班別 · Google Sheets 雙向持久化</p>
          </div>
        </div>

        {/* 右側：雲端狀態、月份與工時模式、同仁資訊、密碼按鈕、登出 */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* 雲端連線狀態動態指示按鈕 (三態安全連線閘門) */}
          <button
            type="button"
            onClick={onOpenCloudModal}
            title={
              dbConnectionStatus === 'CONNECTED'
                ? `Google Sheets 資料庫連線正常 (最新同步: ${lastSyncTime || '剛剛'})，點擊開啟設定與同步`
                : dbConnectionStatus === 'CONNECTING'
                ? '正在與 Google Sheets 資料庫安全連線與核實資料...'
                : dbConnectionStatus === 'ERROR'
                ? '資料庫連線中斷！安全防護鎖定已啟動，暫停展示未核實資料，點擊查看診斷'
                : '目前處於本地沙盒模式 (點擊配置 Google Sheets GAS 雲端連線)'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              dbConnectionStatus === 'CONNECTED'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                : dbConnectionStatus === 'CONNECTING'
                ? 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100 animate-pulse shadow-2xs'
                : dbConnectionStatus === 'ERROR'
                ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100 shadow-2xs'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {dbConnectionStatus === 'CONNECTED' ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : dbConnectionStatus === 'CONNECTING' ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : dbConnectionStatus === 'ERROR' ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
            <Cloud className="w-3.5 h-3.5" />
            <span>
              {dbConnectionStatus === 'CONNECTED'
                ? '雲端已連線'
                : dbConnectionStatus === 'CONNECTING'
                ? '連線驗證中'
                : dbConnectionStatus === 'ERROR'
                ? '連線中斷(保護)'
                : '本地沙盒'}
            </span>
          </button>

          {/* 自動非同步背景同步即時狀態反饋 (免手動按上傳) */}
          {isCloudMode && (
            <>
              {autoSyncStatus === 'syncing' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200 animate-pulse" title="班表變動正在自動非同步同步至 Google 試算表">
                  <RotateCw className="w-3 h-3 animate-spin" />
                  自動同步中...
                </span>
              )}
              {autoSyncStatus === 'synced' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200" title="班表已即時自動儲存至 Google 試算表">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  已自動同步
                </span>
              )}
              {autoSyncStatus === 'error' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title="自動同步暫時中斷，系統已保留變更待線路通暢時自動補傳">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  待補同步
                </span>
              )}
            </>
          )}

          {/* 雲端手動快速刷新按鈕 */}
          {isCloudMode && (
            <button
              type="button"
              onClick={onRefreshFromCloud}
              title="立即從 Google 試算表拉取最新人事名冊、班別與排班資料"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition cursor-pointer shadow-2xs active:scale-95"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>刷新試算表</span>
            </button>
          )}

          {/* 月份選擇器 (全員可見，動態生成當月與下月) */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 ml-1.5 mr-1 text-slate-500" />
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-bold text-slate-700 text-xs focus:outline-none pr-1 cursor-pointer"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 工時法規模式 (僅 Manager 排班主管可調整全館工時法規模型，Staff Admin 排除) */}
          {isManager && (
            <div className="flex items-center space-x-1 bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded-lg text-xs">
              <select
                value={workHourModel}
                onChange={(e) => onModelChange(e.target.value)}
                className="bg-transparent font-bold text-amber-800 focus:outline-none cursor-pointer text-xs"
              >
                <option value="REGULAR">7 休 1 (常態 · 第36條1項)</option>
                <option value="FLEX_2_WEEK">雙週變形 (30條2項 · 2週4休)</option>
                <option value="FLEX_4_WEEK">四週變形 (30-1條 · 4週8休)</option>
              </select>
            </div>
          )}

          {/* Manager 專屬：每月排班劃休限制規則設定入口 */}
          {isManager && onOpenRulesModal && (
            <button
              type="button"
              onClick={onOpenRulesModal}
              title="設定每月同仁志願劃休天數上限、週末假日上限與法定應休天數"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 transition cursor-pointer shadow-2xs active:scale-95"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-600" />
              <span>劃休限制設定</span>
            </button>
          )}

          {/* 使用者資訊與操作膠囊 */}
          {currentUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <span className="font-extrabold text-xs text-slate-900">{currentUser.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isManager ? 'bg-purple-100 text-purple-700' : isLeader ? 'bg-blue-100 text-blue-700' : isPT ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isManager ? 'Manager' : isLeader ? 'Leader' : isPT ? 'PT' : 'Staff'}
                  </span>
                  {isAdmin && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-black shadow-2xs">
                      ★ Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">{currentUser.emp_id}</div>
              </div>

              {/* 變更密碼按鈕 */}
              <button
                onClick={onOpenChangePin}
                title="自訂個人 6 碼 PIN 密碼"
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              {/* 登出按鈕 */}
              <button
                onClick={onLogout}
                title="安全登出系統"
                className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 導航分頁列 */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1 text-xs font-bold text-slate-600 scrollbar-none">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  isActive 
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80 font-extrabold' 
                    : 'hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
