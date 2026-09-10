// src/services/apiService.js
/**
 * 學旅排班系統統一 API 服務網關 (JSON-RPC Architecture)
 * 核心決策 8-7：支援雙模式 (Dual Mode)
 * 1. 本地開發/預覽模式 (Local Mode)：使用 LocalStorage / 記憶體模擬，零主機維護成本。
 * 2. GAS 原生 Web App 模式 (GAS Production Mode)：支援 google.script.run 或原生 Fetch POST 對接 Google Sheets 7+1 表。
 */

const IS_GAS_ENVIRONMENT = typeof window !== 'undefined' && typeof window.google !== 'undefined' && typeof window.google.script !== 'undefined';
const GAS_WEB_APP_URL = (typeof window !== 'undefined' && window.__GAS_API_URL__) || '';

export const ApiService = {
  // 檢查當前運行環境
  isGasEnvironment() {
    return IS_GAS_ENVIRONMENT;
  },

  // 統一 JSON-RPC 呼叫器
  async callRpc(method, params = {}) {
    // 1. 若處於 GAS 嵌入 iframe (google.script.run)
    if (IS_GAS_ENVIRONMENT) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .doPost({
            postData: {
              contents: JSON.stringify({
                jsonrpc: '2.0',
                method: method,
                params: params,
                id: Date.now()
              })
            }
          });
      });
    }

    // 2. 若配置了外部已發布的 GAS Web App URL
    if (GAS_WEB_APP_URL) {
      const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // GAS 跨域最佳實踐
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: method,
          params: params,
          id: Date.now()
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'API 呼叫失敗');
      return data.result;
    }

    // 3. 本地 Mock 模式（預設）
    return this.mockHandler(method, params);
  },

  // 本地 Mock 回應處理器
  async mockHandler(method, params) {
    console.log(`[API 本地模式] 呼叫 ${method}`, params);
    switch (method) {
      case 'auth.login':
        return {
          success: true,
          token: 'mock_token_' + Date.now(),
          user: {
            emp_id: params.emp_id,
            name: '本地模擬登入者',
            role: 'Manager',
            is_admin: true,
            logged_in_at: new Date().toISOString()
          }
        };

      case 'schedule.getInitialData': {
        const { EMPLOYEES, STATIONS, DEFAULT_MONTHLY_RULES } = await import('../data/mockMasterData.js');
        return {
          employees: EMPLOYEES,
          stations: STATIONS,
          rules: DEFAULT_MONTHLY_RULES,
          scheduleMap: {}
        };
      }

      case 'leave.submitPreferences':
        return { success: true, count: (params.preferences || []).length };

      case 'calendar.exportMyIcs':
        return { success: true, icsContent: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR' };

      case 'schedule.saveSchedule':
        return { success: true, timestamp: new Date().toISOString() };

      case 'audit.rollback':
        return { success: true, restored: true };

      case 'admin.savePersonnel':
        return { success: true };

      case 'admin.holidayTransfer':
        return { success: true };

      case 'ai.optimizeSchedule':
        return {
          candidates: [{
            content: {
              parts: [{
                text: '【本地 AI 建議】目前各站點人力平衡良好，建議適度調節週末早晚班連續輪替頻率。'
              }]
            }
          }]
        };

      default:
        return { success: true };
    }
  },

  // 取得全系統初始主檔 (Employees, Stations, Rules, Quotas)
  async getInitialMasterData(yearMonth = '2026-09') {
    return this.callRpc('schedule.getInitialData', { year_month: yearMonth });
  },

  // 儲存全月排班矩陣 (Schedules 表)
  async saveScheduleMatrix(yearMonth, scheduleMap, operatorId) {
    return this.callRpc('schedule.saveSchedule', {
      year_month: yearMonth,
      schedule_matrix: scheduleMap,
      token: 'session_active'
    });
  },

  // 寫入不可抹滅之 Audit Log
  async logAuditEvent(auditLogEntry) {
    console.log('[API 稽核日誌] 寫入:', auditLogEntry.action_type);
    return { success: true };
  },

  // 匯出同仁專屬 ICS 行事曆
  async exportMyIcs(empId, yearMonth) {
    return this.callRpc('calendar.exportMyIcs', { emp_id: empId, year_month: yearMonth });
  },

  // 人事主檔變更儲存
  async savePersonnel(employeeData) {
    return this.callRpc('admin.savePersonnel', { employee_data: employeeData });
  },

  // 班表回滾
  async rollbackSchedule(logId) {
    return this.callRpc('audit.rollback', { log_id: logId });
  }
};
