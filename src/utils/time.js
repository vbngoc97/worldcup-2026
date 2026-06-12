/**
 * Time utilities – Vietnam timezone (UTC+7)
 * Status detection relies on data from the dual-source DataService.
 * No more client-side time-guessing.
 */

const TZ = 'Asia/Ho_Chi_Minh';
const DAYS_VI = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

/**
 * Parse API local_date string "MM/DD/YYYY HH:mm"
 * worldcup26.ir stores dates in US Central (CDT = UTC-5).
 * Adding 5h gives UTC; then +7h to display in Vietnam time.
 */
export function parseMatchDate(localDateStr) {
  if (!localDateStr) return null;
  const [datePart, timePart] = localDateStr.split(' ');
  if (!datePart || !timePart) return null;
  const [month, day, year] = datePart.split('/');
  const [hour, minute]     = timePart.split(':');
  return new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour) + 5,   // CDT → UTC
    parseInt(minute)
  ));
}

/** Format UTC date → "HH:MM" in Vietnam timezone */
export function formatTime(date) {
  if (!date) return '--:--';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
  });
}

/** Format UTC date → "Thứ Sáu, 12/06/2026" */
export function formatDate(date) {
  if (!date) return '';
  const local = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[local.getDay()];
  const dd   = String(local.getDate()).padStart(2, '0');
  const mm   = String(local.getMonth() + 1).padStart(2, '0');
  const yyyy = local.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

/** Format UTC date → "Thứ Sáu 12/06" (short label) */
export function formatDateShort(date) {
  if (!date) return '';
  const local = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[local.getDay()];
  const dd = String(local.getDate()).padStart(2, '0');
  const mm = String(local.getMonth() + 1).padStart(2, '0');
  return `${dayName} ${dd}/${mm}`;
}

/** Date key in Vietnam TZ for grouping: "YYYY-MM-DD" */
export function getDateKey(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Is this date today in Vietnam TZ? */
export function isToday(date) {
  if (!date) return false;
  return getDateKey(date) === getDateKey(new Date());
}

/**
 * Get status info from game object.
 * Priority:
 *   1. ESPN-patched data (_espnPatched = true) → fully trust time_elapsed / finished
 *   2. worldcup26.ir raw data (less real-time)
 *
 * Returns { text, cls }
 */
export function getStatusInfo(game) {
  const elapsed  = (game.time_elapsed || '').toLowerCase().trim();
  const finished = (game.finished     || '').toUpperCase().trim();

  if (finished === 'TRUE' || elapsed === 'finished') {
    return { text: 'Kết thúc', cls: 'status-finished' };
  }
  if (elapsed === 'halftime') {
    return { text: 'Nghỉ giữa hiệp', cls: 'status-paused' };
  }
  if (elapsed === 'postponed' || elapsed === 'cancelled') {
    return { text: elapsed === 'postponed' ? 'Hoãn' : 'Hủy', cls: 'status-postponed' };
  }
  // Live: any non-empty value that is NOT "notstarted" or "finished"
  if (elapsed && elapsed !== 'notstarted' && elapsed !== 'finished') {
    // ESPN sends display clock like "45'+2'", "67'", "90'+4'" etc.
    return { text: `⬤ ${elapsed}`, cls: 'status-live' };
  }

  return { text: 'Sắp diễn ra', cls: 'status-scheduled' };
}

export function isLive(game) {
  return getStatusInfo(game).cls === 'status-live';
}

export function isFinished(game) {
  return getStatusInfo(game).cls === 'status-finished';
}

/** Round labels in Vietnamese */
export function getRoundLabel(type, group) {
  const map = {
    group: `Bảng ${group}`,
    r32:   'Vòng 32',
    r16:   'Vòng 16',
    qf:    'Tứ kết',
    sf:    'Bán kết',
    third: 'Tranh hạng 3',
    final: 'Chung kết',
  };
  return map[type] || (group ? `Bảng ${group}` : type);
}
