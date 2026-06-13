/**
 * calendar.js – Generate .ics file and trigger "Add to Calendar" on iPhone
 *
 * On iPhone Safari, downloading an .ics file opens the native Calendar prompt.
 * On desktop, it downloads the .ics for import into any calendar app.
 */

import { parseMatchDate, formatTime, formatDate, getRoundLabel, getStatusInfo } from './time.js';
import { getTeamNameVi } from '../services/dataService.js';

const ALARM_MINUTES = 15; // Reminder before kickoff

/** Format a JS Date to ICS UTC string: YYYYMMDDTHHMMSSZ */
function toICSDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/** Escape special chars for ICS text fields */
function escICS(str = '') {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Build the .ics file content for a single match.
 * @param {object} game   – game object from dataService
 * @param {object} stadium – stadium object (may be null)
 */
export function buildICS(game, stadium) {
  const kickoff = parseMatchDate(game);
  if (!kickoff) return null;

  const isGroup = game.type === 'group';
  const homeName = isGroup ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || 'Đội A');
  const awayName = isGroup ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || 'Đội B');

  const round       = getRoundLabel(game.type, game.group);
  const stadiumName = stadium?.name_en || 'Sân vận động';
  const city        = stadium?.city_en  || '';
  const country     = stadium?.country_en || '';
  const capacity    = stadium?.capacity  ? `Sức chứa: ${stadium.capacity.toLocaleString()}` : '';

  // Match lasts up to 2 hours (90min + ET buffer)
  const endTime = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
  const now     = new Date();

  const uid     = `wc2026-match-${game.id || game._id}@wc2026-app`;
  const summary = escICS(`⚽ ${homeName} vs ${awayName} – World Cup 2026`);
  const location = escICS([stadiumName, city, country].filter(Boolean).join(', '));
  const desc = escICS(
    [
      `${round} – FIFA World Cup 2026`,
      `Giờ VN: ${formatTime(kickoff)} ngày ${formatDate(kickoff)}`,
      stadiumName ? `Sân: ${stadiumName}` : '',
      city        ? `Thành phố: ${city}` : '',
      capacity,
    ].filter(Boolean).join('\n')
  );

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WC2026 PWA//World Cup 2026//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:World Cup 2026',
    'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toICSDate(now)}`,
    `DTSTART:${toICSDate(kickoff)}`,
    `DTEND:${toICSDate(endTime)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${location}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    // 15-minute reminder
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:⚽ ${escICS(homeName)} vs ${escICS(awayName)} bắt đầu sau ${ALARM_MINUTES} phút!`,
    `TRIGGER:-PT${ALARM_MINUTES}M`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

/**
 * Trigger download / "Add to Calendar" dialog.
 * On iPhone Safari, an .ics download opens the native Calendar app prompt.
 */
export function addToCalendar(game, stadium) {
  const ics = buildICS(game, stadium);
  if (!ics) return false;

  const isGroup = game.type === 'group';
  const homeName = isGroup ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || 'Match');
  const awayName = isGroup ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || '');

  const fileName = `WC2026_${homeName.replace(/\s/g,'_')}_vs_${awayName.replace(/\s/g,'_')}.ics`;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  // Use <a> click trick – works on iPhone Safari and desktop
  const a  = document.createElement('a');
  a.href   = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after short delay
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
