import React, { useState, useMemo, useEffect } from 'react';
import { 
  Clock, 
  Check, 
  AlertCircle, 
  Sparkles, 
  FileText, 
  Save, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  Calendar,
  X,
  Lock,
  FileCheck,
  Filter,
  Users
} from 'lucide-react';

/**
 * 主管端實勤覆核與工時微調面板 (Hours Override)
 * 依照主管最新法規稽核規範深度重構：
 * 1. 勞基法第 35 條連續在勤累進休息檢核 (滿 4h 需 0.5h、滿 8h 需 1.0h、滿 12h 需 1.5h)
 * 2. 勞基法第 32 條第 2 項單日工時上限 12h (每日加班上限 4h) 獨立紅底嚴重警示卡
 * 3. 營運高管 (Manager / Admin) 依現場實況「三度確認強制放行機制 (Triple-Confirmation Lock)」
 * 4. 自動工時比對：正職自動增減補休時數，PT 結算實際到班工時
 * 5. 日期嚴格防呆：僅開放當日 (含今日之前)，未來未發生日期全面鎖定禁止選取
 * 6. 【主管指示 #013 組織風控權限】：
 *    - 同組限制（不能跳組）：站點組長 (Leader) 僅能覆核同屬站點之基層同仁，禁止跳組。
 *    - 嚴禁自我覆核（不能自己）：任何操作者一律排除本人，避免球員兼裁判之工時舞弊。
 *    - 不得向上（不能跟 MANAGER 向上）：組長不可向上覆核 Manager 或其他組長；組長實勤向上交由 Manager 覆核。
 */
export default function ActualHoursOverride({
  employees,
  stations,
  scheduleMap,
  onOverrideHours,
  currentUser,
  leaveBalances = {}
}) {
  // 業務設定：當前系統營運當日 (9 月 10 日)
  const TODAY_DAY = 10;

  // 角色權限判定
  const isLeader = currentUser?.role === 'Leader';
  const isManager = currentUser?.role === 'Manager' || !!currentUser?.is_admin;

  // 營運高管專用站點快速篩選器
  const [stationFilter, setStationFilter] = useState('ALL');

  // 依主管指示 #013 組織風控層級篩選合格之覆核對象清單
  const reviewableEmployees = useMemo(() => {
    if (!currentUser) return [];

    const isLeader = currentUser?.role === 'Leader';
    const isManager = currentUser?.role === 'Manager' || !!currentUser?.is_admin;
    const isAdmin = !!currentUser?.is_admin;

    return employees.filter(emp => {
      // 1. 利益迴避原則：嚴格排除操作者本人 (不能自己覆核自己)
      if (emp.emp_id === currentUser.emp_id) return false;

      // 2. 排除自排免審高管 (若當前操作者為 Admin 且對象為 Manager，則開放進行行政合規備查歸檔)
      if (emp.is_self_scheduled && !(isAdmin && emp.role === 'Manager')) return false;

      if (isLeader) {
        // 3. 組長同組限制：僅能覆核同主屬站點同仁，禁止跳組
        if (emp.primary_station !== currentUser.primary_station) return false;

        // 4. 組長不得向上覆核：禁止覆核 Manager 或同級 Leader (僅能向下覆核 Staff 與 PT)
        if (emp.role === 'Manager' || emp.role === 'Leader') return false;

        return true;
      }

      if (isManager) {
        // 5. 營運高管統籌覆核 / Admin 備查：可向上覆核各站點組長 (Leader)、全場 Staff / PT，Admin 可備查 Manager
        if (stationFilter !== 'ALL' && emp.primary_station !== stationFilter) {
          return false;
        }
        return true;
      }

      return false;
    });
  }, [employees, currentUser, isLeader, isManager, stationFilter]);

  const [selectedDay, setSelectedDay] = useState(10);
  // 動態預設選取合格名單的第一位同仁 (不再預設李俐旻自己)
  const [selectedEmpId, setSelectedEmpId] = useState(() => {
    return reviewableEmployees[0]?.emp_id || '';
  });
  const [isAbsent, setIsAbsent] = useState(false); // 當日未到勤/全日請假

  // 高管三度確認彈窗控制
  const [isTripleModalOpen, setIsTripleModalOpen] = useState(false);
  const [tripleStep, setTripleStep] = useState(1); // 1: 違規事實確認, 2: 法律責任與報表加註, 3: 緊急事由輸入
  const [hasConfirmedStep1, setHasConfirmedStep1] = useState(false);
  const [hasConfirmedStep2, setHasConfirmedStep2] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState('');

  // 時間選單選項產生器 (每 30 分鐘一刻度)
  const startTimeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00'
  ];

  const endTimeOptions = [
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00'
  ];

  const breakOptions = [
    { value: 0, label: '0 小時 (無休息)' },
    { value: 0.5, label: '0.5 小時 (30 分鐘)' },
    { value: 1, label: '1.0 小時 (60 分鐘)' },
    { value: 1.5, label: '1.5 小時 (90 分鐘)' },
    { value: 2, label: '2.0 小時 (120 分鐘)' }
  ];

  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('19:00');
  const [breakHours, setBreakHours] = useState(1.0);
  const [deductionType, setDeductionType] = useState('COMP_TIME'); // COMP_TIME, ANNUAL_LEAVE, UNPAID (需求 #006 方案 A)
  const [actualNoteInput, setActualNoteInput] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const currentEmp = reviewableEmployees.find(e => e.emp_id === selectedEmpId) || reviewableEmployees[0] || null;
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  const scheduledShift = currentEmp ? scheduleMap[currentEmp.emp_id]?.[selectedDay] : null;
  const scheduledHours = scheduledShift?.work_hours || 0;
  const isPT = currentEmp?.role === 'PT';

  // 取得同仁假勤存摺額度 (特休天數換算為 8 小時/天)
  const empLeaveBalance = (currentEmp && leaveBalances[currentEmp.emp_id]) || { annualLeaveDays: 0, compTimeHours: 0 };
  const availableCompTimeHours = empLeaveBalance.compTimeHours || 0;
  const availableAnnualLeaveDays = empLeaveBalance.annualLeaveDays || 0;
  const availableAnnualLeaveHours = availableAnnualLeaveDays * 8;

  // 時間字串轉小數小時 (如 "08:30" -> 8.5)
  const timeToDecimal = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return h + (m || 0) / 60;
  };

  // 當選擇同仁或日期變更時，依原排班別智能初始化起訖時間
  const syncShiftDefaults = (empId, day) => {
    const s = scheduleMap[empId]?.[day];
    const shiftCode = s?.shift_type;
    if (s?.actual_start_time && s?.actual_end_time) {
      setStartTime(s.actual_start_time);
      setEndTime(s.actual_end_time);
      setBreakHours(s.actual_break_hours !== undefined ? s.actual_break_hours : 1.0);
      setIsAbsent(false);
      return;
    }
    if (!shiftCode || shiftCode === 'OFF' || shiftCode === 'TERM_OFF') {
      setIsAbsent(true);
      return;
    }
    setIsAbsent(false);
    switch (shiftCode) {
      case 'A':
        setStartTime('08:30');
        setEndTime('17:30');
        setBreakHours(1.0);
        break;
      case 'B':
        setStartTime('10:00');
        setEndTime('19:00');
        setBreakHours(1.0);
        break;
      case 'C':
        setStartTime('13:30');
        setEndTime('22:30');
        setBreakHours(1.0);
        break;
      case 'D':
        setStartTime('11:00');
        setEndTime('20:00');
        setBreakHours(1.0);
        break;
      default:
        setStartTime('10:00');
        setEndTime('19:00');
        setBreakHours(1.0);
    }
  };

  // 當合格名單變動或當前選取之同仁已不合法時，自動修正選取 (需求 #013)
  useEffect(() => {
    if (reviewableEmployees.length > 0) {
      const exists = reviewableEmployees.some(e => e.emp_id === selectedEmpId);
      if (!exists) {
        const nextId = reviewableEmployees[0].emp_id;
        setSelectedEmpId(nextId);
        syncShiftDefaults(nextId, selectedDay);
      }
    } else {
      setSelectedEmpId('');
    }
  }, [reviewableEmployees, selectedEmpId, selectedDay]);

  // 跨度與淨工時計算
  const startDec = timeToDecimal(startTime);
  const endDec = timeToDecimal(endTime);
  const totalSpanHours = isAbsent ? 0 : Math.max(0, endDec - startDec);
  const netActualHours = isAbsent ? 0 : Math.max(0, totalSpanHours - breakHours);

  // 《勞基法》第 35 條休息累進演算法：
  // 連續工作滿 4 小時需 0.5h，滿 8 小時 (跨度 >= 8.5h) 需 1.0h，滿 12 小時 (跨度 >= 12.5h) 需 1.5h
  const minRequiredBreakHours = useMemo(() => {
    if (isAbsent || totalSpanHours < 4.5) return 0;
    if (totalSpanHours >= 12.5) return 1.5;
    if (totalSpanHours >= 8.5) return 1.0;
    return 0.5;
  }, [isAbsent, totalSpanHours]);

  const spanIntervalsCount = useMemo(() => {
    if (totalSpanHours >= 12.5) return 3;
    if (totalSpanHours >= 8.5) return 2;
    if (totalSpanHours >= 4.5) return 1;
    return 0;
  }, [totalSpanHours]);

  const isLaborLaw35Violated = !isAbsent && totalSpanHours >= 4.5 && breakHours < minRequiredBreakHours;

  // 《勞基法》第 32 條第 2 項檢核：單日淨實勤總工時不得超過 12 小時；且每日加班不得超過 4 小時
  const overtimeHoursToday = isAbsent ? 0 : Math.max(0, netActualHours - 8);
  const isLaborLaw32Violated = !isAbsent && (netActualHours > 12 || overtimeHoursToday > 4);

  // 是否存在任何法規違規事實
  const hasLaborLawViolations = isLaborLaw35Violated || isLaborLaw32Violated;

  // 具體違規清單陣列 (用於彈窗、覆核資料結構與報表加註)
  const laborViolationsList = useMemo(() => {
    const list = [];
    if (isLaborLaw35Violated) {
      list.push(
        `違反《勞基法》第 35 條：在勤時間跨度達 ${totalSpanHours} 小時（已跨越 ${spanIntervalsCount} 個 4 小時連續工作區間），依法至少應累積配置 ${minRequiredBreakHours} 小時休息，目前僅配置 ${breakHours} 小時。`
      );
    }
    if (isLaborLaw32Violated) {
      list.push(
        `嚴重違反《勞基法》第 32 條第 2 項：單日淨實勤達 ${netActualHours} 小時，已超過法定每日總工時上限 12 小時（本日延長工時達 ${overtimeHoursToday} 小時，超過法定單日加班 4 小時上限）。`
      );
    }
    return list;
  }, [isLaborLaw35Violated, isLaborLaw32Violated, totalSpanHours, spanIntervalsCount, minRequiredBreakHours, breakHours, netActualHours, overtimeHoursToday]);

  // 工時差額 (淨實勤 - 原排定)
  const hoursDiff = isAbsent ? (0 - scheduledHours) : (netActualHours - scheduledHours);
  const neededHours = Math.abs(hoursDiff);

  // 假勤折抵額度檢核 (補休不足或特休不足時跳異常並鎖定儲存)
  const isCompTimeInsufficient = !isPT && hoursDiff < 0 && deductionType === 'COMP_TIME' && availableCompTimeHours < neededHours;
  const isAnnualLeaveInsufficient = !isPT && hoursDiff < 0 && deductionType === 'ANNUAL_LEAVE' && availableAnnualLeaveHours < neededHours;
  const isDeductionBalanceInsufficient = isCompTimeInsufficient || isAnnualLeaveInsufficient;

  // 一般正常覆核送出
  const handleSaveNormalOverride = (e) => {
    e?.preventDefault();

    if (hasLaborLawViolations) {
      setFeedbackMsg('剛性阻擋：本筆勤務存在違反勞動基準法之情事，普通送出已鎖定！依規定需由營運高管進行三次確認實況核定。');
      setTimeout(() => setFeedbackMsg(''), 5000);
      return;
    }

    if (isDeductionBalanceInsufficient) {
      setFeedbackMsg(`假勤額度不足：${currentEmp.name} 可用${deductionType === 'COMP_TIME' ? '補休' : '特休'}額度不足以折抵短少 ${neededHours} 小時！請改選事假(扣全薪)或病假(扣半薪)。`);
      setTimeout(() => setFeedbackMsg(''), 5000);
      return;
    }

    if (!isAbsent && endDec <= startDec) {
      setFeedbackMsg('時間邏輯錯誤：出勤結束時間必須晚於開始時間！');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    onOverrideHours({
      empId: currentEmp.emp_id,
      day: selectedDay,
      actualHours: netActualHours,
      startTime: isAbsent ? null : startTime,
      endTime: isAbsent ? null : endTime,
      breakHours: isAbsent ? 0 : breakHours,
      diffHours: hoursDiff,
      deductionType: hoursDiff < 0 ? deductionType : null,
      isAbsent: isAbsent,
      notes: actualNoteInput || (
        isAbsent 
          ? (currentUser?.is_admin && currentEmp?.role === 'Manager' ? '[👑行政合規備查歸檔] 最高主管全日未到勤核定' : '全日未到勤核定') 
          : currentUser?.is_admin && currentEmp?.role === 'Manager'
          ? `[👑行政合規備查歸檔] 管理員 ${currentUser?.name || 'Admin'} 檢驗出勤合規：${startTime}~${endTime} (休${breakHours}h, 淨${netActualHours}h, 差額${hoursDiff >= 0 ? '+' : ''}${hoursDiff}h)`
          : `實勤覆核 ${startTime}~${endTime} (休${breakHours}h, 淨${netActualHours}h, 差額${hoursDiff >= 0 ? '+' : ''}${hoursDiff}h)`
      ),
      isLaborViolationOverride: false,
      laborViolations: [],
      overrideManager: null
    });

    const isManagerArchiving = currentUser?.is_admin && currentEmp?.role === 'Manager';
    const resultNote = isPT
      ? `PT 人員實際到班結算 ${netActualHours} 小時，已累計至本月計薪工時！`
      : hoursDiff > 0
      ? `正職加班核定 +${hoursDiff} 小時，已正式認列延長工時（依法列入加班費核算，或由同仁依自主意願申請換取補休）！`
      : hoursDiff < 0
      ? `正職出勤短少 ${hoursDiff} 小時，已依選定方式沖抵假勤！`
      : `出勤工時完全符合原排 (${netActualHours}h)，工時無差額。`;

    if (isManagerArchiving) {
      setFeedbackMsg(`已完成最高主管 ${currentEmp.name} 於 9/${selectedDay} 之【行政合規備查歸檔】！${resultNote}`);
    } else {
      setFeedbackMsg(`已成功覆核 ${currentEmp.name} 於 9/${selectedDay} 日實勤！${resultNote}`);
    }
    setTimeout(() => setFeedbackMsg(''), 6000);
  };

  // 開啟營運高管三度確認彈窗
  const handleOpenTripleModal = () => {
    setTripleStep(1);
    setHasConfirmedStep1(false);
    setHasConfirmedStep2(false);
    setEmergencyReason(actualNoteInput || '');
    setIsTripleModalOpen(true);
  };

  // 營運高管三度確認強制放行完成
  const handleFinalTripleAuthorize = () => {
    if (!emergencyReason || emergencyReason.trim().length < 8) {
      alert('請填寫具體的現場不可抗力或緊急突發調度事由（至少 8 個字），以供稽核與報表加註備查！');
      return;
    }

    onOverrideHours({
      empId: currentEmp.emp_id,
      day: selectedDay,
      actualHours: netActualHours,
      startTime: isAbsent ? null : startTime,
      endTime: isAbsent ? null : endTime,
      breakHours: isAbsent ? 0 : breakHours,
      diffHours: hoursDiff,
      deductionType: hoursDiff < 0 ? deductionType : null,
      isAbsent: isAbsent,
      isLaborViolationOverride: true,
      laborViolations: laborViolationsList,
      overrideManager: {
        name: currentUser?.name || '陳鵬宇 (營運主管)',
        emp_id: currentUser?.emp_id || 'B111155',
        role: currentUser?.role || 'Manager',
        confirmed_at: new Date().toISOString(),
        emergency_reason: emergencyReason
      },
      notes: `[⚠️高管強制核實] ${emergencyReason} (實勤 ${startTime}~${endTime}, 淨工時 ${netActualHours}h, 差額 ${hoursDiff >= 0 ? '+' : ''}${hoursDiff}h)`
    });

    setIsTripleModalOpen(false);
    setFeedbackMsg(
      `⚠️ 營運高管已完成三次確認！已強制核定 ${currentEmp.name} 於 9/${selectedDay} 之超時出勤 (${netActualHours}h)，系統已同步加註違規提醒於未來班表與結算報表中！`
    );
    setTimeout(() => setFeedbackMsg(''), 7000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
      {/* 頂部標題 */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              主管端實勤覆核與工時微調面板 (Hours Override)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            核心決策 13 & 勞基法 24/32/35 條合規：打卡起訖精確覆核 · 加班工時依法計發/意願換補休 · 高管三次確認強制放行 · 報表加註提醒連動
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold">
            今日：9 月 {TODAY_DAY} 日
          </span>
          <span className={`text-[11px] px-2.5 py-1 rounded-full border font-bold flex items-center space-x-1 ${
            isManager 
              ? 'bg-purple-50 text-purple-800 border-purple-200' 
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <Users className="w-3 h-3 shrink-0" />
            <span>
              操作主管：{currentUser?.name || '未知'} ({isManager ? '營運高管' : `${stationMap[currentUser?.primary_station] || '站點'}組長`})
            </span>
          </span>
        </div>
      </div>

      {/* 主管指示 #013 權責管轄範圍橫幅 */}
      <div className={`mb-4 p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs ${
        isLeader 
          ? 'bg-blue-50/70 border-blue-200 text-blue-900' 
          : 'bg-purple-50/70 border-purple-200 text-purple-900'
      }`}>
        <div className="flex items-center space-x-2">
          <ShieldCheck className={`w-4 h-4 shrink-0 ${isLeader ? 'text-blue-600' : 'text-purple-600'}`} />
          <span>
            {isLeader ? (
              <>
                <strong>【站點組長覆核權責】</strong>：僅限<strong>【{stationMap[currentUser?.primary_station] || '服務台'}】</strong>同組基層同仁（不能跳組、嚴禁自我覆核）；組長自身實勤出勤由<strong>營運高管 (Manager) 向上覆核</strong>。
              </>
            ) : (
              <>
                <strong>【營運高管統籌覆核】</strong>：具備全站點向上總覆核權，統籌各站點組長 (Leader 向上覆核) 與全場基層同仁實勤（排除個人自我覆核）。
              </>
            )}
          </span>
        </div>
        <div className="text-[11px] font-mono font-bold">
          {isLeader ? (
            <span className="px-2 py-0.5 rounded bg-blue-100/80 text-blue-800">
              同組合格覆核對象：{reviewableEmployees.length} 人
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-purple-100/80 text-purple-800">
              合格覆核總人數：{reviewableEmployees.length} 人
            </span>
          )}
        </div>
      </div>

      {/* 限制提示橫幅 */}
      <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
          <span>
            <strong>實勤覆核限制規則</strong>：實勤覆核僅開放<strong>當日（9/{TODAY_DAY}日）及以前</strong>已發生之出勤紀錄；未來尚未發生之日期全數反灰停用。
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold">{feedbackMsg}</span>
        </div>
      )}

      {/* 覆核操作表單 */}
      <form onSubmit={handleSaveNormalOverride} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 mb-6">
        {/* 若為 Manager，提供站點切換過濾器 */}
        {isManager && (
          <div className="mb-3.5 pb-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-1.5 text-slate-700 font-bold">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>高管站點篩選：</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setStationFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                  stationFilter === 'ALL'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                全部站點 ({employees.filter(e => !e.is_self_scheduled && e.emp_id !== currentUser?.emp_id).length})
              </button>
              {stations.map(st => {
                const count = employees.filter(e => !e.is_self_scheduled && e.emp_id !== currentUser?.emp_id && e.primary_station === st.station_id).length;
                return (
                  <button
                    key={st.station_id}
                    type="button"
                    onClick={() => setStationFilter(st.station_id)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                      stationFilter === st.station_id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st.station_name} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-4 text-xs">
          {/* 1. 選擇同仁 (同組限制、排除自己、排除高管) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700 block">覆核同仁對象</label>
              <span className="text-[10px] text-slate-400 font-semibold">
                {isLeader ? '限同組基層' : '全場管轄'}
              </span>
            </div>
            <select
              value={selectedEmpId}
              disabled={reviewableEmployees.length === 0}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedEmpId(id);
                syncShiftDefaults(id, selectedDay);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              {reviewableEmployees.length === 0 ? (
                <option value="">(本組尚無可覆核同仁)</option>
              ) : (
                reviewableEmployees.map(e => (
                  <option key={e.emp_id} value={e.emp_id}>
                    {e.name} ({stationMap[e.primary_station] || e.primary_station} · {e.role === 'PT' ? '計時PT' : e.role === 'Leader' ? '🌟站點組長' : '正職'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. 選擇日期 (落實未來日期反灰鎖定) */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">
              出勤日期 (限今日前)
            </label>
            <select
              value={selectedDay}
              onChange={(e) => {
                const d = Number(e.target.value);
                setSelectedDay(d);
                syncShiftDefaults(selectedEmpId, d);
              }}
              className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
            >
              {Array.from({ length: 30 }, (_, i) => i + 1).map(d => {
                const isFuture = d > TODAY_DAY;
                return (
                  <option key={d} value={d} disabled={isFuture}>
                    9 月 {d} 日 {isFuture ? '(未來未到班 · 鎖定)' : d === TODAY_DAY ? '(今日)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. 原排定工時 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">系統原排定班別與工時</label>
            <div className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 flex items-center justify-between">
              <span>{scheduledShift?.shift_type || 'OFF'} 班</span>
              <span className="text-indigo-600">{scheduledHours} 小時</span>
            </div>
          </div>

          {/* 4. 到勤狀態切換 */}
          <div>
            <label className="font-bold text-slate-700 block mb-1">當日到勤註記</label>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsAbsent(false)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  !isAbsent 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                實際出勤
              </button>
              <button
                type="button"
                onClick={() => setIsAbsent(true)}
                className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all cursor-pointer ${
                  isAbsent 
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                }`}
              >
                未到勤/公假
              </button>
            </div>
          </div>
        </div>

        {/* 出勤打卡時段與休息下拉選單 */}
        {!isAbsent ? (
          <div className="p-4 rounded-xl bg-white border border-slate-200 mb-4 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
              {/* 開始時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">實際出勤開始時間</label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                >
                  {startTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 結束時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">實際出勤結束時間</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                >
                  {endTimeOptions.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* 休息時間下拉選單 */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  實際休息時間 (勞基法35條累進)
                </label>
                <select
                  value={breakHours}
                  onChange={(e) => setBreakHours(Number(e.target.value))}
                  className={`w-full border rounded-lg p-2 font-bold ${
                    isLaborLaw35Violated ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-300 text-slate-800'
                  }`}
                >
                  {breakOptions.map(b => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 勞基法第 35 條休息累進防呆提示 */}
            {isLaborLaw35Violated && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start space-x-2.5 mb-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    ⚠️ 違反《勞基法》第 35 條休息規定（連續在勤未達法定休息）：
                  </div>
                  <div className="mt-1 text-rose-800 leading-relaxed">
                    在勤時間跨度達 <strong>{totalSpanHours} 小時</strong>（已跨越 {spanIntervalsCount} 個 4 小時工作區間），依法至少需累積配置 <strong>{minRequiredBreakHours} 小時（{minRequiredBreakHours * 60} 分鐘）</strong> 休息時間！目前僅配置 <strong>{breakHours} 小時</strong>。請調整休息時間。
                  </div>
                </div>
              </div>
            )}

            {/* 勞基法第 32 條第 2 項單日工時上限嚴重警告卡片 (補齊警告渲染) */}
            {isLaborLaw32Violated && (
              <div className="p-3.5 rounded-lg bg-rose-100 border border-rose-400 text-rose-950 text-xs flex items-start space-x-2.5 mb-2.5 shadow-xs">
                <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-rose-900 flex items-center space-x-1.5">
                    <span>🚨 嚴重違反《勞基法》第 32 條第 2 項：單日實勤總工時超過法定上限！</span>
                  </div>
                  <div className="mt-1 text-rose-800 leading-relaxed">
                    扣除休息後淨實勤達 <strong>{netActualHours} 小時</strong>，已超過法定每日總工時上限 <strong>12 小時</strong>
                    {overtimeHoursToday > 4 && (
                      <>（且本日延長工時達 <strong>{overtimeHoursToday} 小時</strong>，超過單日加班 <strong>4 小時</strong> 上限）</>
                    )}
                    ！依法雇主不得使勞工超時工作，普通覆核已完全鎖定。
                  </div>
                </div>
              </div>
            )}

            {/* 淨工時與差額即時試算橫幅 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">在勤時間總跨度：</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{totalSpanHours} 小時</span>
              </div>

              <div>
                <span className="text-slate-500 block">扣除休息後淨實勤：</span>
                <span className={`font-mono font-black text-sm ${netActualHours > 12 ? 'text-rose-700' : 'text-indigo-700'}`}>
                  {netActualHours} 小時 {netActualHours > 12 && '(超標)'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">
                  {isPT ? '計時 PT 結算：' : '正職排班差額比對：'}
                </span>
                {isPT ? (
                  <span className="font-bold text-amber-700">
                    累計到班 {netActualHours}h (計薪對帳基準)
                  </span>
                ) : (
                  <span className={`font-bold font-mono text-sm ${
                    hoursDiff > 0 ? 'text-emerald-600' : hoursDiff < 0 ? 'text-rose-600' : 'text-slate-600'
                  }`}>
                    {hoursDiff > 0 ? `+${hoursDiff} 小時 (核定加班 · 依法列加班費/意願換補休)` : hoursDiff < 0 ? `${hoursDiff} 小時 (出勤短少 · 依選擇沖抵)` : '0 小時 (相符)'}
                  </span>
                )}
                {hoursDiff > 0 && !isPT && (
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ※ 依《勞基法》第 24/32-1 條規定，延長工時以核給加班費為法定原則；同仁亦得依個人意願選擇轉入補休存摺。
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200 mb-4 text-xs text-rose-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>當日註記為「全日未到勤/公假」，實勤工時將核定為 0 小時。</span>
            </div>
            {!isPT && (
              <span className="font-bold text-rose-700 font-mono">
                排班短少 -{scheduledHours} 小時
              </span>
            )}
          </div>
        )}

        {/* 正職工時短少/臨時請假沖抵方式 (需求 #006 & #011 假勤額度不足檢驗與 4 大假別擴充) */}
        {hoursDiff < 0 && !isPT && (
          <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200 mb-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-700" />
                <h4 className="font-bold text-purple-900">
                  正職實勤短少 {neededHours} 小時 · 請假折抵與計薪沖抵方式
                </h4>
              </div>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="text-slate-600">
                  同仁可用補休：<strong className={availableCompTimeHours < neededHours ? 'text-rose-600 font-bold' : 'text-purple-700 font-bold'}>{availableCompTimeHours}h</strong>
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-600">
                  同仁可用特休：<strong className={availableAnnualLeaveHours < neededHours ? 'text-rose-600 font-bold' : 'text-amber-700 font-bold'}>{availableAnnualLeaveDays}天 ({availableAnnualLeaveHours}h)</strong>
                </span>
              </div>
            </div>

            {/* 4 大請假折抵選項卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* 選項 1: 扣抵彈性補休 (全薪) */}
              <label className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                deductionType === 'COMP_TIME' 
                  ? isCompTimeInsufficient 
                    ? 'bg-rose-50 border-rose-500 shadow-xs'
                    : 'bg-purple-600 text-white border-purple-600 shadow-2xs' 
                  : isCompTimeInsufficient
                    ? 'bg-rose-50/40 text-slate-700 border-rose-200 hover:border-rose-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="radio"
                        name="deductionType"
                        value="COMP_TIME"
                        checked={deductionType === 'COMP_TIME'}
                        onChange={(e) => setDeductionType(e.target.value)}
                        className="sr-only"
                      />
                      <span className={deductionType === 'COMP_TIME' && !isCompTimeInsufficient ? 'text-white' : 'text-slate-800'}>
                        扣抵彈性補休
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      deductionType === 'COMP_TIME' && !isCompTimeInsufficient 
                        ? 'bg-purple-800 text-purple-100' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      全薪 (不扣薪)
                    </span>
                  </div>
                  <div className={`text-[11px] font-mono mt-1 ${deductionType === 'COMP_TIME' && !isCompTimeInsufficient ? 'text-purple-100' : 'text-slate-600'}`}>
                    扣抵時數：-{neededHours} 小時
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[10px]">
                  <div className={deductionType === 'COMP_TIME' && !isCompTimeInsufficient ? 'text-purple-200' : 'text-slate-500'}>
                    存摺餘額：{availableCompTimeHours} 小時
                  </div>
                  {isCompTimeInsufficient && (
                    <div className="text-rose-600 font-bold mt-0.5">
                      ⚠️ 額度不足 (缺 {neededHours - availableCompTimeHours}h)
                    </div>
                  )}
                </div>
              </label>

              {/* 選項 2: 扣抵法定特休 (全薪) */}
              <label className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                deductionType === 'ANNUAL_LEAVE' 
                  ? isAnnualLeaveInsufficient 
                    ? 'bg-rose-50 border-rose-500 shadow-xs'
                    : 'bg-amber-600 text-white border-amber-600 shadow-2xs' 
                  : isAnnualLeaveInsufficient
                    ? 'bg-rose-50/40 text-slate-700 border-rose-200 hover:border-rose-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="radio"
                        name="deductionType"
                        value="ANNUAL_LEAVE"
                        checked={deductionType === 'ANNUAL_LEAVE'}
                        onChange={(e) => setDeductionType(e.target.value)}
                        className="sr-only"
                      />
                      <span className={deductionType === 'ANNUAL_LEAVE' && !isAnnualLeaveInsufficient ? 'text-white' : 'text-slate-800'}>
                        扣抵法定特休
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      deductionType === 'ANNUAL_LEAVE' && !isAnnualLeaveInsufficient 
                        ? 'bg-amber-800 text-amber-100' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      全薪 (不扣薪)
                    </span>
                  </div>
                  <div className={`text-[11px] font-mono mt-1 ${deductionType === 'ANNUAL_LEAVE' && !isAnnualLeaveInsufficient ? 'text-amber-100' : 'text-slate-600'}`}>
                    沖抵時數：-{neededHours}h (折{(neededHours / 8).toFixed(1)}天)
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[10px]">
                  <div className={deductionType === 'ANNUAL_LEAVE' && !isAnnualLeaveInsufficient ? 'text-amber-200' : 'text-slate-500'}>
                    存摺餘額：{availableAnnualLeaveDays}天 ({availableAnnualLeaveHours}h)
                  </div>
                  {isAnnualLeaveInsufficient && (
                    <div className="text-rose-600 font-bold mt-0.5">
                      ⚠️ 額度不足 (缺 {(neededHours - availableAnnualLeaveHours).toFixed(1)}h)
                    </div>
                  )}
                </div>
              </label>

              {/* 選項 3: 事假 (其它) (扣全薪) */}
              <label className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                deductionType === 'PERSONAL_LEAVE' 
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}>
                <div>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="radio"
                        name="deductionType"
                        value="PERSONAL_LEAVE"
                        checked={deductionType === 'PERSONAL_LEAVE'}
                        onChange={(e) => setDeductionType(e.target.value)}
                        className="sr-only"
                      />
                      <span className={deductionType === 'PERSONAL_LEAVE' ? 'text-white' : 'text-slate-800'}>
                        事假 (其它)
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      deductionType === 'PERSONAL_LEAVE' 
                        ? 'bg-rose-900 text-rose-100' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      扣全薪 (無津貼)
                    </span>
                  </div>
                  <div className={`text-[11px] font-mono mt-1 ${deductionType === 'PERSONAL_LEAVE' ? 'text-slate-200' : 'text-slate-600'}`}>
                    短少出勤：-{neededHours} 小時
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[10px]">
                  <div className={deductionType === 'PERSONAL_LEAVE' ? 'text-slate-300' : 'text-slate-500'}>
                    不扣假勤存摺 · 無額度限制
                  </div>
                  <div className={`text-[9px] mt-0.5 ${deductionType === 'PERSONAL_LEAVE' ? 'text-slate-300' : 'text-slate-400'}`}>
                    依勞基法事假期間不給付工資
                  </div>
                </div>
              </label>

              {/* 選項 4: 病假 (照顧假) (扣半薪) */}
              <label className={`p-3 rounded-xl border-2 cursor-pointer flex flex-col justify-between transition-all ${
                deductionType === 'SICK_LEAVE' 
                  ? 'bg-blue-700 text-white border-blue-700 shadow-2xs' 
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}>
                <div>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <div className="flex items-center space-x-1.5">
                      <input
                        type="radio"
                        name="deductionType"
                        value="SICK_LEAVE"
                        checked={deductionType === 'SICK_LEAVE'}
                        onChange={(e) => setDeductionType(e.target.value)}
                        className="sr-only"
                      />
                      <span className={deductionType === 'SICK_LEAVE' ? 'text-white' : 'text-slate-800'}>
                        病假 (照顧假)
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      deductionType === 'SICK_LEAVE' 
                        ? 'bg-blue-900 text-blue-100' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      扣半薪 (發50%)
                    </span>
                  </div>
                  <div className={`text-[11px] font-mono mt-1 ${deductionType === 'SICK_LEAVE' ? 'text-blue-100' : 'text-slate-600'}`}>
                    短少出勤：-{neededHours} 小時
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 text-[10px]">
                  <div className={deductionType === 'SICK_LEAVE' ? 'text-blue-200' : 'text-slate-500'}>
                    不扣假勤存摺 · 無額度限制
                  </div>
                  <div className={`text-[9px] mt-0.5 ${deductionType === 'SICK_LEAVE' ? 'text-blue-200' : 'text-slate-400'}`}>
                    依請假規則普通病假折半發薪
                  </div>
                </div>
              </label>
            </div>

            {/* 額度不足異常紅底警示卡 */}
            {isDeductionBalanceInsufficient && (
              <div className="mt-3 p-3.5 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs flex items-start space-x-2.5 shadow-xs animate-shake">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-black text-rose-900 flex items-center space-x-1.5">
                    <span>🚨 假勤折抵額度不足異常 · 普通儲存已剛性鎖定！</span>
                  </div>
                  <div className="mt-1 text-rose-800 leading-relaxed">
                    同仁 <strong>{currentEmp.name}</strong> 欲以<strong>{deductionType === 'COMP_TIME' ? '彈性補休' : '法定特休'}</strong>折抵未到勤短少 <strong>{neededHours} 小時</strong>，但當前可用額度僅 <strong>{deductionType === 'COMP_TIME' ? `${availableCompTimeHours} 小時` : `${availableAnnualLeaveDays} 天 (${availableAnnualLeaveHours} 小時)`}</strong>，短缺 <strong>{deductionType === 'COMP_TIME' ? (neededHours - availableCompTimeHours) : (neededHours - availableAnnualLeaveHours).toFixed(1)} 小時</strong>！
                    <br />
                    <span className="font-semibold text-rose-900 mt-1 block">
                      ⚠️ 依勞動法規禁止存摺透支為負數。請改選<strong>「事假 (其它，扣全薪)」</strong>或<strong>「病假 (照顧假，扣半薪)」</strong>；或由該同仁先行出勤累積延長工時後再行補抵。
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 現場備註與加班事由 */}
        <div className="mb-4 text-xs">
          <label className="font-bold text-slate-700 block mb-1">現場微調事由與核定備註</label>
          <input
            type="text"
            value={actualNoteInput}
            onChange={(e) => setActualNoteInput(e.target.value)}
            placeholder="如：晚間現場突發人潮尖峰，經組長同意延長支援..."
            className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* 操作按鈕列：一般合規按鈕 vs 營運高管三次確認強制放行按鈕 */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {hasLaborLawViolations ? (
              <span className="text-rose-600 font-bold flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>偵測到違反《勞基法》規範！普通儲存已關閉。</span>
              </span>
            ) : isDeductionBalanceInsufficient ? (
              <span className="text-rose-600 font-bold flex items-center space-x-1">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>假勤可用額度不足，無法沖抵！請切換折抵假別或改選事假/病假。</span>
              </span>
            ) : (
              <span className="text-emerald-700 font-medium flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>工時與假勤折抵額度符合規範。</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* 一般儲存按鈕 (在有法規違規、假勤額度不足或無合法覆核對象時鎖死，Admin 對 Manager 切換為備查歸檔) */}
            <button
              type="submit"
              disabled={hasLaborLawViolations || isDeductionBalanceInsufficient || !currentEmp || reviewableEmployees.length === 0}
              className={`flex items-center space-x-2 px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer active:scale-95 transition-all ${
                currentUser?.is_admin && currentEmp?.role === 'Manager'
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 shadow-purple-200'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {currentUser?.is_admin && currentEmp?.role === 'Manager' ? (
                <ShieldCheck className="w-4 h-4 text-purple-200" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>
                {currentUser?.is_admin && currentEmp?.role === 'Manager'
                  ? '檢驗合規並備查歸檔 (Admin Archive)'
                  : '儲存合規實勤覆核'}
              </span>
            </button>

            {/* 營運高管專屬：三次確認強制放行按鈕 */}
            {hasLaborLawViolations && isManager && (
              <button
                type="button"
                onClick={handleOpenTripleModal}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-700 hover:to-rose-800 text-white font-black text-xs rounded-lg shadow-md shadow-rose-200 cursor-pointer active:scale-95 transition-all animate-pulse"
              >
                <ShieldAlert className="w-4 h-4 text-amber-200" />
                <span>⚠️ 營運高管依實況強制核定 (需三次確認)</span>
              </button>
            )}

            {/* 非高管時的權限提示 */}
            {hasLaborLawViolations && !isManager && (
              <div className="px-3 py-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-500 text-xs font-semibold flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>非營運高管權限，無法強制放行違規勤務</span>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* 營運高管三度確認安全鎖模態彈窗 (Triple-Confirmation Modal) */}
      {isTripleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-xl w-full max-h-[88vh] flex flex-col my-auto overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 shrink-0 bg-slate-50/80">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <ShieldAlert className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    營運高管現場實勤強制核定授權（三度確認安全鎖）
                  </h3>
                  <p className="text-xs text-slate-500">
                    步驟 {tripleStep} / 3：
                    {tripleStep === 1 ? '勞基法違規事實核認' : tripleStep === 2 ? '法律責任與報表加註宣告' : '緊急突發事由與最終授權'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTripleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 步驟進度條 */}
            <div className="grid grid-cols-3 gap-2 px-5 pt-4 shrink-0">
              <div className={`h-1.5 rounded-full ${tripleStep >= 1 ? 'bg-rose-600' : 'bg-slate-200'}`} />
              <div className={`h-1.5 rounded-full ${tripleStep >= 2 ? 'bg-rose-600' : 'bg-slate-200'}`} />
              <div className={`h-1.5 rounded-full ${tripleStep >= 3 ? 'bg-rose-600' : 'bg-slate-200'}`} />
            </div>

            {/* 步驟內容區 (滾動區) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 步驟 1: 違規事實核認 */}
              {tripleStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                    <div className="font-bold text-rose-950 mb-2 flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>【第 1 次確認】系統檢驗出以下客觀違反《勞基法》事實：</span>
                    </div>
                    <ul className="space-y-2 text-rose-800 list-disc pl-5">
                      {laborViolationsList.map((vio, idx) => (
                        <li key={idx} className="leading-relaxed font-semibold">{vio}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div><strong>覆核對象：</strong>{currentEmp.name} ({currentEmp.emp_id})</div>
                    <div><strong>出勤日期：</strong>9 月 {selectedDay} 日</div>
                    <div><strong>實勤打卡時段：</strong>{startTime} ~ {endTime} (跨度 {totalSpanHours}h, 實配休息 {breakHours}h, 淨實勤 {netActualHours}h)</div>
                  </div>

                  <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={hasConfirmedStep1}
                      onChange={(e) => setHasConfirmedStep1(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      我已查閱上述違規情事，確認現場確實因營運突發不可抗力產生上述出勤事實。(第 1 次確認)
                    </span>
                  </label>
                </div>
              )}

              {/* 步驟 2: 法律責任與報表加註宣告 */}
              {tripleStep === 2 && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2">
                    <div className="font-bold flex items-center space-x-1.5 text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      <span>【第 2 次確認】法律責任、稽核追溯與未來報表加註提醒宣告：</span>
                    </div>
                    <p className="leading-relaxed">
                      1. <strong>全館排班總表 CSV</strong>：該同仁之當日儲存格將標記 <code>[⚠️超時違規(實{netActualHours}h)]</code>，且報表最末端將永久條列此筆高管強制核實明細。
                    </p>
                    <p className="leading-relaxed">
                      2. <strong>考勤結算清冊 CSV</strong>：月底結算名冊將新增加註欄位，明列違反條款、核定主管姓名（{currentUser?.name || '陳鵬宇'}）與現場緊急事由。
                    </p>
                    <p className="leading-relaxed">
                      3. <strong>中央稽核歷程 (Audit Trail)</strong>：此筆操作將連同時間戳記、操作者工號與終端資訊寫入不可竄改稽核日誌。
                    </p>
                  </div>

                  <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition-all">
                    <input
                      type="checkbox"
                      checked={hasConfirmedStep2}
                      onChange={(e) => setHasConfirmedStep2(e.target.checked)}
                      className="mt-0.5 w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800">
                      我充分理解相關法律與稽核責任，同意於未來所有班表與結算報表中永久加註違規提醒。(第 2 次確認)
                    </span>
                  </label>
                </div>
              )}

              {/* 步驟 3: 緊急事由填寫與最終授權放行 */}
              {tripleStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                    <div className="font-bold text-purple-950 mb-1 flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-purple-700" />
                      <span>【第 3 次確認】請填寫現場不可抗力或突發緊急調度事由 (必填，至少 8 字)：</span>
                    </div>
                    <p className="text-purple-700 leading-relaxed text-[11px]">
                      此項事由將直接印製於全館 CSV 班表、考勤結算報表與法規稽核報告中，供勞動主管機關與營運稽核室備查。
                    </p>
                  </div>

                  <div>
                    <textarea
                      rows={3}
                      value={emergencyReason}
                      onChange={(e) => setEmergencyReason(e.target.value)}
                      placeholder="如：現場設備突發故障搶修至深夜，現場無替換人力，經營運高管特准留守出勤並核實工時..."
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 focus:outline-none leading-relaxed"
                    />
                    <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                      <span>字數需滿 8 字以上</span>
                      <span className={emergencyReason.trim().length >= 8 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        已輸入 {emergencyReason.trim().length} 字
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 font-bold flex items-center space-x-2">
                    <Check className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      授權核定主管：{currentUser?.name || '陳鵬宇'} ({currentUser?.emp_id || 'B111155'} · 營運高管)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 底部按鈕區 (固定置底) */}
            <div className="p-5 border-t border-slate-200 bg-slate-50/80 shrink-0 flex items-center justify-between">
              {tripleStep === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsTripleModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    取消退出
                  </button>
                  <button
                    type="button"
                    disabled={!hasConfirmedStep1}
                    onClick={() => setTripleStep(2)}
                    className="px-5 py-2 rounded-lg bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    下一步：法律責任與報表宣告 (1/3) →
                  </button>
                </>
              )}

              {tripleStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setTripleStep(1)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    ← 回上一步
                  </button>
                  <button
                    type="button"
                    disabled={!hasConfirmedStep2}
                    onClick={() => setTripleStep(3)}
                    className="px-5 py-2 rounded-lg bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    下一步：填寫事由與最終授權 (2/3) →
                  </button>
                </>
              )}

              {tripleStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => setTripleStep(2)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    ← 回上一步
                  </button>
                  <button
                    type="button"
                    disabled={emergencyReason.trim().length < 8}
                    onClick={handleFinalTripleAuthorize}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black shadow-md shadow-rose-200 cursor-pointer active:scale-95 transition-all"
                  >
                    ⚠️ 確認第 3 次最終授權 · 強制核定放行！
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

