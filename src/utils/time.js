/**
 * Time utilities for Vietnam timezone display
 * All times displayed in Asia/Ho_Chi_Minh (UTC+7)
 */

const TZ = 'Asia/Ho_Chi_Minh';

const DAYS_VI = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Parse the API's local_date string "MM/DD/YYYY HH:mm"
 * The API uses US-hosted servers; local_date appears to be US Central time (UTC-5).
 * We'll convert to Vietnam time (UTC+7), so add 12 hours.
 */
export function parseMatchDate(localDateStr) {
  if (!localDateStr) return null;
  // Format: "06/11/2026 13:00"
  const [datePart, timePart] = localDateStr.split(' ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute] = timePart.split(':');
  // API local_date is in US Central time (CDT = UTC-5)
  const utcDate = new Date(Date.UTC(
    parseInt(year), parseInt(month) - 1, parseInt(day),
    parseInt(hour) + 5, parseInt(minute)
  ));
  return utcDate;
}

/**
 * Format time as 24h HH:MM in Vietnam timezone
 */
export function formatTime(date) {
  if (!date) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
  });
}

/**
 * Format date as "Thứ Sáu, 12/06/2026"
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

/**
 * Format date as short "12/06" for grouping labels
 */
export function formatDateShort(date) {
  if (!date) return '';
  const d = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dayName} ${dd}/${mm}`;
}

/**
 * Get date key YYYY-MM-DD for grouping in Vietnam TZ
 */
export function getDateKey(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
}

/**
 * Check if date is today in Vietnam TZ
 */
export function isToday(date) {
  if (!date) return false;
  const now = new Date();
  return getDateKey(date) === getDateKey(now);
}

/**
 * Map API status to Vietnamese display
 */
export function getStatusInfo(game) {
  const elapsed = (game.time_elapsed || '').toLowerCase();
  const finished = (game.finished || '').toUpperCase();

  if (finished === 'TRUE' || elapsed === 'finished') {
    return { text: 'Kết thúc', cls: 'status-finished' };
  }
  if (elapsed === 'halftime') {
    return { text: 'Nghỉ giữa hiệp', cls: 'status-paused' };
  }
  if (elapsed && elapsed !== 'notstarted' && elapsed !== 'finished') {
    // e.g. "45", "90+2" – match is live
    return { text: `⬤ ${elapsed}'`, cls: 'status-live' };
  }
  if (elapsed === 'postponed') {
    return { text: 'Hoãn', cls: 'status-postponed' };
  }
  return { text: 'Sắp diễn ra', cls: 'status-scheduled' };
}

export function isLive(game) {
  const s = getStatusInfo(game);
  return s.cls === 'status-live';
}

export function isFinished(game) {
  const s = getStatusInfo(game);
  return s.cls === 'status-finished';
}

/**
 * Get round label in Vietnamese
 */
export function getRoundLabel(type, group) {
  const map = {
    'group': `Bảng ${group}`,
    'r32': 'Vòng 32',
    'r16': 'Vòng 16',
    'qf':  'Tứ kết',
    'sf':  'Bán kết',
    'third': 'Tranh hạng 3',
    'final': 'Chung kết',
  };
  return map[type] || type || `Bảng ${group}`;
}
