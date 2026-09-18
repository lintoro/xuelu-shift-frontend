// src/utils/timeFormatUtils.js

/**
 * 時間格式安全解析器：消除 1899-12-30T00:30:00.000Z 渲染異常，格式化為台灣時間 HH:mm
 */
export function formatShiftTime(val) {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '-';
  const s = String(val).trim();
  if (s.includes('1899') || s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins}`;
    }
  }
  if (/^\d{1,2}:\d{2}/.test(s)) {
    const parts = s.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1]}`;
  }
  return s;
}

/**
 * 台灣時區日期時間格式化函式 (Asia/Taipei GMT+8)
 * 接收 Date 物件、時間戳或 ISO 字串 (如 '2026-09-18T17:13:00.000Z')
 * 精準輸出：YYYY-MM-DD HH:mm (例如 '2026-09-19 01:13')
 */
export function formatTaiwanDateTime(dateInput = new Date()) {
  if (!dateInput) return '-';
  const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);

  const formatter = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(d).replace(/\//g, '-');
}
