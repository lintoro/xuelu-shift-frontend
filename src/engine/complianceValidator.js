// src/engine/complianceValidator.js
import { SHIFT_TYPES, ALERT_LEVELS, isWorkingShift, isOffShift } from '../types/scheduler.js';

/**
 * 勞基法全方位合規檢核器與站點三級燈號判定模組
 * 包含：
 * 1. 跨月滑動視窗 (Sliding Window) 檢驗連續出勤 <= 6 天 (常態工時)
 * 2. 輪班間隔 >= 11 小時檢驗 (勞基法第 34 條)
 * 3. 站點出勤門檻與 can_solo 資格判定 (🟢 綠燈 / 🟡 黃燈 / 🔴 紅燈)
 * 4. 假日營業站點 C 班打烊專責檢核
 * 5. PT 約定天數消耗監控
 */
export function validateScheduleCompliance({
  scheduleMap,
  employees,
  stations,
  rules,
  monthBorders = {}
}) {
  const totalDays = rules.days_in_month || 30;
  const currentYM = new Date().toISOString().slice(0, 7);
  const yearMonth = rules.target_year_month || currentYM;
  const borderData = monthBorders[yearMonth] || {};

  const issues = [];
  const stationDailyStatus = {}; // [station_id][day] = { level, count, minRequired, hasSolo, supportOptions }
  const employeeStats = {}; // [emp_id] = { workDays, offDays, totalHours, maxConsecutive, violations }

  // 1. 站點逐日三級燈號判定
  stations.forEach(st => {
    stationDailyStatus[st.station_id] = {};
  });

  const [year, month] = yearMonth.split('-').map(Number);

  for (let d = 1; d <= totalDays; d++) {
    const dateObj = new Date(year, month - 1, d);
    const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

    // 收集今日全館在勤人員清單（用於黃燈機動支援判定）
    const allWorkingStaffToday = [];
    employees.forEach(emp => {
      const assignment = scheduleMap[emp.emp_id]?.[d];
      if (isWorkingShift(assignment?.shift_type)) {
        allWorkingStaffToday.push(emp);
      }
    });

    stations.forEach(station => {
      const minRequired = isWeekend ? station.min_staff_weekend : station.min_staff_weekday;
      const requiresSolo = station.requires_solo_staff;

      // 計算目前已專責指派至該站的人員
      const assignedToStation = employees.filter(emp => {
        const item = scheduleMap[emp.emp_id]?.[d];
        return item && item.station_id === station.station_id && isWorkingShift(item.shift_type);
      });

      // 檢查此站是否有高階主管自主排班保留名額 (Executive Self-Scheduling Reserved Slot)
      const selfScheduledManagers = employees.filter(emp => emp.is_self_scheduled && emp.primary_station === station.station_id);
      const reservedSlots = selfScheduledManagers.length;

      const assignedCount = assignedToStation.length + reservedSlots;
      const hasSolo = assignedToStation.some(e => e.can_solo) || selfScheduledManagers.some(e => e.can_solo);

      // 判定三級燈號
      let level = 'GREEN';
      let message = '人力充足且滿足獨立顧站';
      const supportOptions = [];

      if (assignedCount >= minRequired && (!requiresSolo || hasSolo)) {
        level = 'GREEN';
      } else {
        // 專責不足或缺 solo，檢查全館是否有機動支援候選人
        const availableSupporters = allWorkingStaffToday.filter(emp => 
          emp.supported_stations?.includes(station.station_id) && 
          scheduleMap[emp.emp_id]?.[d]?.station_id !== station.station_id
        );

        if (availableSupporters.length > 0 && (!requiresSolo || hasSolo || availableSupporters.some(e => e.can_solo))) {
          level = 'YELLOW';
          message = `專責不足 (現有 ${assignedCount}/${minRequired} 人)，但全館有 ${availableSupporters.map(e => e.name).join('、')} 可機動支援`;
          supportOptions.push(...availableSupporters.map(e => e.name));
        } else {
          level = 'RED';
          message = `嚴重空窗！缺工 ${minRequired - assignedCount} 人，且全館無具備資格之同仁可支援`;
          issues.push({
            type: 'STATION_SHORTAGE',
            severity: 'CRITICAL',
            day: d,
            station_id: station.station_id,
            station_name: station.station_name,
            message
          });
        }
      }

      stationDailyStatus[station.station_id][d] = {
        level,
        count: assignedCount,
        minRequired,
        hasSolo,
        message,
        supportOptions
      };
    });

    // -------------------------------------------------------------
    // 全新規則檢驗：
    // 1. 假日 C 班打烊規定（分組聯防，每組僅需 1 位 C 班；清潔組純 A 班、服務台純 D/B 班免驗）
    // -------------------------------------------------------------
    if (isWeekend) {
      // 分組 1：本鋪 (ST_MAIN_SHOP) + 小鋪 (ST_SUB_SHOP)
      const shopGroupStaff = employees.filter(emp => {
        const s = scheduleMap[emp.emp_id]?.[d];
        return s && (s.station_id === 'ST_MAIN_SHOP' || s.station_id === 'ST_SUB_SHOP') && isWorkingShift(s.shift_type);
      });
      const hasShopGroupC = shopGroupStaff.some(emp => scheduleMap[emp.emp_id][d].shift_type === 'C');
      if (shopGroupStaff.length > 0 && !hasShopGroupC) {
        issues.push({
          type: 'MISSING_CLOSING_SHIFT',
          severity: 'WARNING',
          day: d,
          station_id: 'ST_MAIN_SHOP',
          station_name: '門市選品組(本鋪/小鋪)',
          message: `假日選品門市組（本鋪/小鋪）未排定 C 班專責打烊同仁`
        });
      }

      // 分組 2：GAGOO (ST_Gagoo) + 餐飲 (ST_DINING)
      const diningGroupStaff = employees.filter(emp => {
        const s = scheduleMap[emp.emp_id]?.[d];
        return s && (s.station_id === 'ST_Gagoo' || s.station_id === 'ST_DINING') && isWorkingShift(s.shift_type);
      });
      const hasDiningGroupC = diningGroupStaff.some(emp => scheduleMap[emp.emp_id][d].shift_type === 'C');
      if (diningGroupStaff.length > 0 && !hasDiningGroupC) {
        issues.push({
          type: 'MISSING_CLOSING_SHIFT',
          severity: 'WARNING',
          day: d,
          station_id: 'ST_Gagoo',
          station_name: '美食餐飲組(GAGOO/餐飲)',
          message: `假日美食餐飲組（GAGOO/餐飲）未排定 C 班專責打烊同仁`
        });
      }

      // 檢查其他非分組營業站點（排除清潔組純A班、服務台純D/B班）
      stations.forEach(station => {
        if (['ST_CLEAN', 'ST_SERVICE', 'ST_MAIN_SHOP', 'ST_SUB_SHOP', 'ST_Gagoo', 'ST_DINING'].includes(station.station_id)) {
          return;
        }
        if (station.requires_closing_shift) {
          const assignedToStation = employees.filter(emp => scheduleMap[emp.emp_id]?.[d]?.station_id === station.station_id && isWorkingShift(scheduleMap[emp.emp_id][d]?.shift_type));
          const hasC = assignedToStation.some(emp => scheduleMap[emp.emp_id][d].shift_type === 'C');
          if (assignedToStation.length > 0 && !hasC) {
            issues.push({
              type: 'MISSING_CLOSING_SHIFT',
              severity: 'WARNING',
              day: d,
              station_id: station.station_id,
              station_name: station.station_name,
              message: `假日營業站點未排定 C 班專責打烊同仁`
            });
          }
        }
      });
    }

    // -------------------------------------------------------------
    // 2. 營運支援人力檢驗：平日 1A 1B、假日 1A 1C
    // 若有空班，精準產出 ADMIN_SHIFT_DEFICIT 警示供介面提示手動修正
    // -------------------------------------------------------------
    const adminStaffToday = employees.filter(emp => {
      const s = scheduleMap[emp.emp_id]?.[d];
      return s && s.station_id === 'ST_ADMIN' && isWorkingShift(s.shift_type);
    });
    const adminShifts = adminStaffToday.map(emp => scheduleMap[emp.emp_id][d].shift_type);
    const hasA = adminShifts.includes('A');
    const hasB = adminShifts.includes('B');
    const hasC = adminShifts.includes('C');

    // 依使用者指示：不再檢查與顯示營運支援空班缺工警示 (ADMIN_SHIFT_DEFICIT)
  }

  // 2. 個人出勤法規檢驗（連續工作日、班距、總工時）
  employees.forEach(emp => {
    let workDays = 0;
    let offDays = 0;
    let totalHours = 0;
    let maxConsecutive = 0;
    let currentConsecutive = borderData[emp.emp_id]?.consecutive_work_days_at_end || 0;
    const violations = [];

    for (let d = 1; d <= totalDays; d++) {
      const current = scheduleMap[emp.emp_id]?.[d];
      const isWorking = isWorkingShift(current?.shift_type);

      if (isWorking) {
        workDays++;
        totalHours += (current.work_hours || 8);
        currentConsecutive++;

        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
        }

        // 依工時模式檢驗連續工作上限：
        // 1. 常態工時 (7休1)：依第36條第1項，每7日1例1休，連出勤上限 6 天
        // 2. 雙週變形 (30條2項)：依第36條第2項第1款，每7日至少1例假，連出勤上限仍為 6 天！
        // 3. 四週變形 (30-1條)：依第30-1條，2週至少2例假，連出勤上限 10 天
        const maxConsecutiveLimit = rules.work_hour_model === 'FLEX_4_WEEK' ? 10 : 6;
        if (currentConsecutive > maxConsecutiveLimit) {
          const lawRef = rules.work_hour_model === 'FLEX_2_WEEK' 
            ? '勞基法第36條第2項第1款(雙週變形每7日至少1例)' 
            : rules.work_hour_model === 'FLEX_4_WEEK'
            ? '勞基法第30-1條(四週變形連出勤極限10天)'
            : '勞基法第36條第1項(每7日應有2日休息)';
          
          violations.push({
            day: d,
            rule: `連續工作超過${maxConsecutiveLimit}天`,
            law: lawRef,
            message: `自前月或本月已連續出勤達 ${currentConsecutive} 天（法定上限為 ${maxConsecutiveLimit} 天）`
          });
          issues.push({
            type: 'CONSECUTIVE_OVERWORK',
            severity: 'CRITICAL',
            day: d,
            emp_id: emp.emp_id,
            emp_name: emp.name,
            message: `${emp.name} 已連續出勤 ${currentConsecutive} 天（超過上限 ${maxConsecutiveLimit} 天，違反${lawRef}）`
          });
        }

        // 輪班間隔 >= 11 小時檢驗 (勞基法第34條)
        if (d > 1) {
          const prev = scheduleMap[emp.emp_id]?.[d - 1];
          if (isWorkingShift(prev?.shift_type)) {
            const prevShift = SHIFT_TYPES[prev.shift_type];
            const currShift = SHIFT_TYPES[current.shift_type];

            if (prevShift && currShift) {
              const interval = calculateShiftInterval(prevShift.endTime, currShift.startTime);
              if (interval < 11) {
                violations.push({
                  day: d,
                  rule: '輪班間隔不足11小時',
                  law: '勞基法第34條',
                  message: `前日 ${prevShift.endTime} 下班，今日 ${currShift.startTime} 上班，間隔僅 ${interval} 小時`
                });
                issues.push({
                  type: 'INSUFFICIENT_INTERVAL',
                  severity: 'CRITICAL',
                  day: d,
                  emp_id: emp.emp_id,
                  emp_name: emp.name,
                  message: `${emp.name} 輪班間隔僅 ${interval} 小時（不足11小時）`
                });
              }
            }
          }
        }
      } else {
        offDays++;
        currentConsecutive = 0;
      }
    }

    // 雙週變形專屬剛性檢核 (勞基法第36條第2項第1款：每2週內例假及休息日至少4日)
    if (rules.work_hour_model === 'FLEX_2_WEEK' && !emp.is_self_scheduled && emp.role !== 'PT') {
      for (let d = 14; d <= totalDays; d++) {
        let windowOffDays = 0;
        for (let wd = d - 13; wd <= d; wd++) {
          const item = scheduleMap[emp.emp_id]?.[wd];
          if (!item || isOffShift(item.shift_type) || item.work_hours === 0) {
            windowOffDays++;
          }
        }
        if (windowOffDays < 4) {
          violations.push({
            day: d,
            rule: '雙週例休不足4日',
            law: '勞基法第36條第2項第1款',
            message: `第 ${d - 13}～${d} 天之 14 日區間內僅排休 ${windowOffDays} 天（法定應至少 4 日）`
          });
          issues.push({
            type: 'BIWEEKLY_OFF_SHORTAGE',
            severity: 'CRITICAL',
            day: d,
            emp_id: emp.emp_id,
            emp_name: emp.name,
            message: `${emp.name} 於 14 日滑動區間（第 ${d - 13}～${d} 天）僅排休 ${windowOffDays} 天，不足雙週法定 4 日例休（違反勞基法第36條第2項第1款）`
          });
          break; // 避免同一人連續滾動多天重複刷頻
        }
      }
    }

    // 四週變形專屬剛性檢核 (勞基法第30-1條：2週2例、4週8休)
    if (rules.work_hour_model === 'FLEX_4_WEEK' && !emp.is_self_scheduled && emp.role !== 'PT') {
      // 檢核 2 週至少 2 例
      for (let d = 14; d <= totalDays; d += 14) {
        let biWeeklyOff = 0;
        for (let wd = d - 13; wd <= d; wd++) {
          const item = scheduleMap[emp.emp_id]?.[wd];
          if (!item || isOffShift(item.shift_type)) biWeeklyOff++;
        }
        if (biWeeklyOff < 2) {
          issues.push({
            type: 'FOUR_WEEK_BIWEEKLY_SHORTAGE',
            severity: 'CRITICAL',
            day: d,
            emp_id: emp.emp_id,
            emp_name: emp.name,
            message: `${emp.name} 於第 ${d - 13}～${d} 天（2週區間）例休僅 ${biWeeklyOff} 天，違反四週變形「2週至少2例」規範`
          });
        }
      }
      // 檢核 4 週至少 8 休
      if (totalDays >= 28) {
        let fourWeekOff = 0;
        for (let wd = 1; wd <= 28; wd++) {
          const item = scheduleMap[emp.emp_id]?.[wd];
          if (!item || isOffShift(item.shift_type)) fourWeekOff++;
        }
        if (fourWeekOff < 8) {
          issues.push({
            type: 'FOUR_WEEK_TOTAL_SHORTAGE',
            severity: 'CRITICAL',
            day: 28,
            emp_id: emp.emp_id,
            emp_name: emp.name,
            message: `${emp.name} 於前 28 日（4週區間）例休僅 ${fourWeekOff} 天，不足四週變形法定 8 日例休`
          });
        }
      }
    }

    // PT 約定天數上限檢核
    if (emp.role === 'PT' && emp.max_monthly_days && workDays > emp.max_monthly_days) {
      issues.push({
        type: 'PT_QUOTA_EXCEEDED',
        severity: 'WARNING',
        emp_id: emp.emp_id,
        emp_name: emp.name,
        message: `PT ${emp.name} 排班 ${workDays} 天，已超出每月約定上限 ${emp.max_monthly_days} 天`
      });
    }

    employeeStats[emp.emp_id] = {
      workDays,
      offDays,
      totalHours,
      maxConsecutive,
      violations
    };
  });

  const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter(i => i.severity === 'WARNING').length;

  return {
    isValid: criticalCount === 0,
    criticalCount,
    warningCount,
    issues,
    stationDailyStatus,
    employeeStats
  };
}

/**
 * 計算次日起班與前日退班之休息時數
 */
function calculateShiftInterval(prevEndTimeStr, currStartTimeStr) {
  const [prevH, prevM] = prevEndTimeStr.split(':').map(Number);
  const [currH, currM] = currStartTimeStr.split(':').map(Number);

  // 前日下班至午夜 24:00 + 午夜至今日上班
  const prevToMidnight = (24 - prevH) - (prevM / 60);
  const midnightToCurr = currH + (currM / 60);
  return Math.round((prevToMidnight + midnightToCurr) * 10) / 10;
}
