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
