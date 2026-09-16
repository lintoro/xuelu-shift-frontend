// src/utils/employeeSortUtils.js

/**
 * 全系統統一同仁排序工具 (SSOT)
 * 排序標準：部分/站點 (primary_station) ➔ 級職 (role: Manager -> Leader -> Staff -> PT) ➔ 到職日 (hire_date 由早至晚)
 */

export const STATION_ORDER = [
  'ST_ADMIN',
  'ST_SERVICE',
  'ST_EXPERIENCE',
  'ST_MSS',
  'ST_MAIN_SHOP',
  'ST_SUB_SHOP',
  'ST_CLEAN',
  'ST_DINING',
  'ST_Gagoo'
];

export const ROLE_ORDER = {
  'Manager': 1,
  'Leader': 2,
  'Staff': 3,
  'PT': 4
};

/**
 * 統一排序同仁陣列
 * @param {Array} employees 
 * @returns {Array} 排序後的同仁陣列副本
 */
export function sortEmployees(employees = []) {
  if (!Array.isArray(employees)) return [];

  return [...employees].sort((a, b) => {
    // 1. 部門 / 主屬站點 排序
    const stationA = a.primary_station || a.station_id || a.station || a.department || '';
    const stationB = b.primary_station || b.station_id || b.station || b.department || '';
    
    let indexA = STATION_ORDER.indexOf(stationA);
    let indexB = STATION_ORDER.indexOf(stationB);
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    if (indexA !== indexB) {
      return indexA - indexB;
    }

    // 2. 級職 排序 (Manager ➔ Leader ➔ Staff ➔ PT)
    const roleA = ROLE_ORDER[a.role] || 99;
    const roleB = ROLE_ORDER[b.role] || 99;

    if (roleA !== roleB) {
      return roleA - roleB;
    }

    // 3. 到職日 排序 (早到職優先)
    const dateAStr = a.hire_date || a.hireDate || a.start_date || '9999-12-31';
    const dateBStr = b.hire_date || b.hireDate || b.start_date || '9999-12-31';
    const timeA = new Date(dateAStr).getTime() || 9999999999999;
    const timeB = new Date(dateBStr).getTime() || 9999999999999;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 4. 次要：工號
    return (a.emp_id || a.id || '').localeCompare(b.emp_id || b.id || '');
  });
}
