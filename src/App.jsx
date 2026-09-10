import React, { useState, useMemo, useCallback } from 'react';
import Header from './components/Header.jsx';
import EngineDebugger from './components/EngineDebugger.jsx';
import AnomalyAlertBanner from './components/AnomalyAlertBanner.jsx';
import StationStatusOverview from './components/StationStatusOverview.jsx';
import ScheduleTable from './components/ScheduleTable.jsx';
import CompliancePanel from './components/CompliancePanel.jsx';
import EmployeeSelector from './components/LeavePortal/EmployeeSelector.jsx';
import RegularStaffPicker from './components/LeavePortal/RegularStaffPicker.jsx';
import PtAvailabilityPicker from './components/LeavePortal/PtAvailabilityPicker.jsx';
import LeaveConflictInspector from './components/LeavePortal/LeaveConflictInspector.jsx';
import ShiftSwapPortal from './components/ShiftSwap/ShiftSwapPortal.jsx';
import AuditLogsPanel from './components/AuditLogs/AuditLogsPanel.jsx';
import PersonnelManagement from './components/Admin/PersonnelManagement.jsx';
import ActualHoursOverride from './components/WorkHours/ActualHoursOverride.jsx';
import AnnualHolidayTransfer from './components/Admin/AnnualHolidayTransfer.jsx';
import FairnessMetricsPanel from './components/Fairness/FairnessMetricsPanel.jsx';
import LoginView from './components/Auth/LoginView.jsx';
import ChangePasswordModal from './components/Auth/ChangePasswordModal.jsx';
import MyDashboard from './components/Dashboard/MyDashboard.jsx';

import { STATIONS, EMPLOYEES, DEFAULT_MONTHLY_RULES, MOCK_MONTH_BORDERS } from './data/mockMasterData.js';
import { 
  INITIAL_LEAVE_BALANCES, 
  INITIAL_DAILY_QUOTAS, 
  INITIAL_PREFERENCES, 
  INITIAL_PT_AVAILABILITY 
} from './data/leaveStore.js';
import { INITIAL_SWAP_REQUESTS, INITIAL_AUDIT_LOGS } from './data/swapStore.js';
import { generateSeedSchedule } from './engine/schedulerEngine.js';
import { validateScheduleCompliance } from './engine/complianceValidator.js';
import { exportEmployeeToIcs, exportScheduleToCsv } from './utils/calendarExport.js';

export default function App() {
  // 當前登入同仁 (null 表示未登入，預設呈現登入入口與身分切換卡)
  const [currentUser, setCurrentUser] = useState(null);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [isForcedPinChange, setIsForcedPinChange] = useState(false);

  const [activeTab, setActiveTab] = useState('MY_DASHBOARD'); 
  const [currentMonth, setCurrentMonth] = useState('2026-09');
  const [workHourModel, setWorkHourModel] = useState('REGULAR');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isResignedActive, setIsResignedActive] = useState(false);

  // 動態人事主檔 (支援 localStorage 本機持久化，改動密碼重新整理不丟失)
  const [allEmployees, setAllEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('xuelu_employees_v1');
      return saved ? JSON.parse(saved) : EMPLOYEES;
    } catch {
      return EMPLOYEES;
    }
  });
  const [allStations, setAllStations] = useState(STATIONS);

  // 門戶中選取檢視的同仁身分
  const [currentEmpId, setCurrentEmpId] = useState('B111014');

  // 全員劃休志願序與存摺狀態
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [ptAvailability, setPtAvailability] = useState(INITIAL_PT_AVAILABILITY);
  const [leaveBalances, setLeaveBalances] = useState(INITIAL_LEAVE_BALANCES);
  const [dailyQuotas, setDailyQuotas] = useState(INITIAL_DAILY_QUOTAS);

  // 調班申請清單與不可抹滅稽核日誌 (支援 localStorage 持久化)
  const [swapRequests, setSwapRequests] = useState(INITIAL_SWAP_REQUESTS);
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('xuelu_audit_logs_v1');
      return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
    } catch {
      return INITIAL_AUDIT_LOGS;
    }
  });

  // 自動同步至 localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem('xuelu_employees_v1', JSON.stringify(allEmployees));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }, [allEmployees]);

  React.useEffect(() => {
    try {
      localStorage.setItem('xuelu_audit_logs_v1', JSON.stringify(auditLogs));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }, [auditLogs]);

  // 調班/手動覆寫層 (Schedule Overrides)
  const [scheduleOverrides, setScheduleOverrides] = useState({});

  // 規則組合
  const currentRules = useMemo(() => ({
    ...DEFAULT_MONTHLY_RULES,
    target_year_month: currentMonth,
    work_hour_model: workHourModel
  }), [currentMonth, workHourModel]);

  // 離職名冊（測試用）
  const resignationData = useMemo(() => {
    if (!isResignedActive) return {};
    return {
      'B113028': 20 // 白慧真 9/20 起離職銷假真空
    };
  }, [isResignedActive]);

  // 將劃休志願轉換為排班引擎識別的 leaveRequests
  const engineLeaveRequests = useMemo(() => {
    const list = [];
    preferences.forEach(pref => {
      if (pref.priority === 1) {
        list.push({
          emp_id: pref.emp_id,
          day: pref.day,
          leave_type: pref.leave_type,
          status: 'APPROVED'
        });
      }
    });
    return list;
  }, [preferences]);

  // 執行基礎種子排班演算法
  const [scheduleVersion, setScheduleVersion] = useState(1);
  const baseScheduleResult = useMemo(() => {
    return generateSeedSchedule({
      employees: allEmployees,
      stations: allStations,
      rules: currentRules,
      leaveRequests: engineLeaveRequests,
      monthBorders: MOCK_MONTH_BORDERS,
      resignationData
    });
  }, [allEmployees, allStations, currentRules, engineLeaveRequests, resignationData, scheduleVersion]);

  // 合併種子排班與調班/實勤覆寫層 -> 產出最終生效排班矩陣
  const effectiveScheduleMap = useMemo(() => {
    const merged = JSON.parse(JSON.stringify(baseScheduleResult.scheduleMap));
    Object.entries(scheduleOverrides).forEach(([empId, days]) => {
      if (!merged[empId]) merged[empId] = {};
      Object.entries(days).forEach(([d, shift]) => {
        merged[empId][d] = {
          ...(merged[empId][d] || {}),
          ...shift
        };
      });
    });
    return merged;
  }, [baseScheduleResult.scheduleMap, scheduleOverrides]);

  const scheduleResult = useMemo(() => ({
    ...baseScheduleResult,
    scheduleMap: effectiveScheduleMap
  }), [baseScheduleResult, effectiveScheduleMap]);

  // 執行法規稽核
  const validation = useMemo(() => {
    return validateScheduleCompliance({
      scheduleMap: effectiveScheduleMap,
      employees: allEmployees,
      stations: allStations,
      rules: currentRules,
      monthBorders: MOCK_MONTH_BORDERS
    });
  }, [effectiveScheduleMap, allEmployees, allStations, currentRules]);

  const handleRunEngine = useCallback(() => {
    setScheduleVersion(v => v + 1);
  }, []);

  const handleToggleResignation = useCallback(() => {
    setIsResignedActive(v => !v);
  }, []);

  const handleSavePreferences = useCallback((empId, updatedPrefsForEmp) => {
    setPreferences(prev => {
      const otherEmpPrefs = prev.filter(p => p.emp_id !== empId);
      return [...otherEmpPrefs, ...updatedPrefsForEmp];
    });
  }, []);

  const handleSavePtAvailability = useCallback((empId, updatedAvailForEmp) => {
    setPtAvailability(prev => ({
      ...prev,
      [empId]: updatedAvailForEmp
    }));
  }, []);

  // 新增換班申請
  const handleAddSwapRequest = useCallback((newSwap) => {
    setSwapRequests(prev => [newSwap, ...prev]);
  }, []);

  // 第一階初審核決
  const handleFirstReview = useCallback((swapId, isApproved) => {
    setSwapRequests(prev => prev.map(req => {
      if (req.swap_id !== swapId) return req;
      return {
        ...req,
        status: isApproved ? 'PENDING_FINAL_REVIEW' : 'REJECTED',
        first_review: {
          ...req.first_review,
          status: isApproved ? 'APPROVED' : 'REJECTED',
          reviewed_at: new Date().toISOString()
        }
      };
    }));
  }, []);

  // 第二階終審核決（核准時自動執行對調，並生成前後雙快照 Audit Log）
  const handleFinalApprove = useCallback((swapId, isApproved) => {
    const req = swapRequests.find(r => r.swap_id === swapId);
    if (!req) return;

    if (isApproved) {
      const beforeSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));

      const appShift = effectiveScheduleMap[req.applicant_id]?.[req.applicant_day];
      const tarShift = effectiveScheduleMap[req.target_id]?.[req.target_day];

      const newOverrides = { ...scheduleOverrides };
      if (!newOverrides[req.applicant_id]) newOverrides[req.applicant_id] = {};
      if (!newOverrides[req.target_id]) newOverrides[req.target_id] = {};

      newOverrides[req.applicant_id][req.applicant_day] = tarShift ? { ...tarShift, note: `與 ${req.target_name} 換班` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
      newOverrides[req.target_id][req.target_day] = appShift ? { ...appShift, note: `與 ${req.applicant_name} 換班` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };

      setScheduleOverrides(newOverrides);

      const afterSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
      afterSnapshot[req.applicant_id][req.applicant_day] = newOverrides[req.applicant_id][req.applicant_day];
      afterSnapshot[req.target_id][req.target_day] = newOverrides[req.target_id][req.target_day];

      const newLog = {
        log_id: `LOG_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action_type: 'SHIFT_SWAP',
        operator_id: currentUser ? currentUser.emp_id : 'B111014',
        operator_name: currentUser ? currentUser.name : '林慶忠 (營運長)',
        notes: `核准二階調班申請：${req.applicant_name} (9/${req.applicant_day}) ⇄ ${req.target_name} (9/${req.target_day})`,
        before_snapshot: beforeSnapshot,
        after_snapshot: afterSnapshot
      };

      setAuditLogs(prev => [newLog, ...prev]);
    }

    setSwapRequests(prev => prev.map(r => {
      if (r.swap_id !== swapId) return r;
      return {
        ...r,
        status: isApproved ? 'APPROVED' : 'REJECTED',
        final_review: {
          ...r.final_review,
          status: isApproved ? 'APPROVED' : 'REJECTED',
          reviewed_at: new Date().toISOString()
        }
      };
    }));
  }, [swapRequests, effectiveScheduleMap, scheduleOverrides, currentUser]);

  // 主管實勤微調覆核 (HOURS_OVERRIDE 稽核快照與補休連動)
  const handleOverrideHours = useCallback(({ empId, day, actualHours, startTime, endTime, breakHours, diffHours, notes }) => {
    const beforeSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));

    const newOverrides = { ...scheduleOverrides };
    if (!newOverrides[empId]) newOverrides[empId] = {};
    const cur = effectiveScheduleMap[empId]?.[day] || {};
    newOverrides[empId][day] = {
      ...cur,
      actual_hours: actualHours,
      actual_start_time: startTime,
      actual_end_time: endTime,
      actual_break_hours: breakHours,
      actual_diff_hours: diffHours,
      actual_notes: notes
    };
    setScheduleOverrides(newOverrides);

    // 正職同仁自動連動補休增減 (需求 #003)
    if (diffHours && diffHours !== 0) {
      const targetEmp = allEmployees.find(e => e.emp_id === empId);
      if (targetEmp && targetEmp.role !== 'PT') {
        setLeaveBalances(prev => {
          const currentBal = prev[empId] || { annualLeaveDays: 3, compTimeHours: 0 };
          const newComp = Math.max(0, (currentBal.compTimeHours || 0) + diffHours);
          return {
            ...prev,
            [empId]: {
              ...currentBal,
              compTimeHours: newComp
            }
          };
        });
      }
    }

    const afterSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
    if (!afterSnapshot[empId]) afterSnapshot[empId] = {};
    afterSnapshot[empId][day] = newOverrides[empId][day];

    const empName = allEmployees.find(e => e.emp_id === empId)?.name || empId;
    const diffText = diffHours ? ` (差額 ${diffHours >= 0 ? '+' : ''}${diffHours}h)` : '';
    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'HOURS_OVERRIDE',
      operator_id: currentUser ? currentUser.emp_id : 'B111014',
      operator_name: currentUser ? currentUser.name : '林慶忠 (營運長)',
      notes: `覆核實勤工時：${empName} (9/${day}) 調整為 ${actualHours} 小時${diffText}`,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [effectiveScheduleMap, scheduleOverrides, allEmployees, currentUser]);

  // 人事主檔更新
  const handleUpdateEmployee = useCallback((updatedEmp) => {
    setAllEmployees(prev => prev.map(e => e.emp_id === updatedEmp.emp_id ? updatedEmp : e));
  }, []);

  const handleAddEmployee = useCallback((newEmp) => {
    setAllEmployees(prev => [...prev, newEmp]);
  }, []);

  const handleUpdateStationLeader = useCallback((stationId, newLeaderId) => {
    setAllStations(prev => prev.map(st => st.station_id === stationId ? { ...st, leader_emp_id: newLeaderId } : st));
  }, []);

  // 一鍵歷史回滾
  const handleRollback = useCallback((targetLogId) => {
    const targetLog = auditLogs.find(l => l.log_id === targetLogId);
    if (!targetLog || !targetLog.before_snapshot) return;

    const beforeState = JSON.parse(JSON.stringify(effectiveScheduleMap));
    const targetSnapshot = targetLog.before_snapshot;

    setScheduleOverrides(targetSnapshot);

    const rollbackLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'ROLLBACK',
      operator_id: currentUser ? currentUser.emp_id : 'B111014',
      operator_name: currentUser ? currentUser.name : '林慶忠 (營運長)',
      notes: `一鍵回滾班表矩陣至日誌【${targetLogId}】之狀態`,
      before_snapshot: beforeState,
      after_snapshot: targetSnapshot
    };

    setAuditLogs(prev => [rollbackLog, ...prev]);
  }, [auditLogs, effectiveScheduleMap, currentUser]);

  // 登入認證回呼
  const handleLoginSuccess = useCallback((emp) => {
    setCurrentUser(emp);
    setCurrentEmpId(emp.emp_id);
    setActiveTab('MY_DASHBOARD');
    if (emp.is_default_pin) {
      setIsForcedPinChange(true);
      setIsChangePinOpen(true);
    }
  }, []);

  // 登出回呼
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setActiveTab('SCHEDULE');
  }, []);

  // 資安防護：門市現場公用平板 15 分鐘無操作自動登出 (Idle Timeout Guard)
  React.useEffect(() => {
    if (!currentUser) return;

    let timeoutId;
    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 15 分鐘 = 900,000 毫秒
      timeoutId = setTimeout(() => {
        alert('【資安防護通知】系統已閒置超過 15 分鐘，為維護門市資料與帳號安全，已為您自動登出。');
        setCurrentUser(null);
        setActiveTab('SCHEDULE');
      }, 15 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [currentUser]);

  // 修改 6 碼 PIN 密碼成功回呼 (加鹽雜湊存儲，徹底移除明文 pin_code)
  const handleChangePinSuccess = useCallback((empId, newPinHash, newSalt) => {
    const targetEmp = allEmployees.find(e => e.emp_id === empId);
    setAllEmployees(prev => prev.map(e => {
      if (e.emp_id === empId) {
        // 解構剔除 pin_code，儲存 salt 與 pin_hash
        const { pin_code, ...safeEmp } = e;
        return {
          ...safeEmp,
          salt: newSalt,
          pin_hash: newPinHash,
          is_default_pin: false,
          failed_attempts: 0,
          lock_until: null
        };
      }
      return e;
    }));

    setCurrentUser(prev => {
      if (!prev) return null;
      const { pin_code, ...safePrev } = prev;
      return {
        ...safePrev,
        salt: newSalt,
        pin_hash: newPinHash,
        is_default_pin: false
      };
    });

    setIsChangePinOpen(false);
    setIsForcedPinChange(false);

    // 寫入不可抹滅之 Audit Log 留下安全異動記錄
    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'PASSWORD_CHANGE',
      operator_id: empId,
      operator_name: targetEmp?.name || empId,
      notes: `同仁【${targetEmp?.name || empId}】已成功自訂設定新 6 碼 PIN 密碼（已完成 Salted SHA-256 加密存儲）`,
      before_snapshot: null,
      after_snapshot: null
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [allEmployees]);

  // 重設測試展示資料回出廠值
  const handleResetDemoData = useCallback(() => {
    if (window.confirm('確定要將所有帳號密碼與人事主檔重設回系統出廠預設值嗎？')) {
      localStorage.removeItem('xuelu_employees_v1');
      localStorage.removeItem('xuelu_audit_logs_v1');
      setAllEmployees(EMPLOYEES);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      alert('已成功重設為初始預設值！所有帳號密碼已還原為 000000。');
    }
  }, []);

  // 匯出當前同仁之 .ics 手機日曆
  const activeEmployee = allEmployees.find(e => e.emp_id === (currentUser ? currentUser.emp_id : currentEmpId)) || allEmployees[0];
  const handleExportMyIcs = useCallback(() => {
    exportEmployeeToIcs({
      employee: activeEmployee,
      scheduleMap: effectiveScheduleMap,
      stations: allStations,
      yearMonth: currentMonth
    });
  }, [activeEmployee, effectiveScheduleMap, allStations, currentMonth]);

  // 匯出全館班表 CSV
  const handleExportStoreCsv = useCallback(() => {
    exportScheduleToCsv({
      scheduleMap: effectiveScheduleMap,
      employees: allEmployees,
      stations: allStations,
      rules: currentRules
    });
  }, [effectiveScheduleMap, allEmployees, allStations, currentRules]);

  // 若未登入，顯示個人登入入口
  if (!currentUser) {
    return (
      <LoginView
        employees={allEmployees}
        onLoginSuccess={handleLoginSuccess}
        onResetDemoData={handleResetDemoData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* 頂部導航 */}
      <Header
        currentUser={currentUser}
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        workHourModel={workHourModel}
        onModelChange={setWorkHourModel}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenChangePin={() => { setIsForcedPinChange(false); setIsChangePinOpen(true); }}
        onLogout={handleLogout}
        isValid={validation.isValid}
      />

      {/* 主工作區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 0: 我的專屬工作台 (Personal Dashboard) */}
        {activeTab === 'MY_DASHBOARD' && (
          <MyDashboard
            currentUser={currentUser}
            scheduleMap={effectiveScheduleMap}
            stations={allStations}
            leaveBalances={leaveBalances}
            swapRequests={swapRequests}
            rules={currentRules}
            onExportMyIcs={handleExportMyIcs}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 1: 全館排班總表 (Schedule Matrix) */}
        {activeTab === 'SCHEDULE' && (
          <>
            <EngineDebugger
              onRunEngine={handleRunEngine}
              metrics={scheduleResult}
              validation={validation}
              rules={currentRules}
              isResignedActive={isResignedActive}
              onToggleResignation={handleToggleResignation}
            />

            <AnomalyAlertBanner
              validation={validation}
              stations={allStations}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />

            <StationStatusOverview
              stations={allStations}
              validation={validation}
              selectedDay={selectedDay}
            />

            <ScheduleTable
              scheduleResult={scheduleResult}
              validation={validation}
              employees={allEmployees}
              stations={allStations}
              rules={currentRules}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onExportIcs={handleExportMyIcs}
              onExportCsv={handleExportStoreCsv}
            />

            <CompliancePanel
              validation={validation}
              rules={currentRules}
            />
          </>
        )}

        {/* TAB 2: 同仁志願劃休 / 報班門戶 */}
        {activeTab === 'LEAVE_PORTAL' && (
          <>
            <EmployeeSelector
              employees={allEmployees}
              currentEmpId={currentEmpId}
              onSelectEmp={setCurrentEmpId}
              leaveBalances={leaveBalances}
            />

            {activeEmployee.is_self_scheduled ? (
              <div className="bg-white rounded-xl border border-purple-200 p-8 text-center shadow-sm">
                <div className="w-14 h-14 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
                  ★
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  營運高階主管自主排班模式 (Executive Self-Scheduling)
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  依據企劃案第 34-37 條規範，高階主管出勤排定不歸站點組長管轄，豁免每月自選休上限與 Daily_Quotas 限制，不佔用現場同仁配額。請於全月大排班表中直接自主填入。
                </p>
              </div>
            ) : activeEmployee.role === 'PT' ? (
              <PtAvailabilityPicker
                employee={activeEmployee}
                availability={ptAvailability}
                rules={currentRules}
                dailyQuotas={dailyQuotas}
                onSaveAvailability={handleSavePtAvailability}
              />
            ) : (
              <RegularStaffPicker
                employee={activeEmployee}
                preferences={preferences}
                allPreferences={preferences}
                dailyQuotas={dailyQuotas}
                rules={currentRules}
                leaveBalance={leaveBalances[currentEmpId] || { annualLeaveDays: 0, compTimeHours: 0 }}
                onSavePreferences={handleSavePreferences}
              />
            )}
          </>
        )}

        {/* TAB 3: 主管劃休衝突透視鏡 */}
        {activeTab === 'CONFLICTS' && (
          <LeaveConflictInspector
            preferences={preferences}
            dailyQuotas={dailyQuotas}
            employees={allEmployees}
            rules={currentRules}
          />
        )}

        {/* TAB 4: 調班申請與二階審核 */}
        {activeTab === 'SWAPS' && (
          <ShiftSwapPortal
            employees={allEmployees}
            stations={allStations}
            rules={currentRules}
            scheduleMap={effectiveScheduleMap}
            swapRequests={swapRequests}
            onAddSwapRequest={handleAddSwapRequest}
            onFirstReview={handleFirstReview}
            onFinalApprove={handleFinalApprove}
            currentEmpId={currentUser.emp_id}
          />
        )}

        {/* TAB 5: 主管實勤微調覆核 (HOURS_OVERRIDE) */}
        {activeTab === 'HOURS_OVERRIDE' && (
          <ActualHoursOverride
            employees={allEmployees}
            stations={allStations}
            scheduleMap={effectiveScheduleMap}
            onOverrideHours={handleOverrideHours}
          />
        )}

        {/* TAB 6: 人事主檔動態管理 (Personnel Admin) */}
        {activeTab === 'PERSONNEL' && (
          <PersonnelManagement
            employees={allEmployees}
            stations={allStations}
            onUpdateEmployee={handleUpdateEmployee}
            onAddEmployee={handleAddEmployee}
            onUpdateStationLeader={handleUpdateStationLeader}
          />
        )}

        {/* TAB 7: 全年度國定假日調移 120 天平帳 */}
        {activeTab === 'HOLIDAY_TRANSFER' && (
          <AnnualHolidayTransfer
            employees={allEmployees}
          />
        )}

        {/* TAB 8: 排班公平性量化指標與 AI 調優 */}
        {activeTab === 'FAIRNESS' && (
          <FairnessMetricsPanel
            employees={allEmployees}
            scheduleMap={effectiveScheduleMap}
            stations={allStations}
            rules={currentRules}
          />
        )}

        {/* TAB 9: 稽核快照與回滾中心 */}
        {activeTab === 'AUDIT_LOGS' && (
          <AuditLogsPanel
            auditLogs={auditLogs}
            onRollback={handleRollback}
          />
        )}
      </main>

      {/* 6 碼 PIN 密碼修改彈窗 */}
      <ChangePasswordModal
        employee={currentUser}
        isOpen={isChangePinOpen}
        isForced={isForcedPinChange}
        onClose={() => setIsChangePinOpen(false)}
        onChangePinSuccess={handleChangePinSuccess}
      />

      {/* 底部資訊 */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        學旅營運處多站點智慧排班與勞基法合規審查系統 · 全架構基礎工程完工定案版 (V2.3)
      </footer>
    </div>
  );
}
