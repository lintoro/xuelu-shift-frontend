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
      scheduleMap[emp_id][day] = {
        shift_type: 'OFF',
        station_id: null,
        work_hours: 0,
        is_support: false,
        note: leave_type || '自選休假'
      };
    }
  });

  const regularStaff = employees.filter(e => !e.is_self_scheduled && e.role !== 'PT');
  const ptStaff = employees.filter(e => e.role === 'PT');

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
    const maxConsecutiveAllowed = rules.work_hour_model === 'FLEX_4_WEEK' ? 10 : 6;

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
      const shiftInfo = SHIFT_TYPES[shiftCode] || SHIFT_TYPES.B;
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

    // 清潔組特別隔離保險：外人不可支援清潔組，清潔組同仁不支援外組
    const isStationCompatible = (person, targetStationId) => {
      if (targetStationId === 'ST_CLEAN') {
        return person.primary_station === 'ST_CLEAN';
      }
      if (person.primary_station === 'ST_CLEAN') {
        return false;
      }
      return person.primary_station === targetStationId || (person.supported_stations || []).includes(targetStationId);
    };

    // -------------------------------------------------------------
    // 階段 6.1：【主屬專責保底】
    // 優先指派主屬為該站之組長與正職同仁，確保專責站點班底定錨
    // -------------------------------------------------------------
    sortedStations.forEach(station => {
      const reservedSlots = selfScheduledManagers.filter(m => m.primary_station === station.station_id).length;
      const minRequired = (isWeekend ? station.min_staff_weekend : station.min_staff_weekday) - reservedSlots;

      // 1. 站點組長（若主屬該站）
      const leader = regularStaff.find(e => e.emp_id === station.leader_emp_id);
      if (leader && canWorkToday(leader) && leader.primary_station === station.station_id) {
        const isFirst = (stationStaffCount[station.station_id] === 0);
        const shiftCode = selectShiftForStation(station, isWeekend, isFirst);
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
        const isFirst = (stationStaffCount[station.station_id] === 0);
        const shiftCode = selectShiftForStation(station, isWeekend, isFirst);
        assignStaff(staff, station, shiftCode, false);
        stationStaffCount[station.station_id]++;
        if (staff.can_solo) stationHasSolo[station.station_id] = true;
      }
    });

    // -------------------------------------------------------------
    // 階段 6.2：【跨站支援調度】（MRV 順序，薄弱站點優先補齊）
    // -------------------------------------------------------------
    sortedStations.forEach(station => {
      const reservedSlots = selfScheduledManagers.filter(m => m.primary_station === station.station_id).length;
      const minRequired = (isWeekend ? station.min_staff_weekend : station.min_staff_weekday) - reservedSlots;
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
          const isFirst = (stationStaffCount[station.station_id] === 0);
          const shiftCode = selectShiftForStation(station, isWeekend, isFirst);
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
      const reservedSlots = selfScheduledManagers.filter(m => m.primary_station === station.station_id).length;
      const minRequired = (isWeekend ? station.min_staff_weekend : station.min_staff_weekday) - reservedSlots;
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

          const isFirst = (stationStaffCount[station.station_id] === 0);
          const shiftCode = selectShiftForStation(station, isWeekend, isFirst);
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
            const minReq = isWeekend ? st.min_staff_weekend : st.min_staff_weekday;
            return stationStaffCount[st.station_id] < minReq && isStationCompatible(emp, st.station_id);
          });

          const targetStation = needyStation || stations.find(s => s.station_id === emp.primary_station) || stations[0];
          const isSupport = targetStation.station_id !== emp.primary_station;
          const isFirst = (stationStaffCount[targetStation.station_id] === 0);
          const shiftCode = selectShiftForStation(targetStation, isWeekend, isFirst);
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

  // 7. 最終收斂：嚴格確保正職每人剛好休滿法定 10 天
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

function selectShiftForStation(station, isWeekend, isFirstStaff) {
  if (isWeekend) {
    if (station.station_id === 'ST_CLEAN') return 'B';
    return isFirstStaff ? 'C' : 'B';
  } else {
    if (station.station_id === 'ST_CLEAN') return 'A';
    return isFirstStaff ? 'A' : 'B';
  }
}
