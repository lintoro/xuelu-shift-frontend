// src/services/apiService.js
/**
 * 學旅排班系統統一 API 服務網關 (JSON-RPC Architecture)
 * 核心決策 8-7：支援雙模式 (Dual Mode)
 * 1. 本地開發/預覽模式 (Local Mode)：使用 LocalStorage / 記憶體模擬，零主機維護成本。
 * 2. GAS 原生 Web App 模式 (GAS Production Mode)：透過 google.script.run 或原生 Fetch POST 對接 Google Sheets 7+1 表。
 */

const IS_GAS_ENVIRONMENT = typeof window !== 'undefined' && typeof window.google !== 'undefined' && typeof window.google.script !== 'undefined';

export const ApiService = {
  // 檢查當前運行環境
  isGasEnvironment() {
    return IS_GAS_ENVIRONMENT;
  },

  // 取得全系統初始主檔 (Employees, Stations, Rules, Quotas)
  async getInitialMasterData() {
    if (IS_GAS_ENVIRONMENT) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .apiGetInitialMasterData();
      });
    }
    // 本地模式：從 mockMasterData 回傳
    const { EMPLOYEES, STATIONS, DEFAULT_MONTHLY_RULES } = await import('../data/mockMasterData.js');
    return {
      employees: EMPLOYEES,
      stations: STATIONS,
      rules: DEFAULT_MONTHLY_RULES
    };
  },

  // 儲存全月排班矩陣 (Schedules 表)
  async saveScheduleMatrix(yearMonth, scheduleMap, operatorId) {
    if (IS_GAS_ENVIRONMENT) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .apiSaveScheduleMatrix(yearMonth, scheduleMap, operatorId);
      });
    }
    console.log('[API 本地模式] 已儲存排班矩陣至本地狀態庫');
    return { success: true, timestamp: new Date().toISOString() };
  },

  // 寫入不可抹滅之 Audit Log
  async logAuditEvent(auditLogEntry) {
    if (IS_GAS_ENVIRONMENT) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .apiLogAuditEvent(auditLogEntry);
      });
    }
    console.log('[API 本地模式] 寫入 Audit Log:', auditLogEntry.action_type);
    return { success: true };
  }
};
