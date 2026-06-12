/**
 * World Cup 2026 – Main App
 * Data: worldcup26.ir (schedule) + ESPN (live scores, real-time status)
 */

import { dataService, getFlagUrl, getTeamNameVi } from './services/dataService.js';
import {
  parseMatchDate, formatTime, formatDate, formatDateShort,
  getDateKey, isToday, getStatusInfo, isLive, isFinished, getRoundLabel
} from './utils/time.js';

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  tab:         'today',
  data:        null,
  loading:     false,
  searchQuery: '',
  filterStatus:'all',
};

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const mainContent  = document.getElementById('main-content');
const updateTimeEl = document.getElementById('update-time');
const refreshBtn   = document.getElementById('refresh-btn');
const sheetOverlay = document.getElementById('sheet-overlay');
const bottomSheet  = document.getElementById('bottom-sheet');
const sheetEl      = document.getElementById('sheet-content');
const toastEl      = document.getElementById('toast');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildStadiumMap = s => Object.fromEntries((s||[]).map(x => [String(x.id), x]));

function flagImg(teamId, size = 32) {
  const url = getFlagUrl(teamId);
  return url
    ? `<img class="team-flag" src="${url}" alt="" width="${size}" height="${size}" loading="lazy">`
    : `<div class="team-flag-placeholder">🌍</div>`;
}

function flagImgKo(teamId) {
  const url = getFlagUrl(teamId);
  return url
    ? `<img class="ko-flag" src="${url}" alt="" loading="lazy">`
    : `<div class="ko-flag-ph">?</div>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ─── Parse goal scorers ───────────────────────────────────────────────────────
function parseScorers(raw) {
  if (!raw || raw === 'null') return [];
  try {
    return raw.replace(/^\{/, '').replace(/\}$/, '')
      .split('","')
      .map(s => s.replace(/^"|"$/g, '').trim())
      .filter(Boolean);
  } catch (_) { return []; }
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function openSheet(game, stadiumMap) {
  const date = parseMatchDate(game.local_date);
  const si   = getStatusInfo(game);
  const fin  = isFinished(game);
  const live = isLive(game);

  const isGroup = game.type === 'group';
  const hName = isGroup ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || 'Chưa xác định');
  const aName = isGroup ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || 'Chưa xác định');
  const hId = isGroup ? game.home_team_id : null;
  const aId = isGroup ? game.away_team_id : null;

  const showScore = fin || live;
  const hScore = showScore ? (game.home_score ?? '-') : '-';
  const aScore = showScore ? (game.away_score ?? '-') : '-';

  const hWin = fin && parseInt(hScore) > parseInt(aScore);
  const aWin = fin && parseInt(aScore) > parseInt(hScore);

  const stadium   = stadiumMap?.[String(game.stadium_id)];
  const hScorers  = parseScorers(game.home_scorers);
  const aScorers  = parseScorers(game.away_scorers);
  const hasScorers = hScorers.length + aScorers.length > 0;

  const espnNote = game._espnPatched
    ? `<div style="font-size:10px;color:var(--c-green);text-align:center;margin-top:4px">✓ Nguồn: ESPN (thời gian thực)</div>`
    : `<div style="font-size:10px;color:var(--c-text-3);text-align:center;margin-top:4px">Nguồn: worldcup26.ir</div>`;

  sheetEl.innerHTML = `
    <div class="sheet-match-status">${espnNote}
      <div style="display:flex;justify-content:center;margin-top:8px">
        <span class="status-badge ${si.cls}">${si.text}</span>
      </div>
    </div>

    <div class="sheet-teams">
      <div class="sheet-team-row">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          ${hId ? `<img class="sheet-flag" src="${getFlagUrl(hId)||''}" alt="">` : '<div class="sheet-flag" style="background:var(--c-surface-2);border-radius:50%"></div>'}
          <span class="sheet-team-name ${hWin?'winner':''}">${hName}</span>
        </div>
        <span class="sheet-score ${hWin?'winner-score':''}">${showScore ? hScore : '–'}</span>
      </div>
      <div class="sheet-team-row" style="margin-top:10px">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          ${aId ? `<img class="sheet-flag" src="${getFlagUrl(aId)||''}" alt="">` : '<div class="sheet-flag" style="background:var(--c-surface-2);border-radius:50%"></div>'}
          <span class="sheet-team-name ${aWin?'winner':''}">${aName}</span>
        </div>
        <span class="sheet-score ${aWin?'winner-score':''}">${showScore ? aScore : '–'}</span>
      </div>
    </div>

    <div class="sheet-info-grid">
      <div class="sheet-info-item">
        <div class="sheet-info-label">Giờ VN</div>
        <div class="sheet-info-value">${date ? formatTime(date) : '--:--'}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Ngày</div>
        <div class="sheet-info-value" style="font-size:11px">${date ? formatDate(date) : '--'}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Vòng đấu</div>
        <div class="sheet-info-value">${getRoundLabel(game.type, game.group)}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Sân</div>
        <div class="sheet-info-value">${stadium?.name_en || '--'}</div>
      </div>
      ${stadium ? `
      <div class="sheet-info-item" style="grid-column:span 2">
        <div class="sheet-info-label">Địa điểm</div>
        <div class="sheet-info-value">${stadium.city_en}, ${stadium.country_en} · Sức chứa ${stadium.capacity?.toLocaleString()}</div>
      </div>` : ''}
    </div>

    ${hasScorers ? `
    <div class="sheet-scorers">
      <div class="sheet-scorers-title">⚽ Người ghi bàn</div>
      ${hScorers.map(s=>`<div class="scorer-item"><strong>${hName}</strong> · ${s}</div>`).join('')}
      ${aScorers.map(s=>`<div class="scorer-item"><strong>${aName}</strong> · ${s}</div>`).join('')}
    </div>` : ''}

    ${!fin && date ? `
    <div style="margin-top:14px">
      <button class="retry-btn" style="width:100%;background:var(--c-surface-2);color:var(--c-text-2);border:1px solid var(--c-border);font-size:13px"
        onclick="addToCalendar()">📅 Thêm vào lịch</button>
    </div>` : ''}
  `;

  sheetOverlay.classList.add('active');
  bottomSheet.classList.add('active');
}

window.addToCalendar = () => showToast('Tính năng đang phát triển 🚧');

function closeSheet() {
  sheetOverlay.classList.remove('active');
  bottomSheet.classList.remove('active');
}

// ─── Match Card ───────────────────────────────────────────────────────────────
function makeMatchCard(game, stadiumMap) {
  const date   = parseMatchDate(game.local_date);
  const si     = getStatusInfo(game);
  const fin    = isFinished(game);
  const live   = isLive(game);
  const isGroup = game.type === 'group';

  const hName = isGroup ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || 'Chưa xác định');
  const aName = isGroup ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || 'Chưa xác định');
  const hId   = isGroup ? game.home_team_id : null;
  const aId   = isGroup ? game.away_team_id : null;

  const showScore = fin || live;
  const hScore = game.home_score ?? '-';
  const aScore = game.away_score ?? '-';
  const hWin = fin && parseInt(hScore) > parseInt(aScore);
  const aWin = fin && parseInt(aScore) > parseInt(hScore);

  const stadium = stadiumMap?.[String(game.stadium_id)];
  const stadiumText = stadium ? `${stadium.name_en}, ${stadium.city_en}` : '';

  const hScorers = parseScorers(game.home_scorers);
  const aScorers = parseScorers(game.away_scorers);

  const card = document.createElement('div');
  card.className = `match-card${live ? ' live-card' : ''}${fin ? ' finished-card' : ''}`;

  card.innerHTML = `
    <div class="card-meta">
      <span class="card-time">${date ? formatTime(date) : '--:--'}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="card-group">${getRoundLabel(game.type, game.group)}</span>
        <span class="status-badge ${si.cls}">${si.text}</span>
      </div>
    </div>

    <div class="teams-wrapper">
      <div class="team-row">
        <div class="team-left">
          ${hId ? flagImg(hId) : '<div class="team-flag-placeholder">🌍</div>'}
          <span class="team-name ${hWin?'winner':''}">${hName}</span>
        </div>
        ${showScore
          ? `<span class="score-box ${hWin?'winner-score':''}">${hScore}</span>`
          : `<span class="score-dash">—</span>`}
      </div>
      <div class="team-row">
        <div class="team-left">
          ${aId ? flagImg(aId) : '<div class="team-flag-placeholder">🌍</div>'}
          <span class="team-name ${aWin?'winner':''}">${aName}</span>
        </div>
        ${showScore
          ? `<span class="score-box ${aWin?'winner-score':''}">${aScore}</span>`
          : `<span class="score-dash">—</span>`}
      </div>
    </div>

    ${hScorers.length ? `<div class="scorers-line">⚽ ${hScorers.join(' · ')}</div>` : ''}
    ${aScorers.length ? `<div class="scorers-line">⚽ ${aScorers.join(' · ')}</div>` : ''}

    ${stadiumText ? `
    <div class="card-divider"></div>
    <div class="card-footer">
      <svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px;flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      <span>${stadiumText}</span>
    </div>` : ''}
  `;

  card.addEventListener('click', () => openSheet(game, stadiumMap));
  return card;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function skeletons(n = 4) {
  return Array.from({length: n}, () => `
    <div class="skeleton-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:14px">
        <div class="skel skel-text skel-w-30"></div><div class="skel skel-text skel-w-40"></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div class="skel skel-circle"></div><div class="skel skel-text skel-w-60"></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <div class="skel skel-circle"></div><div class="skel skel-text skel-w-40"></div>
      </div>
    </div>`).join('');
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function renderToday() {
  const { games, stadiums } = state.data;
  const sm = buildStadiumMap(stadiums);
  const now = new Date();
  const todayKey = getDateKey(now);

  const todayGames = games.filter(g => {
    const d = parseMatchDate(g.local_date);
    return d && getDateKey(d) === todayKey;
  }).sort((a, b) => {
    // live first → upcoming → finished
    const rank = g => isLive(g) ? 0 : isFinished(g) ? 2 : 1;
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return parseMatchDate(a.local_date) - parseMatchDate(b.local_date);
  });

  const liveCount = todayGames.filter(isLive).length;

  const page = document.createElement('div');
  page.className = 'page';

  // Hero
  const hero = document.createElement('div');
  hero.className = 'today-hero';
  if (liveCount > 0) {
    hero.innerHTML = `
      <div class="live-ring"><div class="live-dot"></div> ĐANG ĐÁ TRỰC TIẾP</div>
      <div class="hero-message">${liveCount} trận đang diễn ra</div>
      <div class="hero-sub">${formatDate(now)}</div>`;
  } else if (todayGames.length > 0) {
    hero.innerHTML = `
      <div class="hero-date">${formatDate(now)}</div>
      <div class="hero-message">${todayGames.length} trận hôm nay</div>
      <div class="hero-sub">Giờ Việt Nam (GMT+7)</div>`;
  } else {
    const next = games.filter(g => !isFinished(g))
      .sort((a,b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date))[0];
    hero.innerHTML = `
      <div class="hero-date">${formatDate(now)}</div>
      <div class="hero-message">Không có trận hôm nay</div>
      <div class="hero-sub">${next ? 'Tiếp theo: ' + formatDate(parseMatchDate(next.local_date)) : 'Giải đấu kết thúc'}</div>`;
  }
  page.appendChild(hero);

  // Data source indicator
  const espnCount = todayGames.filter(g => g._espnPatched).length;
  if (espnCount > 0) {
    const ind = document.createElement('div');
    ind.style.cssText = 'font-size:11px;color:var(--c-green);text-align:center;margin-bottom:12px';
    ind.innerHTML = `✓ ${espnCount} trận được cập nhật từ ESPN (thời gian thực)`;
    page.appendChild(ind);
  }

  const label = document.createElement('div');
  label.className = 'section-label';
  label.textContent = todayGames.length ? 'Trận hôm nay' : 'Trận tiếp theo';
  page.appendChild(label);

  if (todayGames.length > 0) {
    todayGames.forEach(g => page.appendChild(makeMatchCard(g, sm)));
  } else {
    const next = games.filter(g => !isFinished(g))
      .sort((a,b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date))[0];
    if (next) page.appendChild(makeMatchCard(next, sm));
  }

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderSchedule() {
  const { games, stadiums } = state.data;
  const sm = buildStadiumMap(stadiums);

  const page = document.createElement('div');
  page.className = 'page';
  page.innerHTML = `
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <input class="search-input" id="sched-search" placeholder="Tìm đội tuyển..." value="${state.searchQuery}">
    </div>
    <div class="filter-chips">
      <button class="chip ${state.filterStatus==='all'?'active':''}" data-f="all">Tất cả</button>
      <button class="chip ${state.filterStatus==='upcoming'?'active':''}" data-f="upcoming">Sắp đấu</button>
      <button class="chip ${state.filterStatus==='live'?'active':''}" data-f="live">Đang đá</button>
      <button class="chip ${state.filterStatus==='finished'?'active':''}" data-f="finished">Kết thúc</button>
    </div>
    <div id="sched-list"></div>`;

  const listEl = page.querySelector('#sched-list');
  const searchEl = page.querySelector('#sched-search');

  const repaint = () => renderScheduleList(games, sm, listEl);

  searchEl.addEventListener('input', e => { state.searchQuery = e.target.value; repaint(); });
  page.querySelectorAll('[data-f]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filterStatus = btn.dataset.f;
      page.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('active', b.dataset.f === state.filterStatus));
      repaint();
    });
  });

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
  repaint();
}

function renderScheduleList(games, sm, container) {
  const q = state.searchQuery.toLowerCase().trim();
  const f = state.filterStatus;

  let list = games.filter(g => {
    if (f === 'upcoming' && isFinished(g)) return false;
    if (f === 'upcoming' && isLive(g))     return false;
    if (f === 'live'     && !isLive(g))    return false;
    if (f === 'finished' && !isFinished(g))return false;
    if (q) {
      const haystack = [
        g.home_team_name_en, g.away_team_name_en,
        getTeamNameVi(g.home_team_name_en), getTeamNameVi(g.away_team_name_en)
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }).sort((a,b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date));

  container.innerHTML = '';
  if (!list.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">Không tìm thấy trận nào</div>
      <div class="empty-sub">Thử tìm bằng tiếng Việt hoặc tiếng Anh</div>
    </div>`;
    return;
  }

  // Group by VN date
  const groups = {};
  list.forEach(g => {
    const d = parseMatchDate(g.local_date);
    const k = d ? getDateKey(d) : 'other';
    if (!groups[k]) groups[k] = { d, games: [] };
    groups[k].games.push(g);
  });

  Object.keys(groups).sort().forEach(k => {
    const { d, games: dg } = groups[k];
    const lbl = document.createElement('div');
    lbl.className = 'date-group-label';
    lbl.textContent = d ? formatDateShort(d) : k;
    container.appendChild(lbl);
    dg.forEach(g => container.appendChild(makeMatchCard(g, sm)));
  });
}

function renderResults() {
  const { games, stadiums } = state.data;
  const sm = buildStadiumMap(stadiums);

  const done = games
    .filter(isFinished)
    .sort((a,b) => parseMatchDate(b.local_date) - parseMatchDate(a.local_date));

  const page = document.createElement('div');
  page.className = 'page';

  if (!done.length) {
    page.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏁</div>
      <div class="empty-title">Chưa có kết quả</div>
      <div class="empty-sub">Kết quả sẽ hiển thị sau khi trận kết thúc</div>
    </div>`;
  } else {
    const lbl = document.createElement('div');
    lbl.className = 'section-label';
    lbl.textContent = `${done.length} trận đã kết thúc`;
    page.appendChild(lbl);
    done.forEach(g => page.appendChild(makeMatchCard(g, sm)));
  }

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderStandings() {
  const { groups, games } = state.data;

  // Build team name lookup from games
  const nameMap = {};
  games.forEach(g => {
    if (g.home_team_id) nameMap[g.home_team_id] = g.home_team_name_en;
    if (g.away_team_id) nameMap[g.away_team_id] = g.away_team_name_en;
  });

  const page = document.createElement('div');
  page.className = 'page';

  const lbl = document.createElement('div');
  lbl.className = 'section-label';
  lbl.textContent = '12 Bảng đấu – Vòng bảng';
  page.appendChild(lbl);

  const note = document.createElement('div');
  note.className = 'standings-note';
  note.style.marginBottom = '14px';
  note.innerHTML = `<span style="color:var(--c-gold)">●</span> Top 2 mỗi bảng &nbsp;<span style="color:var(--c-green)">●</span> 8 đội hạng ba tốt nhất đi tiếp`;
  page.appendChild(note);

  const sorted = [...(groups||[])].sort((a,b) => a.name.localeCompare(b.name));

  sorted.forEach(grp => {
    const teams = [...grp.teams].sort((a,b) => {
      if (b.pts - a.pts) return b.pts - a.pts;
      if (b.gd  - a.gd)  return b.gd  - a.gd;
      return b.gf - a.gf;
    });

    const block = document.createElement('div');
    block.className = 'group-block';
    block.innerHTML = `
      <div class="group-title">Bảng ${grp.name}</div>
      <table class="standings-tbl">
        <thead><tr>
          <th>#</th><th>Đội</th><th>ST</th><th>T</th><th>H</th><th>B</th>
          <th>GF</th><th>GA</th><th>HS</th><th>Đ</th>
        </tr></thead>
        <tbody>${teams.map((t,i) => {
          const en = nameMap[t.team_id] || '';
          const vi = getTeamNameVi(en);
          const url = getFlagUrl(t.team_id);
          const cls = i < 2 ? 'advance' : '';
          const gd  = parseInt(t.gd);
          return `<tr class="${cls}">
            <td>${i+1}</td>
            <td><div class="team-cell">
              ${url ? `<img class="tbl-flag" src="${url}" alt="">` : '<div style="width:18px;height:18px;border-radius:50%;background:var(--c-surface-2);flex-shrink:0"></div>'}
              <span>${vi}</span>
            </div></td>
            <td>${t.mp}</td><td>${t.w}</td><td>${t.d}</td><td>${t.l}</td>
            <td>${t.gf}</td><td>${t.ga}</td>
            <td>${gd > 0 ? '+'+gd : gd}</td>
            <td class="pts-col">${t.pts}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    page.appendChild(block);
  });

  if (!sorted.length) {
    page.innerHTML += `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Đang tải...</div></div>`;
  }

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderKnockout() {
  const { games, stadiums } = state.data;
  const sm = buildStadiumMap(stadiums);

  const ORDER  = ['r32','r16','qf','sf','third','final'];
  const LABELS = { r32:'Vòng 32',r16:'Vòng 16',qf:'Tứ kết',sf:'Bán kết',third:'Hạng 3',final:'Chung kết' };

  const byRound = {};
  games.filter(g => g.type !== 'group').forEach(g => {
    (byRound[g.type] = byRound[g.type] || []).push(g);
  });

  const page = document.createElement('div');
  page.className = 'page';
  page.style.cssText = 'padding-left:0;padding-right:0';

  const lbl = document.createElement('div');
  lbl.className = 'section-label';
  lbl.style.padding = '0 16px';
  lbl.textContent = 'Vòng Knock-out · Vuốt ngang để xem';
  page.appendChild(lbl);

  const scroll = document.createElement('div');
  scroll.className = 'ko-scroll';
  const bracket = document.createElement('div');
  bracket.className = 'ko-bracket';

  ORDER.forEach((rType, idx) => {
    const roundGames = (byRound[rType] || []).sort((a,b) => +a.id - +b.id);
    if (!roundGames.length) return;

    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;gap:8px;min-width:200px;margin-right:8px';

    const colLabel = document.createElement('div');
    colLabel.className = 'ko-round-label';
    colLabel.textContent = LABELS[rType] || rType;
    col.appendChild(colLabel);

    roundGames.forEach(g => {
      const hasTeams = g.home_team_id && parseInt(g.home_team_id) > 0;
      const fin = isFinished(g), live = isLive(g);
      const si  = getStatusInfo(g);
      const showScore = fin || live;
      const hScore = g.home_score, aScore = g.away_score;
      const hWin = fin && parseInt(hScore) > parseInt(aScore);
      const aWin = fin && parseInt(aScore) > parseInt(hScore);

      const hName = hasTeams ? getTeamNameVi(g.home_team_name_en) : (g.home_team_label || '?');
      const aName = hasTeams ? getTeamNameVi(g.away_team_name_en) : (g.away_team_label || '?');

      const card = document.createElement('div');
      card.className = `ko-match${live?' live-match':''}`;
      card.innerHTML = `
        <div class="ko-team">
          <div class="ko-team-info">
            ${hasTeams ? flagImgKo(g.home_team_id) : '<div class="ko-flag-ph">?</div>'}
            <span class="ko-name ${hWin?'winner':''}">${hName}</span>
          </div>
          <span class="ko-score ${hWin?'winner-score':''}">${showScore ? hScore : ''}</span>
        </div>
        <div class="ko-team" style="border-bottom:none">
          <div class="ko-team-info">
            ${hasTeams ? flagImgKo(g.away_team_id) : '<div class="ko-flag-ph">?</div>'}
            <span class="ko-name ${aWin?'winner':''}">${aName}</span>
          </div>
          <span class="ko-score ${aWin?'winner-score':''}">${showScore ? aScore : ''}</span>
        </div>`;
      card.addEventListener('click', () => openSheet(g, sm));
      col.appendChild(card);
    });

    bracket.appendChild(col);

    if (rType !== 'final' && rType !== 'third' && idx < ORDER.length - 1) {
      const arrow = document.createElement('div');
      arrow.className = 'ko-connector';
      arrow.innerHTML = `<svg viewBox="0 0 24 24" width="16" fill="currentColor" style="color:var(--c-border-2)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;
      bracket.appendChild(arrow);
    }
  });

  scroll.appendChild(bracket);
  page.appendChild(scroll);
  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

// ─── Tab routing ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  state.tab = tab;
  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.tab === tab));
  renderPage();
}

function renderPage() {
  if (state.loading) {
    mainContent.innerHTML = `<div class="page">${skeletons(5)}</div>`;
    return;
  }
  if (!state.data) {
    mainContent.innerHTML = `<div class="page"><div class="empty-state">
      <div class="empty-icon">😕</div>
      <div class="empty-title">Không tải được dữ liệu</div>
      <div class="empty-sub">Kiểm tra kết nối và thử lại</div>
      <button class="retry-btn" id="retry-btn">Thử lại</button>
    </div></div>`;
    document.getElementById('retry-btn')?.addEventListener('click', loadData);
    return;
  }
  ({ today: renderToday, schedule: renderSchedule, results: renderResults,
     standings: renderStandings, knockout: renderKnockout })[state.tab]?.();
}

// ─── Data loading & auto-refresh ──────────────────────────────────────────────
let refreshTimer = null;

async function loadData(silent = false) {
  if (!silent) { state.loading = true; renderPage(); }
  refreshBtn.classList.add('spinning');

  state.data = await dataService.fetchAll();
  state.loading = false;
  refreshBtn.classList.remove('spinning');
  updateTimeEl.textContent = dataService.getLastUpdateText();
  renderPage();
  scheduleRefresh();
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (!state.data) return;
  const hasLive = state.data.games?.some(isLive);
  // Live game: refresh every 60s.  No live: 10 minutes.
  refreshTimer = setTimeout(() => loadData(true), hasLive ? 60_000 : 10 * 60_000);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
  refreshBtn.addEventListener('click', () => { showToast('Đang cập nhật...'); loadData(); });
  sheetOverlay.addEventListener('click', closeSheet);
  loadData();
}

init();
