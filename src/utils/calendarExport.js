// src/utils/calendarExport.js
import { SHIFT_TYPES } from '../types/scheduler.js';

/**
 * 匯出同仁個人專屬 RFC 5545 標準 .ics 行事曆檔案
 * 特色：
 * 1. 包含出勤起訖時間、站點名稱、職責說明
 * 2. 內建出勤前 1 小時提醒 (VALARM)
 * 3. 跨平台相容 iPhone iOS 日曆、Android Google 日曆與 Outlook
 */
export function exportEmployeeToIcs({
  employee,
  scheduleMap,
  stations,
  yearMonth = '2026-09'
}) {
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));
  const [year, month] = yearMonth.split('-').map(Number);
  const empSchedule = scheduleMap[employee.emp_id] || {};

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Xuelu Shift System//RFC5545 Standard//TW',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:學旅班表-${employee.name}`,
    'X-WR-TIMEZONE:Asia/Taipei'
  ];

  const pad = (n) => String(n).padStart(2, '0');

  Object.entries(empSchedule).forEach(([dayStr, shift]) => {
    if (!shift || !shift.shift_type || shift.shift_type === 'OFF' || shift.shift_type === 'TERM_OFF') {
      return;
    }

    const shiftInfo = SHIFT_TYPES[shift.shift_type];
    if (!shiftInfo || !shiftInfo.startTime || shiftInfo.startTime === '-') return;

    const day = Number(dayStr);
    const stationName = stationMap[shift.station_id] || shift.station_id || '學旅營運處';

    const [startH, startM] = shiftInfo.startTime.split(':').map(Number);
    const [endH, endM] = shiftInfo.endTime.split(':').map(Number);

    const dtStart = `${year}${pad(month)}${pad(day)}T${pad(startH)}${pad(startM)}00`;
    const dtEnd = `${year}${pad(month)}${pad(day)}T${pad(endH)}${pad(endM)}00`;
    const uid = `shift-${employee.emp_id}-${yearMonth}-${pad(day)}@xuelu.internal`;
    const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;TZID=Asia/Taipei:${dtStart}`);
    lines.push(`DTEND;TZID=Asia/Taipei:${dtEnd}`);
    lines.push(`SUMMARY:【${shiftInfo.name}】${stationName}`);
    lines.push(`DESCRIPTION:班別: ${shift.shift_type} (${shiftInfo.startTime}~${shiftInfo.endTime})\\n值勤站點: ${stationName}\\n同仁: ${employee.name} (${employee.emp_id})\\n備註: ${shift.note || '正常值勤'}`);
    lines.push(`LOCATION:${stationName}`);
    lines.push('STATUS:CONFIRMED');

    // 提早 1 小時提醒 (VALARM)
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT60M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:提醒：1小時後值勤【${shiftInfo.name}】(${shiftInfo.startTime}) 於 ${stationName}`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  const icsContent = lines.join('\r\n');

  // 觸發瀏覽器下載
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `學旅班表_${employee.name}_${yearMonth}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 匯出全館排班總表 CSV (UTF-8 with BOM，Excel 雙擊開檔不亂碼)
 */
export function exportScheduleToCsv({
  scheduleMap,
  employees,
  stations,
  rules
}) {
  const totalDays = rules.days_in_month || 30;
  const yearMonth = rules.target_year_month || '2026-09';
  const stationMap = Object.fromEntries(stations.map(s => [s.station_id, s.station_name]));

  // CSV 標頭
  const headers = ['工號', '姓名', '角色', '主屬站點'];
  for (let d = 1; d <= totalDays; d++) {
    headers.push(`${d}日`);
  }
  headers.push('總出勤天數', '總休假天數');

  const rows = [headers];

  employees.forEach(emp => {
    let workDays = 0;
    let offDays = 0;
    const row = [
      emp.emp_id,
      emp.name,
      emp.role === 'Leader' ? '組長' : emp.role === 'PT' ? 'PT' : emp.is_self_scheduled ? '主管' : '正職',
      stationMap[emp.primary_station] || emp.primary_station
    ];

    for (let d = 1; d <= totalDays; d++) {
      const shift = scheduleMap[emp.emp_id]?.[d];
      if (!shift || !shift.shift_type) {
        row.push(emp.is_self_scheduled ? '自主排定' : '-');
      } else if (shift.shift_type === 'OFF') {
        offDays++;
        row.push('休');
      } else if (shift.shift_type === 'TERM_OFF') {
        offDays++;
        row.push('離職');
      } else {
        workDays++;
        const stName = stationMap[shift.station_id] || shift.station_id;
        row.push(`${shift.shift_type}(${stName})`);
      }
    }

    row.push(workDays, offDays);
    rows.push(row);
  });

  // 加入 BOM (\uFEFF) 防範 Excel 繁體中文亂碼
  const csvString = '\uFEFF' + rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `學旅營運處全館班表_${yearMonth}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
