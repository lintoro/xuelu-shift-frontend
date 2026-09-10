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
import MonthlySettlementPanel from './components/MonthlySettlement/MonthlySettlementPanel.jsx';
import ShiftMasterManagement from './components/Admin/ShiftMasterManagement.jsx';
import GasConnectionModal from './components/Cloud/GasConnectionModal.jsx';
import SchedulingTimelineStepper from './components/Timeline/SchedulingTimelineStepper.jsx';

import { ApiService } from './services/apiService.js';
import { DEFAULT_SHIFT_TYPES } from './types/scheduler.js';
import { STATIONS, EMPLOYEES, DEFAULT_MONTHLY_RULES, MOCK_MONTH_BORDERS } from './data/mockMasterData.js';
import {
  INITIAL_LEAVE_BALANCES,
  INITIAL_DAILY_QUOTAS,
  INITIAL_PREFERENCES,
  INITIAL_PT_AVAILABILITY,
  INITIAL_PASSBOOK_TRANSACTIONS
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

  // 雲端連線與同步狀態 (Issue #015)
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(() => ApiService.isCloudMode());

  // 全月排班生命週期時限排程狀態 (Issue #016)
  const [currentSimulatedDate, setCurrentSimulatedDate] = useState('2026-09-10');

  const [activeTab, setActiveTab] = useState('MY_DASHBOARD');
  const [currentMonth, setCurrentMonth] = useState('2026-09');
  const [workHourModel, setWorkHourModel] = useState('REGULAR');
  const [selectedDay, setSelectedDay] = useState(1);
  const [isResignedActive, setIsResignedActive] = useState(false);

  // 動態人事主檔 (支援 localStorage 本機持久化，升級 v2 校正 Admin Manager/Staff)
  const [allEmployees, setAllEmployees] = useState(() => {
    try {
      const saved = localStorage.getItem('xuelu_employees_v2') || localStorage.getItem('xuelu_employees_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(e => {
          if (e.emp_id === 'B111155') return { ...e, role: 'Manager', is_admin: true, is_self_scheduled: true };
          if (e.emp_id === 'B111014') return { ...e, role: 'Staff', is_admin: true, is_self_scheduled: false };
          return e;
        });
      }
      return EMPLOYEES;
    } catch {
      return EMPLOYEES;
    }
  });
  const [allStations, setAllStations] = useState(STATIONS);

  // 門戶中選取檢視的同仁身分
  const [currentEmpId, setCurrentEmpId] = useState('B111155');

  // 全員劃休志願序與存摺狀態
  const [preferences, setPreferences] = useState(INITIAL_PREFERENCES);
  const [ptAvailability, setPtAvailability] = useState(INITIAL_PT_AVAILABILITY);
  const [leaveBalances, setLeaveBalances] = useState(INITIAL_LEAVE_BALANCES);
  const [dailyQuotas, setDailyQuotas] = useState(INITIAL_DAILY_QUOTAS);
  const [passbookTransactions, setPassbookTransactions] = useState(INITIAL_PASSBOOK_TRANSACTIONS);

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
      localStorage.setItem('xuelu_employees_v2', JSON.stringify(allEmployees));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }, [allEmployees]);

  // 國定假日出勤調移同意紀錄 (服務業免雙薪法律閉環，支援 localStorage 持久化)
  const [holidayConsents, setHolidayConsents] = useState(() => {
    try {
      const saved = localStorage.getItem('xuelu_holiday_consents_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('xuelu_holiday_consents_v1', JSON.stringify(holidayConsents));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }, [holidayConsents]);

  const handleSignHolidayConsent = useCallback((consentKey, consentData) => {
    setHolidayConsents(prev => ({
      ...prev,
      [consentKey]: consentData
    }));

    // 寫入不可抹滅稽核軌跡
    setAuditLogs(prev => [{
      log_id: `LOG_HOLIDAY_CONSENT_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'HOLIDAY_CONSENT_SIGNED',
      operator_id: consentData.emp_id,
      operator_name: consentData.emp_name,
      notes: `同仁【${consentData.emp_name}】完成國定假日【${consentData.holiday_name} (${consentData.holiday_date})】出勤調移同意書簽署（指定調移休假日: ${consentData.transferred_off_date}，出勤日按正常工時給薪，依法免計雙薪）。`
    }, ...prev]);
  }, []);

  // 營業班別動態主檔 (需求 #008 Manager 專屬規劃與自訂維護)
  const [shiftTypes, setShiftTypes] = useState(() => {
    try {
      const saved = localStorage.getItem('xuelu_shift_types_v1');
      return saved ? JSON.parse(saved) : DEFAULT_SHIFT_TYPES;
    } catch {
      return DEFAULT_SHIFT_TYPES;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('xuelu_shift_types_v1', JSON.stringify(shiftTypes));
    } catch (e) {
      console.warn('localStorage save failed', e);
    }
  }, [shiftTypes]);

  // 調班/手動覆寫層 (Schedule Overrides)
  const [scheduleOverrides, setScheduleOverrides] = useState({});

  // 月底考勤結算發布狀態與全員簽認記錄 (需求 #004 雙確認閉環機制)
  const [isSettlementPublished, setIsSettlementPublished] = useState(false);
  const [signOffList, setSignOffList] = useState({});

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

  // 執行基礎種子排班演算法與雲端班表狀態
  const [scheduleVersion, setScheduleVersion] = useState(1);
  const [cloudScheduleMap, setCloudScheduleMap] = useState(null);

  const baseScheduleResult = useMemo(() => {
    // 若雲端已有真實班表，優先使用雲端班表；否則使用演算法生成之種子班表
    if (cloudScheduleMap && Object.keys(cloudScheduleMap).length > 0) {
      return {
        scheduleMap: cloudScheduleMap,
        totalDays: currentRules.days_in_month || 30,
        durationMs: 0
      };
    }

    return generateSeedSchedule({
      employees: allEmployees,
      stations: allStations,
      rules: currentRules,
      leaveRequests: engineLeaveRequests,
      monthBorders: MOCK_MONTH_BORDERS,
      resignationData
    });
  }, [cloudScheduleMap, allEmployees, allStations, currentRules, engineLeaveRequests, resignationData, scheduleVersion]);

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
    setCloudScheduleMap(null); // 清除雲端鎖定，重新跑演算法
    setScheduleVersion(v => v + 1);
    alert('🚀 啟發式排班引擎運算完成！已自動根據 7休1 與 9大站點人力配額產生合規最佳化班表。若滿意此結果，請點擊「☁️ 儲存至 Google 試算表」！');
  }, []);

  // 一鍵發布並儲存全月班表至 Google 試算表 (Schedules 頁籤)
  const handleSaveScheduleToCloud = useCallback(async () => {
    if (!ApiService.isCloudMode()) {
      alert('【提示】目前處於本地沙盒模式。請先點擊上方「🟡 本地沙盒」配置 Google Apps Script 網址，即可直連儲存至 Google 試算表！');
      setIsCloudModalOpen(true);
      return;
    }

    const confirmSave = window.confirm(`確定要將【${currentMonth}】全館 ${allEmployees.length} 位同仁的排班結果，發布並寫入 Google 試算表 (Schedules 頁籤) 嗎？`);
    if (!confirmSave) return;

    try {
      const res = await ApiService.saveScheduleMatrix(currentMonth, effectiveScheduleMap);
      if (res && res.success) {
        alert(`✅ 成功！【${currentMonth}】班表已全量寫入 Google 試算表 Schedules 頁籤（共 ${allEmployees.length} 位人員資料）。`);
        // 寫入稽核日誌
        const newLog = {
          log_id: `LOG_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action_type: 'SCHEDULE_PUBLISHED_TO_CLOUD',
          operator_id: currentUser ? currentUser.emp_id : 'B111155',
          operator_name: currentUser ? currentUser.name : '管理員',
          notes: `主管發布【${currentMonth}】排班表至 Google 試算表雲端資料庫`,
          before_snapshot: null,
          after_snapshot: null
        };
        setAuditLogs(prev => [newLog, ...prev]);
      } else {
        alert(`⚠️ 儲存失敗：${res?.error || '請檢查 Google 試算表連線狀態或稍後再試'}`);
      }
    } catch (err) {
      console.error('儲存排班至雲端失敗:', err);
      alert(`❌ 儲存時發生錯誤：${err.message}`);
    }
  }, [currentMonth, allEmployees.length, effectiveScheduleMap, currentUser]);

  const handleToggleResignation = useCallback(() => {
    setIsResignedActive(v => !v);
  }, []);

  const handleSavePreferences = useCallback((empId, updatedPrefsForEmp) => {
    // 比對特休與補休排定變動 (需求 #006 方案 A)
    const prevMyPrefs = preferences.filter(p => p.emp_id === empId && p.priority === 1);
    const newMyPrefs = updatedPrefsForEmp.filter(p => p.priority === 1);

    const prevAlDays = prevMyPrefs.filter(p => p.leave_type === 'AL').length;
    const newAlDays = newMyPrefs.filter(p => p.leave_type === 'AL').length;
    const alDiff = newAlDays - prevAlDays;

    const prevCtCount = prevMyPrefs.filter(p => p.leave_type === 'CT').length;
    const newCtCount = newMyPrefs.filter(p => p.leave_type === 'CT').length;
    const ctHoursDiff = (newCtCount - prevCtCount) * 8;

    if (alDiff !== 0 || ctHoursDiff !== 0) {
      setLeaveBalances(prev => {
        const cur = prev[empId] || { annualLeaveDays: 0, compTimeHours: 0 };
        return {
          ...prev,
          [empId]: {
            ...cur,
            annualLeaveDays: Math.max(0, cur.annualLeaveDays - alDiff),
            compTimeHours: Math.max(0, cur.compTimeHours - ctHoursDiff)
          }
        };
      });

      if (alDiff > 0) {
        setPassbookTransactions(prev => [{
          tx_id: `TX_${Date.now()}_AL`,
          emp_id: empId,
          category: 'ANNUAL_LEAVE',
          date: '2026-09-01',
          action: 'DEDUCT',
          title: `預排班表排定法定特休 (-${alDiff} 天)`,
          amount: -alDiff,
          unit: '天',
          balance_after: Math.max(0, (leaveBalances[empId]?.annualLeaveDays || 0) - alDiff),
          ref_no: 'LEAVE_PREF_AL',
          notes: '月前志願序劃休預先排定法定特休全日'
        }, ...prev]);
      }

      if (ctHoursDiff > 0) {
        setPassbookTransactions(prev => [{
          tx_id: `TX_${Date.now()}_CT`,
          emp_id: empId,
          category: 'COMP_TIME',
          date: '2026-09-01',
          action: 'DEDUCT',
          title: `預排班表排定彈性補休 (-${ctHoursDiff} 小時)`,
          amount: -ctHoursDiff,
          unit: '小時',
          balance_after: Math.max(0, (leaveBalances[empId]?.compTimeHours || 0) - ctHoursDiff),
          ref_no: 'LEAVE_PREF_CT',
          notes: '月前志願序劃休預先排定彈性補休全日(8h)'
        }, ...prev]);
      }
    }

    setPreferences(prev => {
      const otherEmpPrefs = prev.filter(p => p.emp_id !== empId);
      return [...otherEmpPrefs, ...updatedPrefsForEmp];
    });
  }, [preferences, leaveBalances]);

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
  const handleFinalApprove = useCallback((swapId, isApproved, meta = {}) => {
    const req = swapRequests.find(r => r.swap_id === swapId);
    if (!req) return;

    const isAdminArchived = !!meta.is_admin_archived || !!req.is_manager_self_declared;

    if (isApproved) {
      const beforeSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
      const newOverrides = { ...scheduleOverrides };

      if (req.type === 'SELF_RESCHEDULE') {
        // 個人自調挪休覆寫
        if (!newOverrides[req.applicant_id]) newOverrides[req.applicant_id] = {};
        const empStation = allEmployees.find(e => e.emp_id === req.applicant_id)?.primary_station || 'ST_SERVICE';

        newOverrides[req.applicant_id][req.applicant_day] = {
          shift_type: 'OFF',
          station_id: null,
          work_hours: 0,
          note: `個人自調轉休 (原出勤日)`
        };

        newOverrides[req.applicant_id][req.target_day] = {
          shift_type: req.target_shift || 'B',
          station_id: empStation,
          work_hours: 8,
          is_support: false,
          note: `自 9/${req.applicant_day} 挪調出勤`
        };

        setScheduleOverrides(newOverrides);

        const afterSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
        if (!afterSnapshot[req.applicant_id]) afterSnapshot[req.applicant_id] = {};
        afterSnapshot[req.applicant_id][req.applicant_day] = newOverrides[req.applicant_id][req.applicant_day];
        afterSnapshot[req.applicant_id][req.target_day] = newOverrides[req.applicant_id][req.target_day];

        const logNotes = isAdminArchived
          ? `【最高主管自主申報 · 行政合規備查歸檔】管理員：${currentUser?.name || 'Admin'}，申報主管：${req.applicant_name} (9/${req.applicant_day} 轉休 ⇄ 9/${req.target_day} 轉出勤 ${req.target_shift}班)`
          : `核准個人自調挪休：${req.applicant_name} (9/${req.applicant_day} 轉休 ⇄ 9/${req.target_day} 轉出勤 ${req.target_shift}班)`;

        const newLog = {
          log_id: `LOG_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action_type: isAdminArchived ? 'SHIFT_SWAP_ADMIN_ARCHIVED' : 'SELF_RESCHEDULE',
          operator_id: currentUser ? currentUser.emp_id : 'B111155',
          operator_name: isAdminArchived ? `${currentUser?.name || 'Admin'} (Admin 備查員)` : (currentUser ? currentUser.name : '陳鵬宇 (營運長)'),
          notes: logNotes,
          before_snapshot: beforeSnapshot,
          after_snapshot: afterSnapshot
        };
        setAuditLogs(prev => [newLog, ...prev]);
      } else {
        // 雙人對調覆寫
        const appShift = effectiveScheduleMap[req.applicant_id]?.[req.applicant_day];
        const tarShift = effectiveScheduleMap[req.target_id]?.[req.target_day];

        if (!newOverrides[req.applicant_id]) newOverrides[req.applicant_id] = {};
        if (!newOverrides[req.target_id]) newOverrides[req.target_id] = {};

        if (req.applicant_day === req.target_day) {
          // 同日對調
          newOverrides[req.applicant_id][req.applicant_day] = tarShift ? { ...tarShift, note: `與 ${req.target_name} 換班` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
          newOverrides[req.target_id][req.target_day] = appShift ? { ...appShift, note: `與 ${req.applicant_name} 換班` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
        } else {
          // 跨日互調：雙方承接對方的出勤日與班別
          newOverrides[req.applicant_id][req.target_day] = tarShift ? { ...tarShift, note: `接替 ${req.target_name} 勤務` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
          newOverrides[req.target_id][req.target_day] = { shift_type: 'OFF', station_id: null, work_hours: 0, note: `由 ${req.applicant_name} 接替出勤` };

          newOverrides[req.target_id][req.applicant_day] = appShift ? { ...appShift, note: `接替 ${req.applicant_name} 勤務` } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
          newOverrides[req.applicant_id][req.applicant_day] = { shift_type: 'OFF', station_id: null, work_hours: 0, note: `由 ${req.target_name} 接替出勤` };
        }

        setScheduleOverrides(newOverrides);

        const afterSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
        if (!afterSnapshot[req.applicant_id]) afterSnapshot[req.applicant_id] = {};
        if (!afterSnapshot[req.target_id]) afterSnapshot[req.target_id] = {};
        afterSnapshot[req.applicant_id][req.applicant_day] = newOverrides[req.applicant_id][req.applicant_day];
        afterSnapshot[req.applicant_id][req.target_day] = newOverrides[req.applicant_id][req.target_day];
        afterSnapshot[req.target_id][req.applicant_day] = newOverrides[req.target_id][req.applicant_day];
        afterSnapshot[req.target_id][req.target_day] = newOverrides[req.target_id][req.target_day];

        const specialText = req.is_special_swap ? `【⚠️特例調班核定】事由: ${req.special_warnings?.join('; ') || '無常規支援/缺Solo'}。` : '';
        const logNotes = isAdminArchived
          ? `【最高主管自主申報 · 行政合規備查歸檔】管理員：${currentUser?.name || 'Admin'}，申報主管：${req.applicant_name} ⇄ ${req.target_name}`
          : `${specialText}核准二階調班申請：${req.applicant_name} (9/${req.applicant_day}) ⇄ ${req.target_name} (9/${req.target_day})`;

        const newLog = {
          log_id: `LOG_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action_type: isAdminArchived ? 'SHIFT_SWAP_ADMIN_ARCHIVED' : (req.is_special_swap ? 'SHIFT_SWAP_SPECIAL' : 'SHIFT_SWAP'),
          operator_id: currentUser ? currentUser.emp_id : 'B111155',
          operator_name: isAdminArchived ? `${currentUser?.name || 'Admin'} (Admin 備查員)` : (currentUser ? currentUser.name : '陳鵬宇 (營運長)'),
          notes: logNotes,
          before_snapshot: beforeSnapshot,
          after_snapshot: afterSnapshot
        };

        setAuditLogs(prev => [newLog, ...prev]);
      }
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

    if (ApiService.isCloudMode()) {
      ApiService.reviewSwap(swapId, isApproved, isAdminArchived ? 'ADMIN_VERIFY' : 'FINAL', meta).catch(e => {
        console.warn('[雲端同步] 調班審核更新失敗:', e);
      });
    }
  }, [swapRequests, effectiveScheduleMap, scheduleOverrides, currentUser]);

  // 主管實勤微調覆核 (HOURS_OVERRIDE 稽核快照與補休/特休連動，支援高管違規強制核實)
  const handleOverrideHours = useCallback(({
    empId,
    day,
    actualHours,
    startTime,
    endTime,
    breakHours,
    diffHours,
    deductionType = 'COMP_TIME',
    notes,
    isLaborViolationOverride = false,
    laborViolations = [],
    overrideManager = null
  }) => {
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
      actual_deduction_type: deductionType,
      actual_notes: notes,
      is_labor_violation_override: isLaborViolationOverride,
      labor_violations: laborViolations,
      override_manager: overrideManager
    };
    setScheduleOverrides(newOverrides);

    // 正職同仁自動連動補休/特休增減與存摺流水紀錄 (需求 #002, #003 & #006 方案 A)
    if (diffHours && diffHours !== 0) {
      const targetEmp = allEmployees.find(e => e.emp_id === empId);
      if (targetEmp && targetEmp.role !== 'PT') {
        const isInc = diffHours > 0;

        if (isInc) {
          // 加班延長：正職自動核轉補休增額
          let updatedComp = 0;
          setLeaveBalances(prev => {
            const currentBal = prev[empId] || { annualLeaveDays: 3, compTimeHours: 0 };
            const newComp = Math.max(0, (currentBal.compTimeHours || 0) + diffHours);
            updatedComp = newComp;
            return {
              ...prev,
              [empId]: { ...currentBal, compTimeHours: newComp }
            };
          });

          const newTx = {
            tx_id: `TX_${Date.now()}`,
            emp_id: empId,
            category: 'COMP_TIME',
            date: `2026-09-${day < 10 ? '0' + day : day}`,
            action: 'INCREASE',
            title: isLaborViolationOverride
              ? `高管強制核定超時出勤 (+${diffHours}h 延長工時認列/意願補休)`
              : `主管實勤覆核延長工時 (+${diffHours}h 延長工時認列/意願補休)`,
            amount: diffHours,
            unit: '小時',
            balance_after: updatedComp,
            ref_no: `OVERRIDE_9${day}`,
            notes: notes || '門市現場實勤覆核延長工時，依法核算加班費或依同仁意願轉入補休'
          };
          setPassbookTransactions(prev => [newTx, ...prev]);
        } else {
          // 工時短少或臨時請假 (diffHours < 0)
          if (deductionType === 'COMP_TIME') {
            let updatedComp = 0;
            setLeaveBalances(prev => {
              const currentBal = prev[empId] || { annualLeaveDays: 3, compTimeHours: 0 };
              const newComp = Math.max(0, (currentBal.compTimeHours || 0) + diffHours);
              updatedComp = newComp;
              return {
                ...prev,
                [empId]: { ...currentBal, compTimeHours: newComp }
              };
            });

            const newTx = {
              tx_id: `TX_${Date.now()}`,
              emp_id: empId,
              category: 'COMP_TIME',
              date: `2026-09-${day < 10 ? '0' + day : day}`,
              action: 'DEDUCT',
              title: `臨時請假小時扣抵彈性補休 (${diffHours}h)`,
              amount: diffHours,
              unit: '小時',
              balance_after: updatedComp,
              ref_no: `OVERRIDE_9${day}`,
              notes: notes || '門市現場實勤短少，扣減彈性補休時數'
            };
            setPassbookTransactions(prev => [newTx, ...prev]);
          } else if (deductionType === 'ANNUAL_LEAVE') {
            // 特休小時沖抵 (8小時折算1天)
            const daysDeducted = Math.abs(diffHours) / 8;
            let updatedAnnualDays = 0;
            setLeaveBalances(prev => {
              const currentBal = prev[empId] || { annualLeaveDays: 3, compTimeHours: 0 };
              const newDays = Math.max(0, Number(((currentBal.annualLeaveDays || 0) - daysDeducted).toFixed(2)));
              updatedAnnualDays = newDays;
              return {
                ...prev,
                [empId]: { ...currentBal, annualLeaveDays: newDays }
              };
            });

            const newTx = {
              tx_id: `TX_${Date.now()}`,
              emp_id: empId,
              category: 'ANNUAL_LEAVE',
              date: `2026-09-${day < 10 ? '0' + day : day}`,
              action: 'DEDUCT',
              title: `臨時請假扣抵法定特休 (${diffHours}h · 沖抵 -${daysDeducted}天)`,
              amount: diffHours,
              unit: '小時',
              balance_after: updatedAnnualDays,
              ref_no: `OVERRIDE_9${day}`,
              notes: notes || '門市現場實勤短少，以小時沖抵法定特休'
            };
            setPassbookTransactions(prev => [newTx, ...prev]);
          }
        }
      }
    }

    const afterSnapshot = JSON.parse(JSON.stringify(effectiveScheduleMap));
    if (!afterSnapshot[empId]) afterSnapshot[empId] = {};
    afterSnapshot[empId][day] = newOverrides[empId][day];

    const empName = allEmployees.find(e => e.emp_id === empId)?.name || empId;
    const diffText = diffHours ? ` (差額 ${diffHours >= 0 ? '+' : ''}${diffHours}h)` : '';
    const deductText = diffHours < 0 ? ` [沖抵方式: ${deductionType === 'COMP_TIME' ? '扣補休(全薪)' :
        deductionType === 'ANNUAL_LEAVE' ? '扣特休(全薪)' :
          deductionType === 'SICK_LEAVE' ? '病假/照顧假(扣半薪)' :
            '事假(扣全薪)'
      }]` : '';

    const logNotes = isLaborViolationOverride
      ? `【⚠️營運高管強制核定超時違規勤務】${empName} (9/${day}) 淨實勤 ${actualHours}h。核定高管: ${currentUser?.name || '陳鵬宇'}。違規事項: ${laborViolations.join('; ')}。現場事由: ${overrideManager?.emergency_reason || ''}`
      : `覆核實勤工時：${empName} (9/${day}) 調整為 ${actualHours} 小時${diffText}${deductText}`;

    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: isLaborViolationOverride ? 'HOURS_OVERRIDE_VIOLATION' : 'HOURS_OVERRIDE',
      operator_id: currentUser ? currentUser.emp_id : 'B111155',
      operator_name: currentUser ? currentUser.name : '陳鵬宇 (營運長)',
      notes: logNotes,
      before_snapshot: beforeSnapshot,
      after_snapshot: afterSnapshot
    };
    setAuditLogs(prev => [newLog, ...prev]);

    if (ApiService.isCloudMode()) {
      ApiService.overrideWorkHours({
        year_month: currentMonth,
        emp_id: empId,
        day: day,
        actual_hours: actualHours,
        actual_start_time: startTime,
        actual_end_time: endTime,
        actual_break_hours: breakHours,
        actual_diff_hours: diffHours,
        actual_deduction_type: deductionType,
        is_labor_violation_override: isLaborViolationOverride,
        actual_notes: notes
      }).catch(e => {
        console.warn('[雲端同步] 實勤覆核儲存失敗:', e);
      });
    }
  }, [effectiveScheduleMap, scheduleOverrides, allEmployees, currentUser, leaveBalances, currentMonth]);

  // 發布月底出勤確認通知 (需求 #004 雙確認閉環機制)
  const handlePublishSettlement = useCallback(() => {
    setIsSettlementPublished(true);
    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'MONTHLY_SETTLEMENT_PUBLISH',
      operator_id: currentUser ? currentUser.emp_id : 'B111155',
      operator_name: currentUser ? currentUser.name : '陳鵬宇 (營運長)',
      notes: `正式發布 ${currentRules.target_year_month || '2026-09'} 月底實勤定稿班表與全員到班雙確認通知`,
      before_snapshot: null,
      after_snapshot: null
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [currentUser, currentRules]);

  // 同仁完成實勤電子簽認
  const handleEmployeeSignOff = useCallback((empId) => {
    const emp = allEmployees.find(e => e.emp_id === empId);
    const nowIso = new Date().toLocaleString('zh-TW', { hour12: false });
    setSignOffList(prev => ({
      ...prev,
      [empId]: {
        emp_id: empId,
        emp_name: emp?.name || empId,
        signed_at: nowIso,
        status: 'CONFIRMED'
      }
    }));
    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'EMPLOYEE_SIGNOFF',
      operator_id: empId,
      operator_name: emp?.name || empId,
      notes: `同仁完成月底實勤定稿班表電子簽署確認 (${nowIso})`,
      before_snapshot: null,
      after_snapshot: null
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [allEmployees]);

  // ==========================================
  // 雲端雙向同步機制 (Issue #015: Google Sheets & GAS)
  // ==========================================
  // 從 Google 試算表拉取最新全量資料
  const handlePullFromCloud = useCallback(async () => {
    try {
      const data = await ApiService.getInitialMasterData(currentMonth);
      if (!data) return false;

      if (data.employees && Array.isArray(data.employees) && data.employees.length > 0) {
        setAllEmployees(data.employees);
      }
      if (data.stations && Array.isArray(data.stations) && data.stations.length > 0) {
        setAllStations(data.stations);
      }
      if (data.shiftTypes && Array.isArray(data.shiftTypes) && data.shiftTypes.length > 0) {
        const shiftsObj = {};
        data.shiftTypes.forEach(st => { shiftsObj[st.code] = st; });
        setShiftTypes(shiftsObj);
      }
      if (data.scheduleMap && typeof data.scheduleMap === 'object' && Object.keys(data.scheduleMap).length > 0) {
        setCloudScheduleMap(data.scheduleMap);
      }
      if (data.swaps && Array.isArray(data.swaps)) {
        setSwapRequests(data.swaps);
      }
      if (data.overrides && typeof data.overrides === 'object') {
        setScheduleOverrides(data.overrides);
      }
      if (data.passbooks && Array.isArray(data.passbooks)) {
        setPassbookTransactions(data.passbooks);
      }
      if (data.auditLogs && Array.isArray(data.auditLogs)) {
        setAuditLogs(data.auditLogs);
      }

      setIsCloudMode(true);
      return true;
    } catch (err) {
      console.error('從雲端試算表拉取失敗:', err);
      return false;
    }
  }, [currentMonth]);

  // 一鍵全量同步本地沙盒狀態至 Google 試算表
  const handlePushToCloud = useCallback(async () => {
    try {
      const payload = {
        yearMonth: currentMonth,
        employees: allEmployees,
        stations: allStations,
        shiftTypes: Object.values(shiftTypes),
        scheduleMap: effectiveScheduleMap
      };
      const res = await ApiService.syncAllToCloud(payload);
      setIsCloudMode(true);
      return res && res.success;
    } catch (err) {
      console.error('全量備份推送至雲端試算表失敗:', err);
      return false;
    }
  }, [currentMonth, allEmployees, allStations, shiftTypes, effectiveScheduleMap]);

  // 人事主檔更新
  const handleUpdateEmployee = useCallback((updatedEmp) => {
    setAllEmployees(prev => prev.map(e => e.emp_id === updatedEmp.emp_id ? updatedEmp : e));
    if (ApiService.isCloudMode()) {
      ApiService.savePersonnel(updatedEmp).catch(e => console.warn('[雲端同步] 人事主檔更新失敗:', e));
    }
  }, []);

  const handleAddEmployee = useCallback((newEmp) => {
    setAllEmployees(prev => [...prev, newEmp]);
    if (ApiService.isCloudMode()) {
      ApiService.savePersonnel(newEmp).catch(e => console.warn('[雲端同步] 新增同仁失敗:', e));
    }
  }, []);

  const handleUpdateStationLeader = useCallback((stationId, newLeaderId) => {
    setAllStations(prev => prev.map(st => st.station_id === stationId ? { ...st, leader_emp_id: newLeaderId } : st));
  }, []);

  // 營業班別主檔管理回呼 (需求 #008 Manager 專屬規劃與稽核日誌連動)
  const handleSaveShiftType = useCallback((newShift) => {
    const beforeState = JSON.parse(JSON.stringify(shiftTypes));
    const nextShiftTypes = {
      ...shiftTypes,
      [newShift.code]: newShift
    };
    setShiftTypes(nextShiftTypes);

    if (ApiService.isCloudMode()) {
      ApiService.saveShiftTypes(Object.values(nextShiftTypes)).catch(e => console.warn('[雲端同步] 班別更新失敗:', e));
    }

    const operatorName = currentUser ? currentUser.name : '陳鵬宇 (營運長)';
    const operatorId = currentUser ? currentUser.emp_id : 'B111155';
    const isNew = !shiftTypes[newShift.code];

    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: isNew ? 'CREATE_SHIFT_TYPE' : 'UPDATE_SHIFT_TYPE',
      operator_id: operatorId,
      operator_name: operatorName,
      notes: `主管【${operatorName}】${isNew ? '新增' : '更新'}營業班別【${newShift.code} - ${newShift.name}】(${newShift.startTime}~${newShift.endTime}，實勤 ${newShift.workHours}h)`,
      before_snapshot: beforeState,
      after_snapshot: nextShiftTypes
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [shiftTypes, currentUser]);

  const handleDeleteShiftType = useCallback((shiftCode) => {
    const beforeState = JSON.parse(JSON.stringify(shiftTypes));
    setShiftTypes(prev => {
      const copy = { ...prev };
      delete copy[shiftCode];
      return copy;
    });

    const operatorName = currentUser ? currentUser.name : '陳鵬宇 (營運長)';
    const operatorId = currentUser ? currentUser.emp_id : 'B111155';

    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'DELETE_SHIFT_TYPE',
      operator_id: operatorId,
      operator_name: operatorName,
      notes: `主管【${operatorName}】刪除營業自訂班別【${shiftCode}】`,
      before_snapshot: beforeState,
      after_snapshot: null
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [shiftTypes, currentUser]);

  const handleResetShiftTypes = useCallback(() => {
    const beforeState = JSON.parse(JSON.stringify(shiftTypes));
    localStorage.removeItem('xuelu_shift_types_v1');
    setShiftTypes(DEFAULT_SHIFT_TYPES);

    const operatorName = currentUser ? currentUser.name : '陳鵬宇 (營運長)';
    const operatorId = currentUser ? currentUser.emp_id : 'B111155';

    const newLog = {
      log_id: `LOG_${Date.now()}`,
      timestamp: new Date().toISOString(),
      action_type: 'RESET_SHIFT_TYPES',
      operator_id: operatorId,
      operator_name: operatorName,
      notes: `主管【${operatorName}】重設營業班別主檔回原廠出廠設定`,
      before_snapshot: beforeState,
      after_snapshot: DEFAULT_SHIFT_TYPES
    };
    setAuditLogs(prev => [newLog, ...prev]);
  }, [shiftTypes, currentUser]);

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
      operator_id: currentUser ? currentUser.emp_id : 'B111155',
      operator_name: currentUser ? currentUser.name : '陳鵬宇 (營運長)',
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

  // 業務角色權限判定
  const isManager = currentUser.role === 'Manager';
  const isAdmin = !!currentUser.is_admin;
  const isLeader = currentUser.role === 'Leader';
  const isStaff = currentUser.role === 'Staff';
  const isPT = currentUser.role === 'PT';
  // 是否具備全館或站點排班調度權（Manager/Admin 具備全域調度權，Leader 具備本組調度權；PT 與 Staff 無調班調度權）
  const canManageShifts = isManager || isAdmin || isLeader;

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
        onOpenCloudModal={() => setIsCloudModalOpen(true)}
        isCloudMode={isCloudMode}
        isValid={validation.isValid}
      />

      {/* 主工作區 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 全月排班生命週期時限排程狀態看板 (Issue #016) */}
        <SchedulingTimelineStepper
          currentSimulatedDate={currentSimulatedDate}
          onSimulateDateChange={setCurrentSimulatedDate}
          currentUser={currentUser}
        />

        {/* TAB 0: 我的專屬工作台 (Personal Dashboard) */}
        {activeTab === 'MY_DASHBOARD' && (
          <MyDashboard
            currentUser={currentUser}
            scheduleMap={effectiveScheduleMap}
            stations={allStations}
            leaveBalances={leaveBalances}
            swapRequests={swapRequests}
            rules={currentRules}
            passbookTransactions={passbookTransactions}
            isSettlementPublished={isSettlementPublished}
            signOffList={signOffList}
            holidayConsents={holidayConsents}
            onSignHolidayConsent={handleSignHolidayConsent}
            onSignOff={handleEmployeeSignOff}
            onExportMyIcs={handleExportMyIcs}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* TAB 1: 全館排班總表 (Schedule Matrix) */}
        {activeTab === 'SCHEDULE' && (
          <>
            {/* 僅高階主管 Manager 或 系統管理員 Admin 可檢視與操作演算法引擎除錯 */}
            {(isManager || isAdmin) && (
              <EngineDebugger
                onRunEngine={handleRunEngine}
                metrics={scheduleResult}
                validation={validation}
                rules={currentRules}
                isResignedActive={isResignedActive}
                onToggleResignation={handleToggleResignation}
              />
            )}

            {/* 僅具備排班調度權限之主管 (Manager/Admin 全館，Leader 本組) 顯示排班異常提醒與人力缺口警示看板 */}
            {/* 需求 #009：PT 與 STAFF 無調班調度權，嚴禁在此面板呈現任何排班異常提醒 */}
            {canManageShifts && (
              <AnomalyAlertBanner
                validation={validation}
                stations={allStations}
                employees={allEmployees}
                currentUser={currentUser}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            )}

            {/* 僅具備排班調度權限者顯示 9 大站點人力三級燈號即時檢驗 */}
            {canManageShifts && (
              <StationStatusOverview
                stations={allStations}
                validation={validation}
                selectedDay={selectedDay}
              />
            )}

            {/* 出勤排班大表：全員可見（PT 與 STAFF 聚焦純淨班表，無異常警示干擾） */}
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
              onRunEngine={handleRunEngine}
              onSaveToCloud={handleSaveScheduleToCloud}
              currentUser={currentUser}
              shiftTypes={shiftTypes}
              currentSimulatedDate={currentSimulatedDate}
              holidayConsents={holidayConsents}
            />

            {/* 勞基法合規證明書：僅主管與組長檢視法規審查細項 */}
            {canManageShifts && (
              <CompliancePanel
                validation={validation}
                rules={currentRules}
              />
            )}
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
                currentSimulatedDate={currentSimulatedDate}
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
            currentUser={currentUser}
            shiftTypes={shiftTypes}
          />
        )}

        {/* TAB 5: 主管實勤微調覆核 (HOURS_OVERRIDE) */}
        {activeTab === 'HOURS_OVERRIDE' && (
          <ActualHoursOverride
            employees={allEmployees}
            stations={allStations}
            scheduleMap={effectiveScheduleMap}
            onOverrideHours={handleOverrideHours}
            currentUser={currentUser}
            leaveBalances={leaveBalances}
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
            currentSimulatedDate={currentSimulatedDate}
          />
        )}

        {/* TAB 6-2: 營業班別主檔動態維護 (需求 #008 Manager 專屬規劃) */}
        {activeTab === 'SHIFT_SETTINGS' && (
          <ShiftMasterManagement
            shiftTypes={shiftTypes}
            onSaveShiftType={handleSaveShiftType}
            onDeleteShiftType={handleDeleteShiftType}
            onResetShiftTypes={handleResetShiftTypes}
            currentUser={currentUser}
          />
        )}

        {/* TAB 7: 全年度國定假日專案調移平帳 (年度放假平帳管理) */}
        {activeTab === 'HOLIDAY_TRANSFER' && (
          <AnnualHolidayTransfer
            employees={allEmployees}
            scheduleMap={effectiveScheduleMap}
            currentMonth={currentMonth}
            holidayConsents={holidayConsents}
            onSignHolidayConsent={handleSignHolidayConsent}
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

        {/* TAB 10: 考勤月底結算與實勤雙確認閉環 (需求 #004) */}
        {activeTab === 'MONTHLY_SETTLEMENT' && (
          <MonthlySettlementPanel
            employees={allEmployees}
            stations={allStations}
            scheduleMap={effectiveScheduleMap}
            swapRequests={swapRequests}
            rules={currentRules}
            isSettlementPublished={isSettlementPublished}
            signOffList={signOffList}
            holidayConsents={holidayConsents}
            onPublishSettlement={handlePublishSettlement}
            currentSimulatedDate={currentSimulatedDate}
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

      {/* Google Sheets 與 GAS 雲端連線同步彈窗 (Issue #015) */}
      <GasConnectionModal
        isOpen={isCloudModalOpen}
        onClose={() => {
          setIsCloudModalOpen(false);
          setIsCloudMode(ApiService.isCloudMode());
        }}
        onPullFromCloud={handlePullFromCloud}
        onPushToCloud={handlePushToCloud}
      />

      {/* 底部資訊 */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        學旅營運處多站點智慧排班與勞基法合規審查系統 · Google Sheets 與 GAS 雲端實體驗證版 (V2.5)
      </footer>
    </div>
  );
}
