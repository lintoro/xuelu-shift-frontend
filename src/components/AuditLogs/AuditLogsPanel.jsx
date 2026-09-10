import React, { useState } from 'react';
import { History, RotateCcw, Eye, ShieldCheck, FileText, ArrowRight, Clock, AlertCircle } from 'lucide-react';

export default function AuditLogsPanel({
  auditLogs,
  onRollback
}) {
  const [selectedLog, setSelectedLog] = useState(null);
  const [confirmRollbackLogId, setConfirmRollbackLogId] = useState(null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 標題與回滾安全說明 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              不可抹滅 Audit_Logs 雙快照與歷史回滾中心
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            每一次班表異動強制留存前後高保真 JSON 完整快照 · 支援主管一鍵秒級回滾
          </p>
        </div>

        <div className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-lg font-semibold flex items-center space-x-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <span>不可抹滅稽核日誌: 共 {auditLogs.length} 筆</span>
        </div>
      </div>

      {/* 稽核日誌列表 */}
      <div className="space-y-3 mb-6">
        {auditLogs.map((log, index) => {
          const isLatest = index === 0;
          const isRollback = log.action_type === 'ROLLBACK';
          const isSwap = log.action_type === 'SHIFT_SWAP';

          return (
            <div
              key={log.log_id}
              className={`p-4 rounded-xl border transition-all ${
                isLatest ? 'border-indigo-300 bg-indigo-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center space-x-2.5">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isRollback
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : isSwap
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {log.action_type}
                  </span>
                  <span className="text-xs font-bold text-slate-900">{log.notes}</span>
                  {isLatest && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-semibold">
                      當前生效版
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-400 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString('zh-TW')}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
                <div>
                  操作者: <span className="font-semibold text-slate-700">{log.operator_name}</span> ({log.operator_id})
                </div>

                <div className="flex items-center space-x-2">
                  {/* 查看快照 */}
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded text-xs transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>檢視快照 Diff</span>
                  </button>

                  {/* 一鍵回滾 */}
                  {!isLatest && (
                    <button
                      onClick={() => setConfirmRollbackLogId(log.log_id)}
                      className="flex items-center space-x-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>回滾至此快照點</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 快照 Diff 預覽彈窗 */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>快照詳情: {selectedLog.log_id}</span>
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 mb-3">
              <div>動作: <span className="font-bold text-slate-800">{selectedLog.action_type}</span></div>
              <div>說明: <span className="font-semibold text-slate-800">{selectedLog.notes}</span></div>
              <div>時間: <span>{new Date(selectedLog.timestamp).toLocaleString('zh-TW')}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  異動前快照 (Before Snapshot)
                </span>
                <pre className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 max-h-48 overflow-y-auto font-mono">
                  {selectedLog.before_snapshot 
                    ? JSON.stringify(selectedLog.before_snapshot, null, 2).slice(0, 800) + '...'
                    : '初始狀態 (Initial State)'}
                </pre>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-1">
                  異動後快照 (After Snapshot)
                </span>
                <pre className="text-[10px] text-slate-600 bg-white p-2 rounded border border-slate-200 max-h-48 overflow-y-auto font-mono">
                  {selectedLog.after_snapshot 
                    ? JSON.stringify(selectedLog.after_snapshot, null, 2).slice(0, 800) + '...'
                    : '最新排班狀態'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 確認回滾對話框 */}
      {confirmRollbackLogId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-5 border border-slate-200 animate-scaleUp">
            <div className="flex items-center space-x-2 text-amber-600 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">確認執行全案歷史回滾？</h4>
            </div>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              系統將會一鍵將全館排班矩陣瞬間還原至日誌【{confirmRollbackLogId}】之狀態。此動作亦會寫入不可抹滅之回滾日誌，確保 100% 稽核軌跡留痕。
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmRollbackLogId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onRollback(confirmRollbackLogId);
                  setConfirmRollbackLogId(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                確認執行回滾
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
