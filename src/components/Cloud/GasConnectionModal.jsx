import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Database, 
  Zap, 
  X, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import { ApiService } from '../../services/apiService.js';

export default function GasConnectionModal({
  isOpen,
  onClose,
  onPullFromCloud,
  onPushToCloud,
  cloudSyncStatus = null
}) {
  const [gasUrl, setGasUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setGasUrl(ApiService.getGasUrl());
      setTestResult(null);
      setSyncFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = !!gasUrl.trim();

  // 執行 Ping 伺服器健康檢測
  const handleTestConnection = async () => {
    if (!gasUrl.trim()) {
      setTestResult({
        success: false,
        error: '請先輸入 Google Apps Script 網路應用程式網址！'
      });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await ApiService.pingServer(gasUrl.trim());
      setTestResult(res);
      if (res.success) {
        ApiService.setGasUrl(gasUrl.trim());
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err.message || '連線逾時'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // 儲存配置
  const handleSaveConfig = () => {
    ApiService.setGasUrl(gasUrl.trim());
    setSyncFeedback({
      type: 'success',
      message: gasUrl.trim() ? '已儲存 GAS 雲端連線設定！系統已切換至雲端模式。' : '已清除 GAS 網址，系統已切換回本地沙盒模式。'
    });
  };

  // 清除切換回本地
  const handleResetToSandbox = () => {
    ApiService.clearGasUrl();
    setGasUrl('');
    setTestResult(null);
    setSyncFeedback({
      type: 'info',
      message: '已切換回本地沙盒模式 (Local Sandbox)，使用瀏覽器 LocalStorage 儲存。'
    });
  };

  // 觸發從雲端拉取
  const handleTriggerPull = async () => {
    if (!onPullFromCloud) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const ok = await onPullFromCloud();
      setSyncFeedback({
        type: ok ? 'success' : 'error',
        message: ok ? '成功從 Google 試算表同步最新主檔與班表資料！' : '拉取失敗，請確認 GAS 網址與試算表權限。'
      });
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: `同步異常: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // 觸發推送至雲端
  const handleTriggerPush = async () => {
    if (!onPushToCloud) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const ok = await onPushToCloud();
      setSyncFeedback({
        type: ok ? 'success' : 'error',
        message: ok ? '全系統本地主檔與排班矩陣已全量備份發布至 Google 試算表！' : '推送失敗，請檢查網路或權限。'
      });
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: `備份異常: ${err.message}`
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal 頂部 Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                Google Sheets 雲端連線與同步中心
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  $0 Serverless
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                前端 React ⇄ Google Apps Script (GAS) ⇄ Google 試算表 7+1+4 表實體雙向持久化
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal 內容主體 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 dark:text-slate-200 text-sm">
          {/* 當前連線模式狀態卡 */}
          <div className={`p-4 rounded-xl border flex items-start justify-between gap-4 transition ${
            isConfigured
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg mt-0.5 ${
                isConfigured ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {isConfigured ? <CloudCheck className="w-5 h-5" /> : <CloudOff className="w-5 h-5" />}
              </div>
              <div>
                <h4 className="font-bold text-base flex items-center gap-2">
                  {isConfigured ? '🟢 線上雲端連線模式 (Live Cloud Mode)' : '🟡 本地持久化沙盒模式 (Local Sandbox)'}
                </h4>
                <p className="text-xs mt-1 leading-relaxed opacity-90">
                  {isConfigured
                    ? '系統已連接至 Google Apps Script 雲端端點，所有排班矩陣、實勤覆核與調班單據均可實體持久化至 Google Drive 試算表。'
                    : '目前運作於零維護成本的本地沙盒中，資料儲存於瀏覽器 LocalStorage。配置下方 GAS 網址即可一鍵切換至雲端實體資料庫。'}
                </p>
              </div>
            </div>
          </div>

          {/* GAS 網址輸入區 */}
          <div className="space-y-2">
            <label className="block font-semibold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Google Apps Script Web App 部署網址 (Web App URL)</span>
              <span className="text-[11px] text-indigo-500 font-normal">自動記憶於本機快取</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={gasUrl}
                onChange={(e) => setGasUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 font-mono text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-24"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !gasUrl.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isTesting ? '測試中...' : '測試連線'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              * 提示：網址必須以 <code className="text-indigo-400 font-mono">/exec</code> 結尾，且發布時「誰可以存取」須設為「任何人 (Anyone)」。
            </p>
          </div>

          {/* Ping 測試回饋卡 */}
          {testResult && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 animate-fadeIn ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" />
              )}
              <div className="space-y-1 flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span>{testResult.success ? '連線成功！Google Apps Script 回應正常' : '連線測試失敗'}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                      RTT: {testResult.latencyMs} ms
                    </span>
                  )}
                </div>
                {testResult.success ? (
                  <p className="text-[11px] opacity-90">
                    伺服器代碼：<span className="font-mono">{testResult.server}</span> (版本 {testResult.version}) · 回應時間：{new Date(testResult.timestamp).toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="text-[11px] opacity-90">
                    錯誤原因：{testResult.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 雙向全量同步操作區 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>雲端資料庫雙向同步作業</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 拉取按鈕 */}
              <button
                type="button"
                onClick={handleTriggerPull}
                disabled={isSyncing || !isConfigured}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 text-left transition group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ArrowDownLeft className="w-4 h-4 group-hover:-translate-x-0.5 group-hover:translate-y-0.5 transition" />
                    從試算表重新載入 (Pull)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 font-mono">
                    Cloud → App
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  強制自 Google Sheets 讀取最新人事、站點主檔與排班表。
                </p>
              </button>

              {/* 推送按鈕 */}
              <button
                type="button"
                onClick={handleTriggerPush}
                disabled={isSyncing || !isConfigured}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 text-left transition group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                    一鍵備份至試算表 (Push)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 font-mono">
                    App → Cloud
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  將目前本地沙盒所有主檔、班別、排班矩陣與日誌完整備份上傳。
                </p>
              </button>
            </div>

            {/* 同步進度與結果訊息 */}
            {syncFeedback && (
              <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 animate-fadeIn ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                  : syncFeedback.type === 'error'
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                  : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{syncFeedback.message}</span>
              </div>
            )}
          </div>

          {/* 3步部署快速指引手冊 */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
            <h4 className="font-bold text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Google 試算表掛載三步 SOP 指引</span>
              <span className="text-[10px] text-slate-400 font-normal">免安裝額外伺服器</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-indigo-500 block mb-0.5">1. 貼入 Code.gs</span>
                在試算表開啟「擴充功能」→「Apps Script」，將本專案後端代碼貼入。
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-indigo-500 block mb-0.5">2. 一鍵自動建表</span>
                選擇函式 <code className="text-indigo-400">setupSpreadsheet</code> 點擊執行，自動建妥 7+1+4 表。
              </div>
              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-indigo-500 block mb-0.5">3. 部署 Web 應用</span>
                發布為 Web App，存取權限設為「任何人 (Anyone)」，複製網址貼入本面板。
              </div>
            </div>
          </div>
        </div>

        {/* Modal 底部按鈕列 */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetToSandbox}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium underline transition"
          >
            切換回本地沙盒 (Reset)
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              關閉
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              儲存並套用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
