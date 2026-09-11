// 測試登入後全路徑 SSR 渲染，找出崩潰元件
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { EMPLOYEES, STATIONS } from '../src/data/mockMasterData.js';

// 模擬登入後的 currentUser
const testUser = EMPLOYEES.find(e => e.emp_id === 'B111155');
console.log('模擬登入帳號:', testUser.name, testUser.role);

// 逐一測試各核心子元件
const testComponents = [
  ['Header', () => import('../src/components/Header.jsx')],
  ['SchedulingTimelineStepper', () => import('../src/components/Timeline/SchedulingTimelineStepper.jsx')],
  ['MyDashboard', () => import('../src/components/Dashboard/MyDashboard.jsx')],
  ['ScheduleTable', () => import('../src/components/ScheduleTable.jsx')],
  ['AnnualHolidayTransfer', () => import('../src/components/Admin/AnnualHolidayTransfer.jsx')],
  ['MonthlySettlementPanel', () => import('../src/components/MonthlySettlement/MonthlySettlementPanel.jsx')],
  ['PersonnelManagement', () => import('../src/components/Admin/PersonnelManagement.jsx')],
  ['ActualHoursOverride', () => import('../src/components/WorkHours/ActualHoursOverride.jsx')],
  ['ShiftSwapPortal', () => import('../src/components/ShiftSwap/ShiftSwapPortal.jsx')],
  ['AuditLogsPanel', () => import('../src/components/AuditLogs/AuditLogsPanel.jsx')],
  ['FairnessMetricsPanel', () => import('../src/components/Fairness/FairnessMetricsPanel.jsx')],
  ['CompliancePanel', () => import('../src/components/CompliancePanel.jsx')],
  ['PersonalPreferences', () => import('../src/components/PersonalPreferences.jsx')],
  ['HolidayConsentModal', () => import('../src/components/HolidayConsentModal.jsx')],
  ['StationStatusOverview', () => import('../src/components/StationStatusOverview.jsx')],
  ['GasConnectionModal', () => import('../src/components/Cloud/GasConnectionModal.jsx')],
  ['ShiftMasterManagement', () => import('../src/components/Admin/ShiftMasterManagement.jsx')],
];

let failCount = 0;
for (const [name, loadFn] of testComponents) {
  try {
    const mod = await loadFn();
    const Comp = mod.default;
    // 嘗試用最小 props 渲染
    const html = ReactDOMServer.renderToString(React.createElement(Comp, {
      currentUser: testUser,
      employees: EMPLOYEES,
      stations: STATIONS,
      scheduleMap: {},
      scheduleResult: { scheduleMap: {}, totalDays: 30, durationMs: 0 },
      validation: { isValid: true, errors: [], warnings: [] },
      rules: { target_year_month: '2026-09', totalDays: 30 },
      currentMonth: '2026-09',
      shiftTypes: {},
      auditLogs: [],
      swapRequests: [],
      leaveBalances: {},
      holidayConsents: {},
    }));
    console.log(`✅ ${name}: 渲染成功 (${html.length} 字元)`);
  } catch (e) {
    failCount++;
    console.error(`❌ ${name}: 渲染崩潰！`);
    console.error(`   錯誤訊息: ${e.message}`);
    if (e.stack) {
      // 只印前 3 行 stack
      const lines = e.stack.split('\n').slice(0, 4);
      lines.forEach(l => console.error('   ' + l));
    }
  }
}

console.log(`\n=== 總結: ${testComponents.length - failCount}/${testComponents.length} 個元件渲染正常，${failCount} 個崩潰 ===`);
if (failCount > 0) {
  console.error('🔴 上方標記 ❌ 的元件即是造成白屏的原因！');
}
