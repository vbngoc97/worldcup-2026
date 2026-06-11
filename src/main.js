import { dataService } from './services/dataService.js';
import { formatVietnamTime, formatVietnamDate, isTodayVietnam, getStatusText } from './utils/time.js';
import { computeStandings } from './utils/standings.js';

let appData = null;
let currentTab = 'today';

const mainContent = document.getElementById('main-content');
const lastUpdateEl = document.getElementById('last-update');
const sheetOverlay = document.getElementById('sheet-overlay');
const matchDetailsSheet = document.getElementById('match-details-sheet');
const sheetContent = document.getElementById('match-details-content');

async function init() {
  updateLoading();
  appData = await dataService.fetchData();
  
  const lastUpdate = dataService.getLastUpdateTime();
  if (lastUpdate) {
    lastUpdateEl.textContent = `Cập nhật lúc ${lastUpdate}`;
  }
  
  setupTabs();
  setupSheet();
  render();
}

function updateLoading() {
  mainContent.innerHTML = `
    <div class="text-center mt-4 text-muted">
      <div class="skeleton skeleton-text mb-2"></div>
      <div class="skeleton skeleton-text mb-2"></div>
      <div class="skeleton skeleton-text"></div>
    </div>
  `;
}

function setupTabs() {
  const tabs = document.querySelectorAll('.nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      render();
    });
  });
}

function setupSheet() {
  sheetOverlay.addEventListener('click', closeSheet);
}

function openSheet(match) {
  const status = getStatusText(match.status);
  const time = formatVietnamTime(match.utcDate);
  const date = formatVietnamDate(match.utcDate);
  const isLive = match.status === 'IN_PLAY';
  
  const hTeam = match.homeTeam;
  const aTeam = match.awayTeam;
  
  const hScore = match.score.fullTime.home !== null ? match.score.fullTime.home : '-';
  const aScore = match.score.fullTime.away !== null ? match.score.fullTime.away : '-';
  
  sheetContent.innerHTML = `
    <div class="text-center mb-4">
      <div class="match-status ${isLive ? 'live' : ''}" style="display: inline-block;">${status}</div>
      <div class="mt-2 text-muted" style="font-size:12px;">${date} • ${time}</div>
      <div class="mt-2" style="font-size:12px; font-weight: 600;">${match.group ? match.group.replace('_', ' ') : match.stage} • ${match.venue}</div>
    </div>
    
    <div class="teams-container" style="gap: 20px;">
      <div class="team-row">
        <div class="team-info">
          <img class="team-flag" style="width:40px; height:40px;" src="${hTeam?.crest || ''}" alt="${hTeam?.name || '?'}">
          <span class="team-name" style="font-size: 18px;">${hTeam?.name || 'Chưa xác định'}</span>
        </div>
        <div class="team-score" style="font-size: 24px;">${hScore}</div>
      </div>
      <div class="team-row">
        <div class="team-info">
          <img class="team-flag" style="width:40px; height:40px;" src="${aTeam?.crest || ''}" alt="${aTeam?.name || '?'}">
          <span class="team-name" style="font-size: 18px;">${aTeam?.name || 'Chưa xác định'}</span>
        </div>
        <div class="team-score" style="font-size: 24px;">${aScore}</div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 text-center" style="border-top: 1px solid var(--border-color);">
      <button class="filter-btn active" style="width: 100%; padding: 12px; font-size: 16px; font-weight:600;">
        + Thêm vào lịch
      </button>
    </div>
  `;
  
  sheetOverlay.classList.add('active');
  matchDetailsSheet.classList.add('active');
}

function closeSheet() {
  sheetOverlay.classList.remove('active');
  matchDetailsSheet.classList.remove('active');
}

function render() {
  if (!appData || !appData.matches) {
    mainContent.innerHTML = `<div class="text-center mt-4">Không tải được dữ liệu. Vui lòng thử lại.</div>`;
    return;
  }
  
  mainContent.innerHTML = ''; // Clear
  
  switch(currentTab) {
    case 'today':
      renderToday();
      break;
    case 'schedule':
      renderSchedule();
      break;
    case 'results':
      renderResults();
      break;
    case 'standings':
      renderStandings();
      break;
    case 'knockout':
      renderKnockout();
      break;
  }
}

function createMatchCard(match) {
  const div = document.createElement('div');
  div.className = 'match-card';
  
  const status = getStatusText(match.status);
  const time = formatVietnamTime(match.utcDate);
  const isLive = match.status === 'IN_PLAY';
  
  const hTeam = match.homeTeam;
  const aTeam = match.awayTeam;
  
  const hScore = match.score.fullTime.home !== null ? match.score.fullTime.home : '-';
  const aScore = match.score.fullTime.away !== null ? match.score.fullTime.away : '-';

  div.innerHTML = `
    <div class="match-header">
      <span>${time} • ${match.group ? match.group.replace('_', ' ') : match.stage}</span>
      <span class="match-status ${isLive ? 'live' : ''}">${status}</span>
    </div>
    <div class="teams-container">
      <div class="team-row">
        <div class="team-info">
          <img class="team-flag" src="${hTeam?.crest || ''}" alt="${hTeam?.name || '?'}">
          <span class="team-name">${hTeam?.name || 'Chưa xác định'}</span>
        </div>
        <div class="team-score">${hScore}</div>
      </div>
      <div class="team-row">
        <div class="team-info">
          <img class="team-flag" src="${aTeam?.crest || ''}" alt="${aTeam?.name || '?'}">
          <span class="team-name">${aTeam?.name || 'Chưa xác định'}</span>
        </div>
        <div class="team-score">${aScore}</div>
      </div>
    </div>
  `;
  
  div.addEventListener('click', () => openSheet(match));
  return div;
}

function renderToday() {
  const matches = appData.matches;
  const todayMatches = matches.filter(m => isTodayVietnam(m.utcDate));
  
  const title = document.createElement('h2');
  title.className = 'section-title';
  title.innerHTML = 'Hôm nay';
  mainContent.appendChild(title);
  
  if (todayMatches.length > 0) {
    todayMatches.forEach(m => mainContent.appendChild(createMatchCard(m)));
  } else {
    // Tìm trận sắp tới gần nhất
    const upcoming = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
    if (upcoming.length > 0) {
      upcoming.sort((a,b) => new Date(a.utcDate) - new Date(b.utcDate));
      const nextMatch = upcoming[0];
      const nextDateStr = formatVietnamDate(nextMatch.utcDate);
      
      const sub = document.createElement('div');
      sub.className = 'text-center mb-4 text-muted';
      sub.innerText = `Không có trận nào hôm nay. Trận tiếp theo vào ${nextDateStr}.`;
      mainContent.appendChild(sub);
      
      mainContent.appendChild(createMatchCard(nextMatch));
    } else {
      mainContent.innerHTML += `<div class="text-center text-muted">Giải đấu đã kết thúc.</div>`;
    }
  }
}

function renderSchedule() {
  const matches = appData.matches.filter(m => m.status !== 'FINISHED');
  matches.sort((a,b) => new Date(a.utcDate) - new Date(b.utcDate));
  
  const title = document.createElement('h2');
  title.className = 'section-title';
  title.innerHTML = 'Lịch thi đấu';
  mainContent.appendChild(title);

  // Nhóm theo ngày
  let currentDate = '';
  matches.forEach(m => {
    const dateStr = formatVietnamDate(m.utcDate);
    if (dateStr !== currentDate) {
      const dTitle = document.createElement('div');
      dTitle.className = 'mt-4 mb-2 text-muted';
      dTitle.style.fontSize = '12px';
      dTitle.style.fontWeight = '600';
      dTitle.innerText = dateStr;
      mainContent.appendChild(dTitle);
      currentDate = dateStr;
    }
    mainContent.appendChild(createMatchCard(m));
  });
}

function renderResults() {
  const matches = appData.matches.filter(m => m.status === 'FINISHED');
  matches.sort((a,b) => new Date(b.utcDate) - new Date(a.utcDate)); // Mới nhất lên đầu
  
  const title = document.createElement('h2');
  title.className = 'section-title';
  title.innerHTML = 'Kết quả';
  mainContent.appendChild(title);

  matches.forEach(m => mainContent.appendChild(createMatchCard(m)));
}

function renderStandings() {
  const title = document.createElement('h2');
  title.className = 'section-title';
  title.innerHTML = 'Bảng đấu';
  mainContent.appendChild(title);
  
  const standings = computeStandings(appData.matches);
  if (!standings || standings.length === 0) {
    mainContent.innerHTML += '<div class="text-muted">Chưa có dữ liệu bảng đấu.</div>';
    return;
  }
  
  standings.forEach(groupData => {
    const tableDiv = document.createElement('div');
    tableDiv.innerHTML = `
      <h3 style="font-size: 14px; margin-bottom: 8px;">${groupData.group}</h3>
      <table class="standings-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Đội</th>
            <th>ST</th>
            <th>HS</th>
            <th>Đ</th>
          </tr>
        </thead>
        <tbody>
          ${groupData.table.map(row => `
            <tr class="${row.position <= 2 ? 'top-two' : ''}">
              <td>${row.position}</td>
              <td>
                <img src="${row.team.crest}" style="width:16px; height:16px; border-radius:50%;" />
                ${row.team.shortName || row.team.name}
              </td>
              <td>${row.playedGames}</td>
              <td>${row.goalDifference > 0 ? '+'+row.goalDifference : row.goalDifference}</td>
              <td style="font-weight:bold; color:var(--text-primary);">${row.points}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    mainContent.appendChild(tableDiv);
  });
}

function renderKnockout() {
  const title = document.createElement('h2');
  title.className = 'section-title';
  title.innerHTML = 'Vòng Knock-out';
  mainContent.appendChild(title);
  
  const koMatches = appData.matches.filter(m => m.stage !== 'GROUP_STAGE');
  if (koMatches.length === 0) {
    mainContent.innerHTML += '<div class="text-muted mt-2">Dữ liệu vòng Knock-out sẽ có sau vòng bảng.</div>';
    return;
  }
  
  // Hiển thị đơn giản list các trận Knockout
  koMatches.forEach(m => mainContent.appendChild(createMatchCard(m)));
}

// Khởi chạy
init();
