/**
 * Time utilities – Vietnam timezone (UTC+7)
 *
 * parseMatchDate priority:
 *   1. game._espnDateUTC  → direct ISO UTC string from ESPN (most accurate)
 *   2. game.local_date + game.stadium_id → local stadium time → UTC via STADIUM_UTC_OFFSET
 */

import { STADIUM_UTC_OFFSET } from '../services/dataService.js';

const TZ       = 'Asia/Ho_Chi_Minh';
const DAYS_VI  = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

/**
 * Get kickoff UTC Date from a game object.
 *
 * Priority:
 *   1. game._espnDateUTC  (from ESPN, most accurate ISO string)
 *   2. game.local_date + stadium_id (worldcup26.ir local time → correct UTC offset)
 *
 * @param {object|string} gameOrStr  – full game object OR raw local_date string
 * @param {string}        stadiumId  – only needed when passing raw string
 */
export function parseMatchDate(gameOrStr, stadiumId) {
  // Accept game object (preferred) or raw string (legacy)
  if (gameOrStr && typeof gameOrStr === 'object') {
    // ESPN gives us a precise UTC ISO string → use directly
    if (gameOrStr._espnDateUTC) return new Date(gameOrStr._espnDateUTC);
    return parseLocalDate(gameOrStr.local_date, gameOrStr.stadium_id);
  }
  // Raw string fallback
  return parseLocalDate(gameOrStr, stadiumId);
}

/** Parse "MM/DD/YYYY HH:mm" local stadium time → UTC Date */
function parseLocalDate(localDateStr, stadiumId) {
  if (!localDateStr) return null;
  const [datePart, timePart] = localDateStr.split(' ');
  if (!datePart || !timePart) return null;
  const [month, day, year] = datePart.split('/');
  const [hour,  minute]    = timePart.split(':');

  // Hours to ADD to local time to get UTC
  const offset = STADIUM_UTC_OFFSET[String(stadiumId)] ?? 5; // default CDT as safe fallback
  return new Date(Date.UTC(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour) + offset,
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
  const local   = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[local.getDay()];
  const dd      = String(local.getDate()).padStart(2, '0');
  const mm      = String(local.getMonth() + 1).padStart(2, '0');
  return `${dayName}, ${dd}/${mm}/${local.getFullYear()}`;
}

/** Format UTC date → "Thứ Sáu 12/06" (short label for group headers) */
export function formatDateShort(date) {
  if (!date) return '';
  const local   = new Date(date.toLocaleString('en-US', { timeZone: TZ }));
  const dayName = DAYS_VI[local.getDay()];
  const dd      = String(local.getDate()).padStart(2, '0');
  const mm      = String(local.getMonth() + 1).padStart(2, '0');
  return `${dayName} ${dd}/${mm}`;
}

/** Date key in Vietnam TZ → "YYYY-MM-DD" (for grouping) */
export function getDateKey(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-CA', { timeZone: TZ });
}

/** Is date today in Vietnam TZ? */
export function isToday(date) {
  if (!date) return false;
  return getDateKey(date) === getDateKey(new Date());
}

/**
 * Get match status info.
 * ESPN-patched games are fully trusted.
 * Returns { text, cls }
 */
export function getStatusInfo(game) {
  const elapsed  = (game.time_elapsed || '').toLowerCase().trim();
  const finished = (game.finished     || '').toUpperCase().trim();

  if (finished === 'TRUE' || elapsed === 'finished')
    return { text: 'Kết thúc', cls: 'status-finished' };
  if (elapsed === 'halftime')
    return { text: 'Nghỉ giữa hiệp', cls: 'status-paused' };
  if (elapsed === 'postponed' || elapsed === 'cancelled')
    return { text: elapsed === 'postponed' ? 'Hoãn' : 'Hủy', cls: 'status-postponed' };
  if (elapsed && elapsed !== 'notstarted')
    return { text: `⬤ ${elapsed}`, cls: 'status-live' };

  return { text: 'Sắp diễn ra', cls: 'status-scheduled' };
}

export const isLive     = g => getStatusInfo(g).cls === 'status-live';
export const isFinished = g => getStatusInfo(g).cls === 'status-finished';

/** Round label in Vietnamese */
export function getRoundLabel(type, group) {
  return ({
    group: `Bảng ${group}`, r32: 'Vòng 32', r16: 'Vòng 16',
    qf: 'Tứ kết', sf: 'Bán kết', third: 'Tranh hạng 3', final: 'Chung kết',
  })[type] || (group ? `Bảng ${group}` : type);
}
