import React from 'react';
import { ShieldAlert, RefreshCw, Settings, Database, CloudOff, AlertCircle } from 'lucide-react';

/**
 * 資料庫連線安全防護閘門 (Fail-Closed Protection Gate)
 * 核心原則：
 * 「連不到資料庫正確資料時，寧可不顯示也不要秀錯誤或假資料，直到正確連上為止」
 * 
 * 支援狀態：
 * - 'CONNECTING': 連線驗證中（顯示骨架與進度，鎖定不渲染舊/假資料）
 * - 'ERROR': 線路異常/斷線中（顯示安全防護屏，阻斷任何未驗證資料展示）
 * - 'CONNECTED': 連線成功且資料真實（正常渲染 children）
 * - 'OFFLINE': 本地沙盒模式（正常渲染 children）
 */
export default function ConnectionGate({
  status = 'CONNECTING',
  error = null,
  title = '資料庫連線防護中',
  description = '為維護資料真實性，系統已啟動安全保護鎖定，絕不呈現虛構或錯誤資料。',
  onRetry = null,
  onOpenSettings = null,
  children
}) {
  // 若已正確連線或處於離線沙盒模式，正常放行渲染子元件
  if (status === 'CONNECTED' || status === 'OFFLINE') {
    return <>{children}</>;
  }

  // 1. 連線中狀態 (CONNECTING)
  if (status === 'CONNECTING') {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-8 sm:p-12 my-6 text-center animate-pulse">
        <div className="mx-auto w-16 h-16 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mb-4 text-sky-600">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">
          🔄 正在安全連線至 Google 試算表資料庫...
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
          為落實「寧缺毋濫」資料真實性政策，系統正嚴密向雲端核對最新人事與排班資料，核實完成後將立即自動呈現。
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 font-mono">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>狀態：連線握手驗證中...</span>
        </div>
      </div>
    );
  }

  // 2. 連線異常/斷線狀態 (ERROR)
  return (
    <div className="bg-rose-50/40 rounded-xl shadow-xs border border-rose-200 p-8 sm:p-12 my-6 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center mb-4 text-rose-600 shadow-sm">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold mb-3">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>資料庫連線中斷 · 安全防護模式已啟動</span>
      </div>

      <h3 className="text-xl font-black text-slate-900 mb-2">
        {title}
      </h3>

      <p className="text-sm text-slate-600 max-w-lg mx-auto mb-4 leading-relaxed">
        {description}
      </p>

      {error && (
        <div className="bg-white/80 border border-rose-200 rounded-lg p-3 max-w-md mx-auto mb-6 text-left shadow-2xs">
          <p className="text-xs text-slate-400 font-bold mb-1">診斷資訊 / 錯誤日誌：</p>
          <p className="text-xs font-mono text-rose-700 break-all">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-center flex-wrap gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-bold shadow-md shadow-indigo-200 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>立即重新連線資料庫</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-slate-50 active:scale-95 text-slate-700 border border-slate-300 text-sm font-semibold shadow-2xs transition cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>檢查連線設定</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-6">
        ※ 遵循 Fail-Closed 原則：線路不穩時拒絕展示未核實之假名冊或演算法虛擬班表。
      </p>
    </div>
  );
}
