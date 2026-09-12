// src/data/swapStore.js
import { SHIFT_TYPES, isWorkingShift, isOffShift } from '../types/scheduler.js';
import { canEmployeeSoloAtStation } from './mockMasterData.js';

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
      reviewer_id: 'B111155',
      reviewer_name: '陳鵬宇',
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
    operator_id: 'B111155',
    operator_name: '陳鵬宇 (營運長)',
    notes: '初始排班種子矩陣生成並經滑動視窗合規檢驗鎖定',
    before_snapshot: null,
    after_snapshot: null // 運行時注入
  }
];

/**
 * 換班前安全預檢函式 (Pre-check Safety Guard)
 * 依照主管最新指導：
 * 1. 勞基法第 36 條 7 休 1 等法定紅線：剛性阻擋 (errors，禁止送單)
 * 2. 雙向跨組支援能力與站點 Solo 對價關係：軟性設關卡 (warnings，增加彈性，單據加註特例供組長初審與高管終審核定)
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
    if (!appCurrentShift || isOffShift(appCurrentShift.shift_type)) {
      return { isSafe: false, errors: [`9月${applicantDay}日您原本已是休假，請選擇原本有出勤的日期進行改休！`], warnings: [] };
    }

    const targetCurrentShift = simMap[applicantId]?.[targetDay];
    if (targetCurrentShift && isWorkingShift(targetCurrentShift.shift_type)) {
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
      if (shift && isWorkingShift(shift.shift_type)) {
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
        return s && s.station_id === origStation.station_id && isWorkingShift(s.shift_type);
      });

      const hasSolo = remainingAssigned.some(e => canEmployeeSoloAtStation(e, origStation.station_id));
      if (origStation.requires_solo_staff && !hasSolo) {
        warnings.push(`提醒：9月${applicantDay}日您改為休假後，${origStation.station_name} 現場將缺少具備獨立顧站 (can_solo) 資格同仁，需組長調派機動支援。`);
      }
    }

    return {
      isSafe: errors.length === 0,
      errors,
      warnings,
      hasSpecialWarning: warnings.length > 0,
      specialWarningList: warnings
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

  // 1. 雙向跨組支援資格檢驗 (對價關係軟性關卡：依主管指示不剛性阻止，記錄警告供二階主管核決)
  // A. 檢驗申請人 (applicant) 是否具備對調對象出勤站點之支援能力
  if (tarShift && tarShift.station_id && isWorkingShift(tarShift.shift_type)) {
    const isAppQualifiedForTarStation = (
      appEmp.primary_station === tarShift.station_id || 
      appEmp.supported_stations?.includes(tarShift.station_id)
    );
    if (!isAppQualifiedForTarStation) {
      const tarStationName = stationMap[tarShift.station_id]?.station_name || tarShift.station_id;
      warnings.push(`⚠️ 跨組支援特例：申請人 ${appEmp.name} 未具備「${tarStationName}」之常規支援資格！本單需組長與高管特准。`);
    }
  }

  // B. 檢驗對調對象 (target) 是否具備申請人出勤站點之支援能力
  if (appShift && appShift.station_id && isWorkingShift(appShift.shift_type)) {
    const isTarQualifiedForAppStation = (
      tarEmp.primary_station === appShift.station_id || 
      tarEmp.supported_stations?.includes(appShift.station_id)
    );
    if (!isTarQualifiedForAppStation) {
      const appStationName = stationMap[appShift.station_id]?.station_name || appShift.station_id;
      warnings.push(`⚠️ 跨組支援特例：對調同仁 ${tarEmp.name} 未具備「${appStationName}」之常規支援資格！本單需組長與高管特准。`);
    }
  }

  // 2. 執行虛擬對調排班模擬（防呆：確保 simMap 中存在雙方員工物件）
  if (!simMap[applicantId]) simMap[applicantId] = {};
  if (!simMap[targetId]) simMap[targetId] = {};

  if (applicantDay === targetDay) {
    simMap[applicantId][applicantDay] = tarShift ? { ...tarShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
    simMap[targetId][targetDay] = appShift ? { ...appShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
  } else {
    // 跨日互調：雙方互換彼此出勤日的班別與站點
    simMap[applicantId][targetDay] = tarShift ? { ...tarShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
    simMap[targetId][targetDay] = { shift_type: 'OFF', station_id: null, work_hours: 0 };

    simMap[targetId][applicantDay] = appShift ? { ...appShift } : { shift_type: 'OFF', station_id: null, work_hours: 0 };
    simMap[applicantId][applicantDay] = { shift_type: 'OFF', station_id: null, work_hours: 0 };
  }

  // 3. 檢驗連續上班天數與 7 休 1 (剛性法律底線：勞基法第 36 條)
  [appEmp, tarEmp].forEach(emp => {
    let consecutive = monthBorders['2026-09']?.[emp.emp_id]?.consecutive_work_days_at_end || 0;
    for (let d = 1; d <= 30; d++) {
      const shift = simMap[emp.emp_id]?.[d];
      if (shift && isWorkingShift(shift.shift_type)) {
        consecutive++;
        if (consecutive > 6) {
          errors.push(`換班後將導致 ${emp.name} 於第 ${d} 天起連續出勤達 ${consecutive} 天（違反《勞基法》第 36 條 7 休 1 規定）！`);
          break;
        }
      } else {
        consecutive = 0;
      }
    }
  });

  // 4. 檢驗站點在勤人員之獨立顧站 (Solo) 能力 (軟性關卡：依各站 solo 開關判定，缺 solo 則跳特例警告)
  const daysToCheck = Array.from(new Set([applicantDay, targetDay]));
  daysToCheck.forEach(d => {
    stations.forEach(station => {
      const assigned = employees.filter(e => {
        const s = simMap[e.emp_id]?.[d];
        return s && s.station_id === station.station_id && isWorkingShift(s.shift_type);
      });

      if (station.requires_solo_staff && assigned.length > 0) {
        const hasSolo = assigned.some(e => canEmployeeSoloAtStation(e, station.station_id));
        if (!hasSolo) {
          warnings.push(`⚠️ 現場缺Solo擔當：9月${d}日換班後，${station.station_name} 現場在勤同仁皆無該站獨立顧站 (Solo) 資格！需組長調派支援或親自帶班。`);
        }
      }
    });
  });

  return {
    isSafe: errors.length === 0, // 只要沒有勞基法 7 休 1 等剛性違法，即允許提出申請！
    errors,
    warnings,
    hasSpecialWarning: warnings.length > 0,
    specialWarningList: warnings
  };
}

