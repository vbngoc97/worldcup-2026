/**
 * Main Application Entry Point
 * Handles routing, data loading, auto-refresh, and rendering all pages.
 */

import { dataService, getFlagUrl, getTeamNameVi } from './services/dataService.js';
import {
  parseMatchDate, formatTime, formatDate, formatDateShort,
  getDateKey, isToday, getStatusInfo, isLive, isFinished, getRoundLabel
} from './utils/time.js';

// ─── App State ───────────────────────────────────────────────────────────────
const state = {
  currentTab: 'today',
  data: null,
  loading: false,
  error: null,
  selectedMatch: null,
  searchQuery: '',
  filterGroup: 'all',
  filterStatus: 'all',
  favorites: new Set(JSON.parse(localStorage.getItem('wc2026_fav') || '[]')),
};

// ─── DOM Refs ─────────────────────────────────────────────────────────────────
const mainContent = document.getElementById('main-content');
const updateTimeEl = document.getElementById('update-time');
const refreshBtn = document.getElementById('refresh-btn');
const sheetOverlay = document.getElementById('sheet-overlay');
const bottomSheet = document.getElementById('bottom-sheet');
const sheetContentEl = document.getElementById('sheet-content');
const toastEl = document.getElementById('toast');

// ─── Team helpers ─────────────────────────────────────────────────────────────
function buildTeamMap(teams) {
  const map = {};
  (teams || []).forEach(t => { map[String(t.id)] = t; });
  return map;
}

function buildStadiumMap(stadiums) {
  const map = {};
  (stadiums || []).forEach(s => { map[String(s.id)] = s; });
  return map;
}

// ─── Flag img element ─────────────────────────────────────────────────────────
function flagEl(teamId, size = 32) {
  const url = getFlagUrl(teamId);
  if (url) {
    return `<img class="team-flag" src="${url}" alt="" width="${size}" height="${size}" loading="lazy">`;
  }
  return `<div class="team-flag-placeholder">🌍</div>`;
}

function koFlagEl(teamId) {
  const url = getFlagUrl(teamId);
  if (url) return `<img class="ko-flag" src="${url}" alt="" loading="lazy">`;
  return `<div class="ko-flag-ph">🌍</div>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2500);
}

// ─── Sheet helpers ────────────────────────────────────────────────────────────
function openSheet(game, stadiumMap) {
  const date = parseMatchDate(game.local_date);
  const si = getStatusInfo(game, date);
  const hScore = game.home_score ?? '-';
  const aScore = game.away_score ?? '-';
  const stadium = stadiumMap?.[String(game.stadium_id)];

  const isGroupStage = game.type === 'group';
  const homeName = isGroupStage ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || '?');
  const awayName = isGroupStage ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || '?');
  const hFlagId = isGroupStage ? game.home_team_id : null;
  const aFlagId = isGroupStage ? game.away_team_id : null;

  const fin = isFinished(game);
  const hWin = fin && parseInt(hScore) > parseInt(aScore);
  const aWin = fin && parseInt(aScore) > parseInt(hScore);

  const hScorers = parseScorers(game.home_scorers);
  const aScorers = parseScorers(game.away_scorers);
  const hasScorers = (hScorers.length + aScorers.length) > 0;

  sheetContentEl.innerHTML = `
    <div class="sheet-match-status">
      <span class="status-badge ${si.cls}">${si.text}</span>
    </div>

    <div class="sheet-teams">
      <div class="sheet-team-row">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          ${hFlagId ? `<img class="sheet-flag" src="${getFlagUrl(hFlagId) || ''}" alt="">` : '<div class="sheet-flag" style="background:var(--c-surface-2);border-radius:50%"></div>'}
          <span class="sheet-team-name ${hWin ? 'winner' : ''}">${homeName}</span>
        </div>
        <span class="sheet-score ${hWin ? 'winner-score' : ''}">${fin || isLive(game) ? hScore : '-'}</span>
      </div>
      <div class="sheet-team-row" style="margin-top:10px">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
          ${aFlagId ? `<img class="sheet-flag" src="${getFlagUrl(aFlagId) || ''}" alt="">` : '<div class="sheet-flag" style="background:var(--c-surface-2);border-radius:50%"></div>'}
          <span class="sheet-team-name ${aWin ? 'winner' : ''}">${awayName}</span>
        </div>
        <span class="sheet-score ${aWin ? 'winner-score' : ''}">${fin || isLive(game) ? aScore : '-'}</span>
      </div>
    </div>

    <div class="sheet-info-grid">
      <div class="sheet-info-item">
        <div class="sheet-info-label">Giờ</div>
        <div class="sheet-info-value">${date ? formatTime(date) : '--:--'}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Ngày</div>
        <div class="sheet-info-value">${date ? formatDate(date) : '--'}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Vòng đấu</div>
        <div class="sheet-info-value">${getRoundLabel(game.type, game.group)}</div>
      </div>
      <div class="sheet-info-item">
        <div class="sheet-info-label">Sân vận động</div>
        <div class="sheet-info-value">${stadium ? stadium.name_en : '--'}</div>
      </div>
      ${stadium ? `
      <div class="sheet-info-item" style="grid-column:span 2">
        <div class="sheet-info-label">Thành phố</div>
        <div class="sheet-info-value">${stadium.city_en}, ${stadium.country_en}</div>
      </div>
      ` : ''}
    </div>

    ${hasScorers ? `
    <div class="sheet-scorers">
      <div class="sheet-scorers-title">Người ghi bàn</div>
      ${hScorers.map(s => `<div class="scorer-item"><strong>${homeName}</strong>: ${s}</div>`).join('')}
      ${aScorers.map(s => `<div class="scorer-item"><strong>${awayName}</strong>: ${s}</div>`).join('')}
    </div>
    ` : ''}

    ${!fin && date ? `
    <div style="margin-top:16px">
      <button class="retry-btn" style="width:100%;background:var(--c-surface-2);color:var(--c-text);border:1px solid var(--c-border)" onclick="addToCalendar(${game.id})">
        📅 Thêm vào lịch iPhone
      </button>
    </div>
    ` : ''}
  `;

  sheetOverlay.classList.add('active');
  bottomSheet.classList.add('active');
}

window.addToCalendar = function(id) {
  showToast('Tính năng thêm lịch đang phát triển 🚧');
};

function parseScorers(raw) {
  if (!raw || raw === 'null') return [];
  try {
    // API format: {"J. Quiñones 9'","R. Jiménez 67'"}
    const cleaned = raw.replace(/^\{/, '').replace(/\}$/, '');
    return cleaned.split('","').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
  } catch (_) { return []; }
}

function closeSheet() {
  sheetOverlay.classList.remove('active');
  bottomSheet.classList.remove('active');
}

// ─── Match Card renderer ──────────────────────────────────────────────────────
function renderMatchCard(game, stadiumMap) {
  const date = parseMatchDate(game.local_date);
  const si = getStatusInfo(game, date);
  const fin = isFinished(game);
  const live = isLive(game);
  const hScore = game.home_score ?? '-';
  const aScore = game.away_score ?? '-';

  const isGroupStage = game.type === 'group';
  const homeName = isGroupStage ? getTeamNameVi(game.home_team_name_en) : (game.home_team_label || 'Chưa xác định');
  const awayName = isGroupStage ? getTeamNameVi(game.away_team_name_en) : (game.away_team_label || 'Chưa xác định');
  const hFlagId = isGroupStage ? game.home_team_id : null;
  const aFlagId = isGroupStage ? game.away_team_id : null;

  const hWin = fin && parseInt(hScore) > parseInt(aScore);
  const aWin = fin && parseInt(aScore) > parseInt(hScore);

  const stadium = stadiumMap?.[String(game.stadium_id)];
  const stadiumText = stadium ? `${stadium.name_en}, ${stadium.city_en}` : '';

  const hScorers = parseScorers(game.home_scorers);
  const aScorers = parseScorers(game.away_scorers);

  const card = document.createElement('div');
  card.className = `match-card${live ? ' live-card' : ''}${fin ? ' finished-card' : ''}`;
  card.dataset.matchId = game.id;

  card.innerHTML = `
    <div class="card-meta">
      <span class="card-time">${date ? formatTime(date) : '--:--'}</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="card-group">${getRoundLabel(game.type, game.group)}</span>
        <span class="status-badge ${si.cls}">${si.text}</span>
      </div>
    </div>

    <div class="teams-wrapper">
      <div class="team-row">
        <div class="team-left">
          ${hFlagId ? flagEl(hFlagId) : '<div class="team-flag-placeholder">🌍</div>'}
          <span class="team-name${hWin ? ' winner' : ''}">${homeName}</span>
        </div>
        ${(fin || live) ? `<span class="score-box${hWin ? ' winner-score' : ''}">${hScore}</span>` : '<span class="score-dash">—</span>'}
      </div>
      <div class="team-row">
        <div class="team-left">
          ${aFlagId ? flagEl(aFlagId) : '<div class="team-flag-placeholder">🌍</div>'}
          <span class="team-name${aWin ? ' winner' : ''}">${awayName}</span>
        </div>
        ${(fin || live) ? `<span class="score-box${aWin ? ' winner-score' : ''}">${aScore}</span>` : '<span class="score-dash">—</span>'}
      </div>
    </div>

    ${hScorers.length > 0 ? `<div class="scorers-line">⚽ ${hScorers.join(', ')}</div>` : ''}
    ${aScorers.length > 0 ? `<div class="scorers-line">⚽ ${aScorers.join(', ')}</div>` : ''}

    ${si.estimated ? `<div class="card-footer" style="margin-top:6px;color:var(--c-text-3);font-size:10px">* Trạng thái ước tính – API đang cập nhật chậm</div>` : ''}
    ${stadiumText ? `
    <div class="card-divider"></div>
    <div class="card-footer">
      <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      <span>${stadiumText}</span>
    </div>
    ` : ''}
  `;

  card.addEventListener('click', () => openSheet(game, stadiumMap));
  return card;
}

// ─── Skeleton Loading ──────────────────────────────────────────────────────────
function renderSkeletons(n = 4) {
  let html = '';
  for (let i = 0; i < n; i++) {
    html += `
      <div class="skeleton-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <div class="skel skel-text skel-w-30"></div>
          <div class="skel skel-text skel-w-30"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <div class="skel skel-circle"></div>
          <div class="skel skel-text skel-w-60"></div>
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="skel skel-circle"></div>
          <div class="skel skel-text skel-w-40"></div>
        </div>
      </div>`;
  }
  return html;
}

// ─── Pages ────────────────────────────────────────────────────────────────────

function renderToday() {
  const { games, stadiums } = state.data;
  const stadiumMap = buildStadiumMap(stadiums);

  const today = new Date();
  const todayKey = getDateKey(today);

  // Games that are live OR happening today (VN time)
  const todayGames = games.filter(g => {
    const d = parseMatchDate(g.local_date);
    return d && getDateKey(d) === todayKey;
  });

  const liveGames = games.filter(g => isLive(g));

  // Sort: live first, then by time
  todayGames.sort((a, b) => {
    const aLive = isLive(a) ? -1 : 0;
    const bLive = isLive(b) ? -1 : 0;
    if (aLive !== bLive) return aLive - bLive;
    return new Date(parseMatchDate(a.local_date)) - new Date(parseMatchDate(b.local_date));
  });

  const page = document.createElement('div');
  page.className = 'page';

  // Hero header
  const nowFmt = formatDate(today);
  const heroDiv = document.createElement('div');
  heroDiv.className = 'today-hero';

  if (liveGames.length > 0) {
    heroDiv.innerHTML = `
      <div class="live-ring"><div class="live-dot"></div> ĐANG ĐÁ TRỰC TIẾP</div>
      <div class="hero-message">${liveGames.length} trận đang diễn ra</div>
      <div class="hero-sub">${nowFmt}</div>
    `;
  } else if (todayGames.length > 0) {
    heroDiv.innerHTML = `
      <div class="hero-date">${nowFmt}</div>
      <div class="hero-message">${todayGames.length} trận hôm nay</div>
      <div class="hero-sub">Giờ Việt Nam (GMT+7)</div>
    `;
  } else {
    // Find next upcoming game
    const upcoming = games
      .filter(g => !isFinished(g))
      .sort((a, b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date));
    const next = upcoming[0];
    const nextDate = next ? parseMatchDate(next.local_date) : null;
    heroDiv.innerHTML = `
      <div class="hero-date">${nowFmt}</div>
      <div class="hero-message">Không có trận hôm nay</div>
      <div class="hero-sub">${nextDate ? `Trận tiếp theo: ${formatDate(nextDate)}` : 'Giải đấu kết thúc'}</div>
    `;
  }
  page.appendChild(heroDiv);

  if (todayGames.length > 0) {
    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Trận hôm nay';
    page.appendChild(label);
    todayGames.forEach(g => page.appendChild(renderMatchCard(g, stadiumMap)));
  } else {
    // Show next upcoming game
    const upcoming = games
      .filter(g => !isFinished(g))
      .sort((a, b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date));
    if (upcoming.length > 0) {
      const label = document.createElement('div');
      label.className = 'section-label';
      label.textContent = 'Trận tiếp theo';
      page.appendChild(label);
      page.appendChild(renderMatchCard(upcoming[0], stadiumMap));
    }
  }

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderSchedule() {
  const { games, stadiums } = state.data;
  const stadiumMap = buildStadiumMap(stadiums);

  const page = document.createElement('div');
  page.className = 'page';

  // Search bar
  page.innerHTML = `
    <div class="search-bar">
      <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
      <input class="search-input" id="sched-search" placeholder="Tìm đội tuyển..." value="${state.searchQuery}">
    </div>
    <div class="filter-chips" id="sched-filters">
      <button class="chip ${state.filterStatus === 'all' ? 'active' : ''}" data-filter="all">Tất cả</button>
      <button class="chip ${state.filterStatus === 'upcoming' ? 'active' : ''}" data-filter="upcoming">Sắp đấu</button>
      <button class="chip ${state.filterStatus === 'finished' ? 'active' : ''}" data-filter="finished">Kết thúc</button>
    </div>
    <div id="sched-list"></div>
  `;

  // Wire up search
  const searchInput = page.querySelector('#sched-search');
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderScheduleList(games, stadiumMap, page.querySelector('#sched-list'));
  });

  // Wire up filters
  page.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filterStatus = btn.dataset.filter;
      page.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderScheduleList(games, stadiumMap, page.querySelector('#sched-list'));
    });
  });

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
  renderScheduleList(games, stadiumMap, page.querySelector('#sched-list'));
}

function renderScheduleList(games, stadiumMap, container) {
  const q = state.searchQuery.toLowerCase().trim();
  const statusFilter = state.filterStatus;

  let filtered = games.filter(g => {
    // Status filter
    if (statusFilter === 'upcoming' && isFinished(g)) return false;
    if (statusFilter === 'finished' && !isFinished(g)) return false;

    // Search filter
    if (q) {
      const hName = (g.home_team_name_en || '').toLowerCase();
      const aName = (g.away_team_name_en || '').toLowerCase();
      const hVi = getTeamNameVi(g.home_team_name_en).toLowerCase();
      const aVi = getTeamNameVi(g.away_team_name_en).toLowerCase();
      if (!hName.includes(q) && !aName.includes(q) && !hVi.includes(q) && !aVi.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => parseMatchDate(a.local_date) - parseMatchDate(b.local_date));

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">Không tìm thấy</div>
      <div class="empty-sub">Thử tìm tên đội bằng tiếng Việt hoặc tiếng Anh</div>
    </div>`;
    return;
  }

  // Group by date
  const groups = {};
  filtered.forEach(g => {
    const d = parseMatchDate(g.local_date);
    const key = d ? getDateKey(d) : 'unknown';
    if (!groups[key]) groups[key] = { date: d, games: [] };
    groups[key].games.push(g);
  });

  Object.keys(groups).sort().forEach(key => {
    const { date, games: dayGames } = groups[key];
    const labelEl = document.createElement('div');
    labelEl.className = 'date-group-label';
    labelEl.textContent = date ? formatDateShort(date) : key;
    container.appendChild(labelEl);
    dayGames.forEach(g => container.appendChild(renderMatchCard(g, stadiumMap)));
  });
}

function renderResults() {
  const { games, stadiums } = state.data;
  const stadiumMap = buildStadiumMap(stadiums);

  const finished = games
    .filter(g => isFinished(g))
    .sort((a, b) => parseMatchDate(b.local_date) - parseMatchDate(a.local_date));

  const page = document.createElement('div');
  page.className = 'page';

  if (finished.length === 0) {
    page.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🏁</div>
      <div class="empty-title">Chưa có kết quả</div>
      <div class="empty-sub">Kết quả sẽ hiện ra khi có trận kết thúc</div>
    </div>`;
  } else {
    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = `${finished.length} trận đã kết thúc`;
    page.appendChild(label);
    finished.forEach(g => page.appendChild(renderMatchCard(g, stadiumMap)));
  }

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderStandings() {
  const { groups, games } = state.data;

  // Build team name map from games data
  const teamNameMap = {};
  games.forEach(g => {
    if (g.home_team_id) teamNameMap[g.home_team_id] = { en: g.home_team_name_en };
    if (g.away_team_id) teamNameMap[g.away_team_id] = { en: g.away_team_name_en };
  });

  const page = document.createElement('div');
  page.className = 'page';

  const headerLabel = document.createElement('div');
  headerLabel.className = 'section-label';
  headerLabel.textContent = '12 Bảng đấu · Vòng bảng';
  page.appendChild(headerLabel);

  const note = document.createElement('div');
  note.className = 'standings-note mb-4';
  note.style.marginBottom = '16px';
  note.innerHTML = `
    <span style="color:var(--c-gold)">●</span> Top 2 mỗi bảng đi tiếp &nbsp;
    <span style="color:var(--c-green)">●</span> 8 đội hạng ba tốt nhất đi tiếp
  `;
  page.appendChild(note);

  // Sort groups alphabetically
  const sortedGroups = [...(groups || [])].sort((a, b) => a.name.localeCompare(b.name));

  if (sortedGroups.length === 0) {
    page.innerHTML += `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">Đang tải bảng đấu...</div></div>`;
  }

  sortedGroups.forEach(grp => {
    const block = document.createElement('div');
    block.className = 'group-block';

    // Sort teams by pts desc, then gd desc, then gf desc
    const sortedTeams = [...grp.teams].sort((a, b) => {
      if (parseInt(b.pts) !== parseInt(a.pts)) return parseInt(b.pts) - parseInt(a.pts);
      if (parseInt(b.gd) !== parseInt(a.gd)) return parseInt(b.gd) - parseInt(a.gd);
      return parseInt(b.gf) - parseInt(a.gf);
    });

    const rows = sortedTeams.map((t, idx) => {
      const nameEn = teamNameMap[t.team_id]?.en || `Đội ${t.team_id}`;
      const nameVi = getTeamNameVi(nameEn);
      const flagUrl = getFlagUrl(t.team_id);
      const advance = idx < 2 ? 'advance' : '';
      return `
        <tr class="${advance}">
          <td>${idx + 1}</td>
          <td>
            <div class="team-cell">
              ${flagUrl ? `<img class="tbl-flag" src="${flagUrl}" alt="">` : '<div style="width:18px;height:18px;background:var(--c-surface-2);border-radius:50%;flex-shrink:0"></div>'}
              <span>${nameVi}</span>
            </div>
          </td>
          <td>${t.mp}</td>
          <td>${t.w}</td>
          <td>${t.d}</td>
          <td>${t.l}</td>
          <td>${t.gf}</td>
          <td>${t.ga}</td>
          <td>${parseInt(t.gd) > 0 ? '+' : ''}${t.gd}</td>
          <td class="pts-col">${t.pts}</td>
        </tr>`;
    }).join('');

    block.innerHTML = `
      <div class="group-title">Bảng ${grp.name}</div>
      <table class="standings-tbl">
        <thead>
          <tr>
            <th>#</th>
            <th>Đội</th>
            <th>ST</th>
            <th>T</th>
            <th>H</th>
            <th>B</th>
            <th>GF</th>
            <th>GA</th>
            <th>HS</th>
            <th>Đ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
    page.appendChild(block);
  });

  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

function renderKnockout() {
  const { games, stadiums } = state.data;
  const stadiumMap = buildStadiumMap(stadiums);

  const roundOrder = ['r32', 'r16', 'qf', 'sf', 'third', 'final'];
  const roundLabels = {
    r32:   'Vòng 32 đội',
    r16:   'Vòng 16 đội',
    qf:    'Tứ kết',
    sf:    'Bán kết',
    third: 'Hạng 3',
    final: 'Chung kết',
  };

  const koGames = games.filter(g => g.type !== 'group');
  const byRound = {};
  koGames.forEach(g => {
    if (!byRound[g.type]) byRound[g.type] = [];
    byRound[g.type].push(g);
  });

  const page = document.createElement('div');
  page.className = 'page';
  page.style.paddingLeft = '0';
  page.style.paddingRight = '0';

  const label = document.createElement('div');
  label.className = 'section-label';
  label.style.padding = '0 16px';
  label.textContent = 'Vòng Knock-out · Kéo ngang để xem';
  page.appendChild(label);

  const scroll = document.createElement('div');
  scroll.className = 'ko-scroll';

  const bracket = document.createElement('div');
  bracket.className = 'ko-bracket';

  roundOrder.forEach(roundType => {
    const roundGames = byRound[roundType] || [];
    if (roundGames.length === 0) return;

    roundGames.sort((a, b) => parseInt(a.id) - parseInt(b.id));

    const col = document.createElement('div');
    col.style.display = 'flex';
    col.style.flexDirection = 'column';
    col.style.gap = '8px';
    col.style.minWidth = '200px';
    col.style.marginRight = '8px';

    const colLabel = document.createElement('div');
    colLabel.className = 'ko-round-label';
    colLabel.textContent = roundLabels[roundType] || roundType;
    col.appendChild(colLabel);

    roundGames.forEach(g => {
      const isGroupStage = false;
      const hId = g.home_team_id;
      const aId = g.away_team_id;
      const hasTeams = hId && parseInt(hId) > 0;
      const fin = isFinished(g);
      const live = isLive(g);
      const si = getStatusInfo(g);
      const hScore = g.home_score;
      const aScore = g.away_score;
      const hWin = fin && parseInt(hScore) > parseInt(aScore);
      const aWin = fin && parseInt(aScore) > parseInt(hScore);

      const homeName = hasTeams ? getTeamNameVi(g.home_team_name_en) : (g.home_team_label || '?');
      const awayName = hasTeams ? getTeamNameVi(g.away_team_name_en) : (g.away_team_label || '?');

      const matchDiv = document.createElement('div');
      matchDiv.className = `ko-match${live ? ' live-match' : ''}`;

      matchDiv.innerHTML = `
        <div class="ko-team" style="${hWin ? 'opacity:1' : ''}">
          <div class="ko-team-info">
            ${hasTeams ? koFlagEl(hId) : '<div class="ko-flag-ph">?</div>'}
            <span class="ko-name ${hWin ? 'winner' : ''}">${homeName}</span>
          </div>
          <span class="ko-score ${hWin ? 'winner-score' : ''}">${(fin || live) ? hScore : ''}</span>
        </div>
        <div class="ko-team" style="border-bottom:none;${aWin ? 'opacity:1' : ''}">
          <div class="ko-team-info">
            ${hasTeams ? koFlagEl(aId) : '<div class="ko-flag-ph">?</div>'}
            <span class="ko-name ${aWin ? 'winner' : ''}">${awayName}</span>
          </div>
          <span class="ko-score ${aWin ? 'winner-score' : ''}">${(fin || live) ? aScore : ''}</span>
        </div>
      `;

      matchDiv.addEventListener('click', () => openSheet(g, stadiumMap));
      col.appendChild(matchDiv);
    });

    bracket.appendChild(col);

    // Arrow connector (except after last round)
    if (roundType !== 'final' && roundType !== 'third') {
      const arrow = document.createElement('div');
      arrow.className = 'ko-connector';
      arrow.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="color:var(--c-border-2)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;
      bracket.appendChild(arrow);
    }
  });

  scroll.appendChild(bracket);
  page.appendChild(scroll);
  mainContent.innerHTML = '';
  mainContent.appendChild(page);
}

// ─── Tab Routing ──────────────────────────────────────────────────────────────
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tab);
  });
  renderCurrentPage();
}

function renderCurrentPage() {
  if (state.loading) {
    mainContent.innerHTML = `<div class="page">${renderSkeletons(5)}</div>`;
    return;
  }
  if (!state.data) {
    mainContent.innerHTML = `<div class="page"><div class="empty-state">
      <div class="empty-icon">😕</div>
      <div class="empty-title">Không tải được dữ liệu</div>
      <div class="empty-sub">Kiểm tra kết nối mạng và thử lại</div>
      <button class="retry-btn" id="retry-btn">Thử lại</button>
    </div></div>`;
    document.getElementById('retry-btn')?.addEventListener('click', loadData);
    return;
  }

  switch (state.currentTab) {
    case 'today':     renderToday();     break;
    case 'schedule':  renderSchedule();  break;
    case 'results':   renderResults();   break;
    case 'standings': renderStandings(); break;
    case 'knockout':  renderKnockout();  break;
  }
}

// ─── Data Loading ─────────────────────────────────────────────────────────────
let refreshTimer = null;

async function loadData(silent = false) {
  if (!silent) {
    state.loading = true;
    renderCurrentPage();
  }

  refreshBtn.classList.add('spinning');

  const data = await dataService.fetchAll();
  state.data = data;
  state.loading = false;

  refreshBtn.classList.remove('spinning');
  updateTimeEl.textContent = dataService.getLastUpdateText();

  renderCurrentPage();
  scheduleNextRefresh();
}

function scheduleNextRefresh() {
  clearTimeout(refreshTimer);

  if (!state.data) return;

  // If any live games → refresh every 60s
  // Otherwise → refresh every 15min
  const hasLive = (state.data.games || []).some(g => isLive(g));
  const interval = hasLive ? 60_000 : 15 * 60_000;

  refreshTimer = setTimeout(() => loadData(true), interval);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Refresh button
  refreshBtn.addEventListener('click', () => {
    showToast('Đang cập nhật...');
    loadData();
  });

  // Sheet close
  sheetOverlay.addEventListener('click', closeSheet);

  // Load data
  loadData();
}

init();
