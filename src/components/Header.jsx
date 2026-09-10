import React from 'react';
import { 
  ShieldCheck, 
  Calendar, 
  Zap, 
  LayoutGrid, 
  HeartHandshake, 
  Eye, 
  ArrowLeftRight, 
  History,
  Users,
  Clock,
  Scale,
  BarChart3,
  User,
  LogOut,
  KeyRound,
  FileCheck2,
  Cloud,
  CloudCheck,
  CloudOff
} from 'lucide-react';

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
  isCloudMode,
  isValid
}) {
  const isManager = currentUser?.role === 'Manager';
  const isAdmin = !!currentUser?.is_admin;
  const isLeader = currentUser?.role === 'Leader';
  const isPT = currentUser?.role === 'PT';

  // 依雙軌解耦權限動態過濾 Tab 選單
  const allTabs = [
    { id: 'MY_DASHBOARD', label: '我的工作台', icon: User, show: true },
    { id: 'SCHEDULE', label: '排班總表', icon: LayoutGrid, show: true },
    { id: 'LEAVE_PORTAL', label: isPT ? '意向報班' : '志願劃休', icon: HeartHandshake, show: !isManager || isPT },
    { id: 'CONFLICTS', label: '衝突透視', icon: Eye, show: isManager || isAdmin },
    { id: 'SWAPS', label: (isManager || isLeader || isAdmin) ? '調班二階審核' : '線上調班申請', icon: ArrowLeftRight, show: !isPT },
    { id: 'HOURS_OVERRIDE', label: '實勤覆核', icon: Clock, show: isManager || isLeader },
    { id: 'MONTHLY_SETTLEMENT', label: '月底考勤結算', icon: FileCheck2, show: isManager || isAdmin },
    // 核心決策：人事管理、班別規劃與 120 天平帳僅限營運高階 Manager，Admin 嚴格無人事與班別規劃權！
    { id: 'PERSONNEL', label: '人事管理', icon: Users, show: isManager },
    { id: 'SHIFT_SETTINGS', label: '班別主檔', icon: Clock, show: isManager },
    { id: 'HOLIDAY_TRANSFER', label: '120天平帳', icon: Scale, show: isManager },
    { id: 'FAIRNESS', label: '公平性與AI', icon: BarChart3, show: isManager || isAdmin },
    { id: 'AUDIT_LOGS', label: '稽核回滾', icon: History, show: isManager || isAdmin }
  ];

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
          {/* 雲端連線狀態動態指示按鈕 */}
          <button
            type="button"
            onClick={onOpenCloudModal}
            title={isCloudMode ? "Google Sheets 雲端連線中 (點擊開啟設定與同步)" : "目前處於本地沙盒模式 (點擊配置 Google Sheets GAS 雲端連線)"}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isCloudMode
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 shadow-2xs'
                : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
            }`}
          >
            {isCloudMode ? (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            ) : (
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            )}
            <Cloud className="w-3.5 h-3.5" />
            <span>{isCloudMode ? '雲端同步' : '本地沙盒'}</span>
          </button>

          {/* 月份與工時模式 (僅 Manager / Admin 可調整工時模式) */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 ml-1.5 mr-1 text-slate-500" />
            <select
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
              className="bg-transparent font-medium text-slate-700 text-xs focus:outline-none pr-1 cursor-pointer"
            >
              <option value="2026-09">2026/09 (休10天)</option>
              <option value="2026-10">2026/10 (休11天)</option>
            </select>
          </div>

          {(isManager || isAdmin) && (
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

          {/* 使用者資訊與操作膠囊 */}
          {currentUser && (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="text-right">
                <div className="flex items-center justify-end space-x-1">
                  <span className="font-extrabold text-xs text-slate-900">{currentUser.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    isManager ? 'bg-purple-100 text-purple-700' : isLeader ? 'bg-blue-100 text-blue-700' : isPT ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isManager ? '營運高管' : isLeader ? '站點組長' : isPT ? '計時PT' : '正職'}
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
