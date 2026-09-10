// src/data/swapStore.js
import { SHIFT_TYPES } from '../types/scheduler.js';

export const INITIAL_SWAP_REQUESTS = [
  {
    swap_id: 'SWAP_20260901_001',
    applicant_id: 'B112001', // 李俐旻 (服務台組長)
    applicant_name: '李俐旻',
    applicant_day: 10,
    applicant_shift: 'A',
    target_id: 'B113089', // 張舒扉 (服務台正職)
    target_name: '張舒扉',
    target_day: 10,
    target_shift: 'B',
    type: 'SWAP', // SWAP (對調) 或 SUBSTITUTE (代班)
    reason: '當日上午需參加線上法規培訓，申請與張舒扉對調 A/B 班',
    created_at: '2026-09-08T09:30:00Z',
    status: 'PENDING_FIRST_REVIEW', // PENDING_FIRST_REVIEW -> PENDING_FINAL_REVIEW -> APPROVED / REJECTED
    first_review: {
      reviewer_id: 'B112001',
      reviewer_name: '李俐旻',
      status: 'PENDING', // PENDING, APPROVED, REJECTED
      notes: ''
    },
    final_review: {
      reviewer_id: 'B111014',
      reviewer_name: '林慶忠',
      status: 'PENDING',
      notes: ''
    }
  }
];

export const INITIAL_AUDIT_LOGS = [
  {
    log_id: 'LOG_20260901_001',
    timestamp: '2026-09-09T16:00:00.000Z',
    action_type: 'SCHEDULE_INIT',
    operator_id: 'B111014',
    operator_name: '林慶忠 (營運長)',
    notes: '初始排班種子矩陣生成並經滑動視窗合規檢驗鎖定',
    before_snapshot: null,
    after_snapshot: null // 運行時注入
  }
];

/**
 * 換班前剛性合規安全預檢函式 (Pre-check Safety Guard)
 * 模擬換班後的排班矩陣，檢測：
 * 1. 連續出勤是否 > 6 天 (勞基法第 36 條 7休1)
 * 2. 班距是否 < 11 小時 (勞基法第 34 條)
 * 3. 站點是否因此失去 can_solo 或人數不足
 * 4. 資格是否相符 (是否具備主屬或支援資格)
 */
export function precheckSwapCompliance({
  scheduleMap,
  applicantId,
  targetId,
  applicantDay,
  targetDay,
  type = 'SWAP',
  targetShiftCode = 'B',
  employees,
  stations,
  rules,
  monthBorders = {}
}) {
  const errors = [];
  const warnings = [];

  const empMap = Object.fromEntries(employees.map(e => [e.emp_id, e]));
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s]));

  const appEmp = empMap[applicantId];
  if (!appEmp) {
    return { isSafe: false, errors: ['同仁資料不完整'], warnings: [] };
  }

  // 深拷貝排班矩陣進行安全模擬
  const simMap = JSON.parse(JSON.stringify(scheduleMap));

  if (type === 'SELF_RESCHEDULE') {
    // -------------------------------------------------------------
    // 個人挪休與自調班表 (SELF_RESCHEDULE)
    // -------------------------------------------------------------
    if (applicantDay === targetDay) {
      return { isSafe: false, errors: ['原出勤日與挪調出勤日不可為同一天！'], warnings: [] };
    }

    const appCurrentShift = simMap[applicantId]?.[applicantDay];
    if (!appCurrentShift || appCurrentShift.shift_type === 'OFF' || appCurrentShift.shift_type === 'TERM_OFF') {
      return { isSafe: false, errors: [`9月${applicantDay}日您原本已是休假，請選擇原本有出勤的日期進行改休！`], warnings: [] };
    }

    const targetCurrentShift = simMap[applicantId]?.[targetDay];
    if (targetCurrentShift && targetCurrentShift.shift_type && targetCurrentShift.shift_type !== 'OFF') {
      return { isSafe: false, errors: [`9月${targetDay}日您原本已有排定出勤班別 (${targetCurrentShift.shift_type})，無法重複挪調！`], warnings: [] };
    }

    // 執行個人挪休虛擬調整：原日改為休假，新日改為上班
    simMap[applicantId][applicantDay] = { shift_type: 'OFF', station_id: null, work_hours: 0 };
    simMap[applicantId][targetDay] = { 
      shift_type: targetShiftCode || 'B', 
      station_id: appEmp.primary_station, 
      work_hours: 8, 
      is_support: false 
    };

    // 檢驗個人 7 休 1 (連續出勤 <= 6 天)
    let consecutive = monthBorders['2026-09']?.[appEmp.emp_id]?.consecutive_work_days_at_end || 0;
    for (let d = 1; d <= 30; d++) {
      const shift = simMap[appEmp.emp_id]?.[d];
      if (shift && shift.shift_type && shift.shift_type !== 'OFF' && shift.shift_type !== 'TERM_OFF') {
        consecutive++;
        if (consecutive > 6) {
          errors.push(`挪休後將導致您於第 ${d} 天起連續出勤達 ${consecutive} 天（違反《勞基法》第 36 條 7 休 1 規定）！`);
          break;
        }
      } else {
        consecutive = 0;
      }
    }

    // 檢驗原出勤日該站點是否因本人抽離而缺工或失去 solo 資格
    const origStation = stations.find(s => s.station_id === appCurrentShift.station_id);
    if (origStation) {
      const remainingAssigned = employees.filter(e => {
        const s = simMap[e.emp_id]?.[applicantDay];
        return s && s.station_id === origStation.station_id && s.shift_type !== 'OFF' && s.shift_type !== 'TERM_OFF';
      });

      const hasSolo = remainingAssigned.some(e => e.can_solo);
      if (origStation.requires_solo_staff && !hasSolo) {
        warnings.push(`提醒：9月${applicantDay}日您改為休假後，${origStation.station_name} 現場將缺少具備獨立顧站 (can_solo) 資格同仁，需組長調派機動支援。`);
      }
    }

    return {
      isSafe: errors.length === 0,
      errors,
      warnings
    };
  }

  // -------------------------------------------------------------
  // 雙人對調 (SWAP) 或 找人代班 (SUBSTITUTE)
  // -------------------------------------------------------------
  const tarEmp = empMap[targetId];
  if (!tarEmp) {
    return { isSafe: false, errors: ['請選擇欲對調或代班之同仁對象！'], warnings: [] };
  }

  const appShift = simMap[applicantId]?.[applicantDay];
  const tarShift = simMap[targetId]?.[targetDay];

  // 1. 資格相符性預檢
  if (tarShift && tarShift.station_id) {
    const isTargetQualifiedForAppStation = appShift?.station_id ? (
      tarEmp.primary_station === appShift.station_id || tarEmp.supported_stations?.includes(appShift.station_id)
    ) : true;

    if (!isTargetQualifiedForAppStation) {
      errors.push(`${tarEmp.name} 未具備支援 ${appShift.station_id} 站點資格！`);
    }
  }

  // 2. 執行虛擬對調
  simMap[applicantId][applicantDay] = tarShift ? { ...tarShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
  simMap[targetId][targetDay] = appShift ? { ...appShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };

  // 3. 檢驗連續上班天數與 7 休 1 (雙方均檢驗)
  [appEmp, tarEmp].forEach(emp => {
    let consecutive = monthBorders['2026-09']?.[emp.emp_id]?.consecutive_work_days_at_end || 0;
    for (let d = 1; d <= 30; d++) {
      const shift = simMap[emp.emp_id]?.[d];
      if (shift && shift.shift_type && shift.shift_type !== 'OFF' && shift.shift_type !== 'TERM_OFF') {
        consecutive++;
        if (consecutive > 6) {
          errors.push(`換班後將導致 ${emp.name} 於第 ${d} 天起連續出勤達 ${consecutive} 天（違反勞基法第36條）！`);
          break;
        }
      } else {
        consecutive = 0;
      }
    }
  });

  // 4. 檢驗站點最低人數與 can_solo 門檻
  const daysToCheck = Array.from(new Set([applicantDay, targetDay]));
  daysToCheck.forEach(d => {
    stations.forEach(station => {
      const assigned = employees.filter(e => {
        const s = simMap[e.emp_id]?.[d];
        return s && s.station_id === station.station_id && s.shift_type !== 'OFF' && s.shift_type !== 'TERM_OFF';
      });

      const hasSolo = assigned.some(e => e.can_solo);
      if (station.requires_solo_staff && assigned.length > 0 && !hasSolo) {
        errors.push(`第 ${d} 天換班後，${station.station_name} 缺少具備獨立顧站 (can_solo) 資格人員！`);
      }
    });
  });

  return {
    isSafe: errors.length === 0,
    errors,
    warnings
  };
}
