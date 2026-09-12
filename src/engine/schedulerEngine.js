// src/engine/schedulerEngine.js
import { SHIFT_TYPES } from '../types/scheduler.js';

/**
 * 確定性啟發式排班種子引擎 (Staggered Rotation Heuristic Seed Engine - V2.3 增強版)
 * 核心原則：
 * 1. 【主屬專責保底】：組長與主屬同仁優先鎖定主屬站點，避免被提前跨站挖走造成主屬開天窗。
 * 2. 【平日排休分組錯開】：同組正職同休可由具備支援與獨立顧站（can_solo）資格者補位；若無人能補，則排休錯開保證站內有基本班底。
 * 3. 【獨立顧站資格 (can_solo) 防呆】：站點需要 solo 且站內無人 solo 時，絕對不可指派 non-solo PT 單獨獨自值班。
 * 4. 【機動人力動態馳援】：多餘在勤正職優先支援全館仍有缺額之站點，均衡人力分佈。
 * 5. 【容錯保底與異常警示】：在極端短缺或假設條件下，仍穩定產出完整最佳基本班表，並將未達標站點精確標示供介面跳出異常提醒。
 */
export function generateSeedSchedule({
  employees,
  stations,
  rules,
  leaveRequests = [],
  monthBorders = {},
  resignationData = {}
}) {
  const startTime = performance.now();
  const yearMonth = rules.target_year_month || '2026-09';
  const totalDays = rules.days_in_month || 30;
  const requiredOffDays = rules.required_off_days || 10;
  const [year, month] = yearMonth.split('-').map(Number);

  // 1. 初始化排班矩陣與日期資訊
  const scheduleMap = {};
  const dayInfos = [];
  const weekendDays = [];
  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    dayInfos.push({ day: d, isWeekend, dayOfWeek });
    if (isWeekend) weekendDays.push(d);
  }

  employees.forEach(emp => {
    scheduleMap[emp.emp_id] = {};
    for (let d = 1; d <= totalDays; d++) {
      scheduleMap[emp.emp_id][d] = null;
    }
  });

  // 2. 高階主管留白 (is_self_scheduled = true)
  const managers = employees.filter(e => e.is_self_scheduled);
  managers.forEach(mgr => {
    for (let d = 1; d <= totalDays; d++) {
      scheduleMap[mgr.emp_id][d] = {
        shift_type: null,
        station_id: null,
        work_hours: 0,
        is_support: false,
        note: '高階主管自主填寫'
      };
    }
  });

  // 3. 離職銷假絕對真空 (TERM_OFF)
  Object.entries(resignationData).forEach(([empId, resignDay]) => {
    if (scheduleMap[empId]) {
      for (let d = resignDay; d <= totalDays; d++) {
        scheduleMap[empId][d] = {
          shift_type: 'TERM_OFF',
          station_id: null,
          work_hours: 0,
          is_support: false,
          note: '離職生效絕對真空'
        };
      }
    }
  });

  // 4. 鎖定自選休假 (Approved Leave Requests)
  const approvedRequests = leaveRequests.filter(r => r.status === 'APPROVED' || !r.status);
  approvedRequests.forEach(req => {
    const { emp_id, day, leave_type } = req;
    if (scheduleMap[emp_id] && !scheduleMap[emp_id][day]) {
      const shiftCode = (leave_type === 'AL' || leave_type === '特休') 
        ? 'AL' 
        : (leave_type === 'CT' || leave_type === '補休') 
        ? 'CT' 
        : 'OFF';

      scheduleMap[emp_id][day] = {
        shift_type: shiftCode,
        station_id: null,
        work_hours: 0,
        is_support: false,
        note: shiftCode === 'AL' ? '排定特休 (AL)' : shiftCode === 'CT' ? '排定補休 (CT)' : (leave_type || '自選休假')
      };
    }
  });

  // 4.5 非在勤人員 (留職停薪 / 長期病假 / 離退職) 全月鎖定真空
  const isEmpActive = (e) => !e.status || e.status === 'Active';
  const inactiveEmployees = employees.filter(e => !isEmpActive(e));
  inactiveEmployees.forEach(emp => {
    const statusNote = emp.status === 'Suspended' 
      ? '留職停薪' 
      : emp.status === 'MedicalLeave' 
      ? '長期病假休養' 
      : '離退職封存';
    for (let d = 1; d <= totalDays; d++) {
      if (scheduleMap[emp.emp_id]) {
        scheduleMap[emp.emp_id][d] = {
          shift_type: 'TERM_OFF',
          station_id: null,
          work_hours: 0,
          is_support: false,
          note: statusNote
        };
      }
    }
  });

  const regularStaff = employees.filter(e => isEmpActive(e) && !e.is_self_scheduled && e.role !== 'PT');
  const ptStaff = employees.filter(e => isEmpActive(e) && e.role === 'PT');

  // 5. 正職輪休規劃 (Regular Staff Off Days Distribution)
  // 5.1 週末輪休分配（每人最多 1 天週末排休，平準週末滿載人力）
  regularStaff.forEach((emp, index) => {
    let currentOffDays = 0;
    let weekendOffDays = 0;

    for (let d = 1; d <= totalDays; d++) {
      if (scheduleMap[emp.emp_id][d]?.shift_type === 'OFF') {
        currentOffDays++;
        if (dayInfos[d - 1].isWeekend) weekendOffDays++;
      }
    }

    if (weekendOffDays === 0 && currentOffDays < requiredOffDays && weekendDays.length > 0) {
      const assignedWeekendDay = weekendDays[index % weekendDays.length];
      if (!scheduleMap[emp.emp_id][assignedWeekendDay]) {
        scheduleMap[emp.emp_id][assignedWeekendDay] = {
          shift_type: 'OFF',
          station_id: null,
          work_hours: 0,
          is_support: false,
          note: '週末輪休'
        };
      }
    }
  });

  // 5.2 平日排休：
  // 規則：「平日正職可排同休 有人補上即可 但要具備支援能力及獨立上班能力」
  // 以主屬站點為分組，同組同仁優先錯開平日排休梯次，確保站內日常有保底人力
  const stationRankMap = {
    'ST_ADMIN': 0,
    'ST_SERVICE': 1,
    'ST_EXPERIENCE': 2,
    'ST_MSS': 3,
    'ST_MAIN_SHOP': 4,
    'ST_SUB_SHOP': 0,
    'ST_CLEAN': 1,
    'ST_DINING': 2,
    'ST_Gagoo': 3
  };

  const stationCounter = {};
  regularStaff.forEach((emp) => {
    const stId = emp.primary_station;
    const count = stationCounter[stId] || 0;
    stationCounter[stId] = count + 1;

    let currentOffDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (scheduleMap[emp.emp_id][d]?.shift_type === 'OFF') currentOffDays++;
    }

    const stBase = stationRankMap[stId] || 0;
    const offset = (stBase + count * 2) % 5;
    const primaryWeekday = offset + 1; // 1=Mon, ..., 5=Fri
    const secondaryWeekday = ((primaryWeekday + 2 - 1) % 5) + 1;

    for (const { day, isWeekend, dayOfWeek } of dayInfos) {
      if (currentOffDays >= requiredOffDays) break;
      if (scheduleMap[emp.emp_id][day]) continue;

      if (!isWeekend && (dayOfWeek === primaryWeekday || dayOfWeek === secondaryWeekday)) {
        scheduleMap[emp.emp_id][day] = {
          shift_type: 'OFF',
          station_id: null,
          work_hours: 0,
          is_support: false,
          note: '常態週間排休'
        };
        currentOffDays++;
      }
    }

    // 平準間隔補足剩餘法定休假
    for (let d = totalDays; d >= 1 && currentOffDays < requiredOffDays; d--) {
      if (!scheduleMap[emp.emp_id][d] && !dayInfos[d - 1].isWeekend) {
        scheduleMap[emp.emp_id][d] = {
          shift_type: 'OFF',
          station_id: null,
          work_hours: 0,
          is_support: false,
          note: '例休平準'
        };
        currentOffDays++;
      }
    }
  });

  // 6. 逐日站點派工與出勤排定 (Station Staffing & Shift Assignment)
  const consecutiveDaysMap = {};
  employees.forEach(emp => {
    consecutiveDaysMap[emp.emp_id] = monthBorders[yearMonth]?.[emp.emp_id]?.consecutive_work_days_at_end || 0;
  });

  const ptWorkDaysCount = {};
  ptStaff.forEach(p => { ptWorkDaysCount[p.emp_id] = 0; });

  // 站點排序：採用 MRV 啟發式原則（候選人才庫越少越緊縮的站點，優先派工）
  const stationPoolMap = {};
  stations.forEach(st => {
    const qCount = employees.filter(e => 
      !e.is_self_scheduled && 
      (e.primary_station === st.station_id || e.supported_stations?.includes(st.station_id))
    ).length;
    stationPoolMap[st.station_id] = qCount;
  });

  const sortedStations = [...stations].sort((a, b) => {
    if (a.station_id === 'ST_ADMIN') return -1;
    if (b.station_id === 'ST_ADMIN') return 1;
    return (stationPoolMap[a.station_id] || 0) - (stationPoolMap[b.station_id] || 0);
  });

  const selfScheduledManagers = employees.filter(emp => emp.is_self_scheduled);

  for (const { day, isWeekend } of dayInfos) {
    const assignedToday = new Set();
    const groupClosingTracker = {
      SHOP_GROUP: false,        // 本鋪 (ST_MAIN_SHOP) + 小鋪 (ST_SUB_SHOP)
      GAGOO_DINING_GROUP: false // GAGOO (ST_Gagoo) + 餐飲 (ST_DINING)
    };
    const maxConsecutiveAllowed = rules.work_hour_model === 'FLEX_4_WEEK' ? 10 : 6;

    // 方洲算理：動態判斷當日營業時間與是否延時閉店 (19:00)
    const dateStr = `${yearMonth}-${String(day).padStart(2, '0')}`;
    const closingTime = rules.daily_closing_overrides?.[day] || 
                        rules.daily_closing_overrides?.[dateStr] || 
                        rules.special_closing_dates?.[dateStr] || 
                        (isWeekend ? (rules.default_closing_time_weekend || '19:00') : (rules.default_closing_time_weekday || '18:00'));
    const isExtendedClosing = closingTime >= '19:00';

    // 6.0 勞基法 7 休 1 強制熔斷（連上達標強制今日排休）
    employees.forEach(emp => {
      if (!emp.is_self_scheduled && consecutiveDaysMap[emp.emp_id] >= maxConsecutiveAllowed) {
        if (!scheduleMap[emp.emp_id][day]) {
          scheduleMap[emp.emp_id][day] = {
            shift_type: 'OFF',
            station_id: null,
            work_hours: 0,
            is_support: false,
            note: '勞基法第36條強制例休'
          };
        }
        consecutiveDaysMap[emp.emp_id] = 0;
      }
    });

    const canWorkToday = (emp) => {
      if (assignedToday.has(emp.emp_id)) return false;
      const cur = scheduleMap[emp.emp_id][day];
      if (cur && (cur.shift_type === 'OFF' || cur.shift_type === 'TERM_OFF')) return false;
      if (consecutiveDaysMap[emp.emp_id] >= maxConsecutiveAllowed) return false;
      return true;
    };

    function assignStaff(emp, targetStation, shiftCode, isSupport) {
      const shiftInfo = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.D || SHIFT_TYPES.B;
      scheduleMap[emp.emp_id][day] = {
        shift_type: shiftCode,
        station_id: targetStation.station_id,
        work_hours: shiftInfo.workHours,
        is_support: isSupport,
        note: isSupport ? `支援至 ${targetStation.station_name}` : '站點值勤'
      };
      assignedToday.add(emp.emp_id);
      consecutiveDaysMap[emp.emp_id] = (consecutiveDaysMap[emp.emp_id] || 0) + 1;
      if (emp.role === 'PT') {
        ptWorkDaysCount[emp.emp_id] = (ptWorkDaysCount[emp.emp_id] || 0) + 1;
      }
    }

    const stationStaffCount = {};
    const stationHasSolo = {};
    stations.forEach(s => {
      stationStaffCount[s.station_id] = 0;
      stationHasSolo[s.station_id] = false;
    });

    // 站點資格相容性：主屬該站或跨組支援清單中包含該站（清潔組已開放互為支援）
    const isStationCompatible = (person, targetStationId) => {
      return person.primary_station === targetStationId || (person.supported_stations || []).includes(targetStationId);
    };

    // 計算特定站點當日目標人數（營運支援平日需2人: 1A 1B，假日需2人: 1A 1C）
    const getStationMinRequired = (station) => {
      const reservedSlots = selfScheduledManagers.filter(m => m.primary_station === station.station_id).length;
      if (station.station_id === 'ST_ADMIN') {
        return Math.max(2 - reservedSlots, 1);
      }
      const baseReq = isWeekend ? station.min_staff_weekend : station.min_staff_weekday;
      return Math.max(baseReq - reservedSlots, 0);
    };

    // -------------------------------------------------------------
    // 階段 6.1：【主屬專責保底】
    // 優先指派主屬為該站之組長與正職同仁，確保專責站點班底定錨
    // -------------------------------------------------------------
    sortedStations.forEach(station => {
      const minRequired = getStationMinRequired(station);

      // 1. 站點組長（若主屬該站）
      const leader = regularStaff.find(e => e.emp_id === station.leader_emp_id);
      if (leader && canWorkToday(leader) && leader.primary_station === station.station_id) {
        const shiftCode = selectShiftForStation({
          station,
          isExtendedClosing,
          isWeekend,
          staffIndex: stationStaffCount[station.station_id],
          groupClosingTracker
        });
        assignStaff(leader, station, shiftCode, false);
        stationStaffCount[station.station_id]++;
        if (leader.can_solo) stationHasSolo[station.station_id] = true;
      }

      // 2. 主屬該站之正職同仁
      const primaryStaffList = regularStaff.filter(e => 
        e.primary_station === station.station_id && 
        e.emp_id !== station.leader_emp_id && 
        canWorkToday(e)
      );

      for (const staff of primaryStaffList) {
        if (stationStaffCount[station.station_id] >= minRequired) break;
        const shiftCode = selectShiftForStation({
          station,
          isExtendedClosing,
          isWeekend,
          staffIndex: stationStaffCount[station.station_id],
          groupClosingTracker
        });
        assignStaff(staff, station, shiftCode, false);
        stationStaffCount[station.station_id]++;
        if (staff.can_solo) stationHasSolo[station.station_id] = true;
      }
    });

    // -------------------------------------------------------------
    // 階段 6.2：【跨站支援調度】（MRV 順序，薄弱站點優先補齊）
    // -------------------------------------------------------------
    sortedStations.forEach(station => {
      const minRequired = getStationMinRequired(station);
      const requiresSolo = station.requires_solo_staff;

      if (stationStaffCount[station.station_id] < minRequired || (requiresSolo && !stationHasSolo[station.station_id])) {
        const supporters = regularStaff.filter(e => 
          canWorkToday(e) && 
          isStationCompatible(e, station.station_id) && 
          e.primary_station !== station.station_id
        ).sort((a, b) => {
          if (requiresSolo && !stationHasSolo[station.station_id]) {
            if (a.can_solo && !b.can_solo) return -1;
            if (!a.can_solo && b.can_solo) return 1;
          }
          return (consecutiveDaysMap[a.emp_id] || 0) - (consecutiveDaysMap[b.emp_id] || 0);
        });

        for (const sup of supporters) {
          if (stationStaffCount[station.station_id] >= minRequired && (!requiresSolo || stationHasSolo[station.station_id])) {
            break;
          }
          const shiftCode = selectShiftForStation({
            station,
            isExtendedClosing,
            isWeekend,
            staffIndex: stationStaffCount[station.station_id],
            groupClosingTracker
          });
          assignStaff(sup, station, shiftCode, true);
          stationStaffCount[station.station_id]++;
          if (sup.can_solo) stationHasSolo[station.station_id] = true;
        }
      }
    });

    // -------------------------------------------------------------
    // 階段 6.3：【PT 人員派工與 Solo 防呆】
    // -------------------------------------------------------------
    sortedStations.forEach(station => {
      const minRequired = getStationMinRequired(station);
      const requiresSolo = station.requires_solo_staff;

      if (stationStaffCount[station.station_id] < minRequired) {
        const availablePTs = ptStaff.filter(pt => 
          canWorkToday(pt) &&
          isStationCompatible(pt, station.station_id) &&
          ptWorkDaysCount[pt.emp_id] < (pt.max_monthly_days || 14)
        ).sort((a, b) => {
          if (requiresSolo && !stationHasSolo[station.station_id]) {
            if (a.can_solo && !b.can_solo) return -1;
            if (!a.can_solo && b.can_solo) return 1;
          }
          return (ptWorkDaysCount[a.emp_id] || 0) - (ptWorkDaysCount[b.emp_id] || 0);
        });

        for (const pt of availablePTs) {
          if (stationStaffCount[station.station_id] >= minRequired) break;

          // 防呆核心：若站內無人 solo 且 station 要求 solo，而此 PT 無 solo 資格，不可單獨獨自值班
          if (requiresSolo && !stationHasSolo[station.station_id] && !pt.can_solo) {
            continue;
          }

          const shiftCode = selectShiftForStation({
            station,
            isExtendedClosing,
            isWeekend,
            staffIndex: stationStaffCount[station.station_id],
            groupClosingTracker
          });
          assignStaff(pt, station, shiftCode, pt.primary_station !== station.station_id);
          stationStaffCount[station.station_id]++;
          if (pt.can_solo) stationHasSolo[station.station_id] = true;
        }
      }
    });

    // -------------------------------------------------------------
    // 階段 6.4：【機動正職支援缺工站點】
    // -------------------------------------------------------------
    regularStaff.forEach(emp => {
      if (!assignedToday.has(emp.emp_id)) {
        const cur = scheduleMap[emp.emp_id][day];
        if (!cur) {
          const needyStation = sortedStations.find(st => {
            const minReq = getStationMinRequired(st);
            return stationStaffCount[st.station_id] < minReq && isStationCompatible(emp, st.station_id);
          });

          const targetStation = needyStation || stations.find(s => s.station_id === emp.primary_station) || stations[0];
          const isSupport = targetStation.station_id !== emp.primary_station;
          const shiftCode = selectShiftForStation({
            station: targetStation,
            isExtendedClosing,
            isWeekend,
            staffIndex: stationStaffCount[targetStation.station_id],
            groupClosingTracker
          });
          assignStaff(emp, targetStation, shiftCode, isSupport);
          stationStaffCount[targetStation.station_id]++;
          if (emp.can_solo) stationHasSolo[targetStation.station_id] = true;
        } else if (cur.shift_type === 'OFF' || cur.shift_type === 'TERM_OFF') {
          consecutiveDaysMap[emp.emp_id] = 0;
        }
      }
    });

    // PT 未派工者標為 OFF
    ptStaff.forEach(pt => {
      if (!assignedToday.has(pt.emp_id)) {
        if (!scheduleMap[pt.emp_id][day]) {
          scheduleMap[pt.emp_id][day] = {
            shift_type: 'OFF',
            station_id: null,
            work_hours: 0,
            is_support: false,
            note: '未出勤'
          };
        }
        consecutiveDaysMap[pt.emp_id] = 0;
      }
    });
  }

  // 7. 最終收斂：嚴格確保正職每人剛好休滿法定天數
  regularStaff.forEach(emp => {
    let offDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      if (scheduleMap[emp.emp_id][d]?.shift_type === 'OFF') offDays++;
    }

    if (offDays < requiredOffDays) {
      for (let d = totalDays; d >= 1 && offDays < requiredOffDays; d--) {
        const item = scheduleMap[emp.emp_id][d];
        if (item && item.shift_type !== 'OFF' && item.shift_type !== 'TERM_OFF' && item.note.includes('機動')) {
          scheduleMap[emp.emp_id][d] = {
            shift_type: 'OFF',
            station_id: null,
            work_hours: 0,
            is_support: false,
            note: '法定例休補足'
          };
          offDays++;
        }
      }
    }
  });

  // 8. 勞基法第 36 條「一例一休」法定假別自動定性程序 (Statutory Leave Categorization)
  // 核心原則：每 7 日週期內指定 1 天為剛性法定例假 (REG_OFF 例)，其餘排休為休息日 (REST_OFF 休)
  // 同仁若已申請 AL(特休)、CT(補休)、SL(病假)、PL(事假) 等，保留該特定假別
  employees.forEach(emp => {
    if (emp.is_self_scheduled) return; // 高管自主排班不覆寫
    const empMap = scheduleMap[emp.emp_id];
    if (!empMap) return;

    for (let cycleStart = 1; cycleStart <= totalDays; cycleStart += 7) {
      const cycleEnd = Math.min(cycleStart + 6, totalDays);
      let hasRegOff = false;

      // 檢查當週是否已有指定之法定例假
      for (let d = cycleStart; d <= cycleEnd; d++) {
        if (empMap[d]?.shift_type === 'REG_OFF') {
          hasRegOff = true;
          break;
        }
      }

      // 當週尚未有例假時，將首個常態休假定性為法定例假 REG_OFF (例)
      // 當週其餘常態休假定性為休息日輪休 REST_OFF (休)
      for (let d = cycleStart; d <= cycleEnd; d++) {
        const item = empMap[d];
        if (item && item.shift_type === 'OFF') {
          if (!hasRegOff) {
            item.shift_type = 'REG_OFF';
            item.note = '勞基法第36條法定例假 (例)';
            hasRegOff = true;
          } else {
            item.shift_type = 'REST_OFF';
            item.note = '勞基法第36條休息日輪休 (休)';
          }
        }
      }
    }
  });

  const durationMs = (performance.now() - startTime).toFixed(2);
  return {
    scheduleMap,
    totalDays,
    durationMs,
    metrics: {
      totalEmployees: employees.length,
      totalDays
    }
  };
}

/**
 * 全新 5 大營運排班算理班別指派函數
 * 1. 清潔組 (ST_CLEAN)：純 A 班，其餘以加班處理（保持）
 * 2. 分組閉店班（每組可只排 1 位 C 班）：
 *    - 選品門市組：ST_MAIN_SHOP / ST_SUB_SHOP
 *    - 美食餐飲組：ST_Gagoo / ST_DINING
 * 3. 服務台 (ST_SERVICE)：只排 D 班與 B 班（第 1 位 D 班，第 2 位及之後 B 班），其餘手動調整
 * 4. 全館基調：平日以 D 班排定；假日延時營業插入 C 班，B 班手動排
 * 5. 營運支援 (ST_ADMIN)：平日 1A 1B，假日 1A 1C
 */
function selectShiftForStation({
  station,
  isExtendedClosing,
  isWeekend,
  staffIndex = 0,
  groupClosingTracker = null
}) {
  const stationId = station.station_id;

  // 規則 1：清潔組排班僅 A 班，其它使用加班方式處理（這點保持）
  if (stationId === 'ST_CLEAN') {
    return 'A';
  }

  // 規則 5：營運支援平日 1A 1B、假日 1A 1C
  if (stationId === 'ST_ADMIN') {
    if (isWeekend || isExtendedClosing) {
      // 假日：第 1 位排 A 班，第 2 位排 C 班，其餘排 A 班
      return staffIndex === 0 ? 'A' : (staffIndex === 1 ? 'C' : 'A');
    } else {
      // 平日：第 1 位排 A 班，第 2 位排 B 班，其餘排 A 班
      return staffIndex === 0 ? 'A' : (staffIndex === 1 ? 'B' : 'A');
    }
  }

  // 規則 3：服務台只排 D、B 班，需要其它班別手動調整
  if (stationId === 'ST_SERVICE') {
    // 平日與假日，第 1 位排 D 班，第 2 位及之後排 B 班
    return staffIndex === 0 ? 'D' : 'B';
  }

  // 規則 4：若為平日常態營業（未延長至 19:00 或非假日）：
  // 全館營業站點以 D 班為基調排定，手動排 B 班
  if (!isWeekend && !isExtendedClosing) {
    return 'D';
  }

  // 規則 2 & 4：假日或延時營業日（19:00 閉店）：延長時間插入 C 班
  // 檢查分組閉店班聯防（每組可只排 1 位 C 班）：
  // 組別 1：本鋪 (ST_MAIN_SHOP) + 小鋪 (ST_SUB_SHOP)
  if (stationId === 'ST_MAIN_SHOP' || stationId === 'ST_SUB_SHOP') {
    if (groupClosingTracker && !groupClosingTracker.SHOP_GROUP) {
      groupClosingTracker.SHOP_GROUP = true;
      return 'C';
    }
    return 'D';
  }

  // 組別 2：GAGOO (ST_Gagoo) + 餐飲 (ST_DINING)
  if (stationId === 'ST_Gagoo' || stationId === 'ST_DINING') {
    if (groupClosingTracker && !groupClosingTracker.GAGOO_DINING_GROUP) {
      groupClosingTracker.GAGOO_DINING_GROUP = true;
      return 'C';
    }
    return 'D';
  }

  // 其它營業站點若明確標記需要閉店班且為第 1 位（isClosingSlot）：
  if (station.requires_closing_shift && staffIndex === 0) {
    return 'C';
  }

  // 假日其餘人力一律以 D 班排定（需要 B 班由主管手動排）
  return 'D';
}

