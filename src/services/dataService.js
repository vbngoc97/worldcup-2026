/**
 * DataService – Dual source strategy:
 *   1. ESPN API   → Kickoff UTC timestamps, live scores, real-time status
 *   2. worldcup26.ir → Full 104-match schedule, standings, stadium info
 *
 * ESPN data takes priority for: date/time (UTC), score, status.
 * worldcup26.ir provides: structure, group data, knockout draw, stadium details.
 */

const WC26_BASE = 'https://worldcup26.ir/get';
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const CACHE_KEY = 'wc2026_dual_v3';
const CACHE_TS  = 'wc2026_ts_v3';
const TZ        = 'Asia/Ho_Chi_Minh';

// ─── Stadium timezone offsets (hours to ADD to local_date to get UTC) ─────────
// Based on 2026 World Cup summer dates (Jun–Jul 2026)
// Mexico: no DST since 2023 → CST = UTC-6
// Eastern US/Canada: EDT = UTC-4
// Central US: CDT = UTC-5
// Pacific US/Canada: PDT = UTC-7
export const STADIUM_UTC_OFFSET = {
  '1':  6,  // Estadio Azteca, Mexico City      (CST = UTC-6)
  '2':  6,  // Estadio Akron, Guadalajara        (CST = UTC-6)
  '3':  6,  // Estadio BBVA, Monterrey           (CST = UTC-6)
  '4':  5,  // AT&T Stadium, Dallas              (CDT = UTC-5)
  '5':  5,  // NRG Stadium, Houston              (CDT = UTC-5)
  '6':  5,  // Arrowhead, Kansas City            (CDT = UTC-5)
  '7':  4,  // Mercedes-Benz Stadium, Atlanta    (EDT = UTC-4)
  '8':  4,  // Hard Rock Stadium, Miami          (EDT = UTC-4)
  '9':  4,  // Gillette Stadium, Boston          (EDT = UTC-4)
  '10': 4,  // Lincoln Financial, Philadelphia   (EDT = UTC-4)
  '11': 4,  // MetLife Stadium, NY/NJ            (EDT = UTC-4)
  '12': 4,  // BMO Field, Toronto                (EDT = UTC-4)
  '13': 7,  // BC Place, Vancouver               (PDT = UTC-7)
  '14': 7,  // Lumen Field, Seattle              (PDT = UTC-7)
  '15': 7,  // Levi's Stadium, San Francisco     (PDT = UTC-7)
  '16': 7,  // SoFi Stadium, Los Angeles         (PDT = UTC-7)
};

// ─── Flag images via flagcdn.com ─────────────────────────────────────────────
const FLAG_MAP = {
  '1':'mx','2':'za','3':'kr','4':'cz','5':'ca','6':'ba','7':'qa','8':'ch',
  '9':'br','10':'ma','11':'ht','12':'gb-sct','13':'us','14':'py','15':'au',
  '16':'tr','17':'de','18':'cw','19':'ci','20':'ec','21':'nl','22':'jp',
  '23':'se','24':'tn','25':'be','26':'eg','27':'ir','28':'nz','29':'es',
  '30':'cv','31':'sa','32':'uy','33':'fr','34':'sn','35':'iq','36':'no',
  '37':'ar','38':'dz','39':'at','40':'jo','41':'pt','42':'cd','43':'uz',
  '44':'co','45':'gb-eng','46':'hr','47':'gh','48':'pa',
};

const NAMES_VI = {
  'Mexico':'Mexico','South Africa':'Nam Phi','South Korea':'Hàn Quốc',
  'Czech Republic':'Cộng hoà Séc','Canada':'Canada',
  'Bosnia-Herzegovina':'Bosnia','Bosnia and Herzegovina':'Bosnia',
  'Qatar':'Qatar','Switzerland':'Thuỵ Sĩ','Brazil':'Brazil',
  'Morocco':'Morocco','Haiti':'Haiti','Scotland':'Scotland',
  'United States':'Mỹ','USA':'Mỹ','Paraguay':'Paraguay','Australia':'Úc',
  'Turkey':'Thổ Nhĩ Kỳ','Germany':'Đức','Curaçao':'Curaçao','Curacao':'Curaçao',
  'Ivory Coast':'Bờ Biển Ngà',"Côte d'Ivoire":'Bờ Biển Ngà',
  'Ecuador':'Ecuador','Netherlands':'Hà Lan','Japan':'Nhật Bản',
  'Sweden':'Thuỵ Điển','Tunisia':'Tunisia','Belgium':'Bỉ','Egypt':'Ai Cập',
  'Iran':'Iran','New Zealand':'New Zealand','Spain':'Tây Ban Nha',
  'Cape Verde':'Cape Verde','Saudi Arabia':'Ả Rập Xê Út','Uruguay':'Uruguay',
  'France':'Pháp','Senegal':'Senegal','Iraq':'Iraq','Norway':'Na Uy',
  'Argentina':'Argentina','Algeria':'Algeria','Austria':'Áo','Jordan':'Jordan',
  'Portugal':'Bồ Đào Nha','DR Congo':'Congo DR',
  'Democratic Republic of the Congo':'Congo DR',
  'Uzbekistan':'Uzbekistan','Colombia':'Colombia',
  'England':'Anh','Croatia':'Croatia','Ghana':'Ghana','Panama':'Panama',
};

export const getFlagUrl  = id => { const c = FLAG_MAP[String(id)]; return c ? `https://flagcdn.com/w40/${c}.png` : null; };
export const getTeamNameVi = en => NAMES_VI[en] || en || '?';

// ─── ESPN status → wc26 patch ─────────────────────────────────────────────────
function espnStatusPatch(ev) {
  const comp = ev.competitions?.[0];
  if (!comp) return null;
  const st    = comp.status?.type;
  const state = st?.state;
  const name  = st?.name || '';

  const comps = comp.competitors || [];
  const home  = comps.find(c => c.homeAway === 'home');
  const away  = comps.find(c => c.homeAway === 'away');

  const base = {
    _espnPatched:   true,
    _espnDateUTC:   ev.date,            // ISO 8601 UTC string – authoritative kickoff time
    home_score:     home?.score ?? '0',
    away_score:     away?.score ?? '0',
    home_name_espn: home?.team?.displayName,
    away_name_espn: away?.team?.displayName,
  };

  if (state === 'post' || name.includes('FULL_TIME') || name.includes('FINAL')) {
    return { ...base, finished: 'TRUE', time_elapsed: 'finished' };
  }
  if (name === 'STATUS_HALFTIME') {
    return { ...base, finished: 'FALSE', time_elapsed: 'halftime' };
  }
  if (state === 'in') {
    const clock = comp.status?.displayClock || '?';
    return { ...base, finished: 'FALSE', time_elapsed: clock };
  }
  // pre / scheduled
  return { ...base, finished: 'FALSE', time_elapsed: 'notstarted' };
}

// ─── Name normalizer for matching teams across sources ────────────────────────
const norm = (s = '') =>
  s.toLowerCase()
   .replace(/[^a-z]/g, '')
   .replace('unitedstates', 'usa')
   .replace('bosniaher', 'bosnia')
   .replace('bosniaandherzegovina', 'bosnia')
   .replace("cotedivoire", 'ivorycoast')
   .replace('democraticrepublicofthecongo', 'drcongo');

function buildEspnLookup(events) {
  const map = {};
  for (const ev of events) {
    const patch = espnStatusPatch(ev);
    if (!patch) continue;
    const comp  = ev.competitions?.[0];
    const comps = comp?.competitors || [];
    const home  = comps.find(c => c.homeAway === 'home');
    const away  = comps.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    const hN = norm(home.team?.displayName);
    const aN = norm(away.team?.displayName);
    map[`${hN}__${aN}`] = patch;
    // Also index by ESPN event date (YYYY-MM-DD) for extra match reliability
    const dk = ev.date?.slice(0, 10);
    map[`${dk}__${hN}`] = patch;
  }
  return map;
}

// ─── Fetch ESPN for a 3-day window around today ───────────────────────────────
async function fetchEspnEvents() {
  const dates = [];
  for (let i = -1; i <= 2; i++) {
    const d = new Date(); d.setUTCDate(d.getUTCDate() + i);
    dates.push(d.toISOString().slice(0, 10).replace(/-/g, ''));
  }
  const all = [];
  await Promise.all(dates.map(async dt => {
    try {
      const r = await fetch(`${ESPN_BASE}/scoreboard?dates=${dt}&limit=20`);
      if (r.ok) { const j = await r.json(); all.push(...(j.events || [])); }
    } catch (e) { console.warn('[ESPN] failed', dt, e.message); }
  }));
  return all;
}

// ─── Main DataService ─────────────────────────────────────────────────────────
class DataService {
  constructor() { this._cache = null; }

  async fetchAll() {
    try {
      const [gR, grR, stR, espnEvents] = await Promise.allSettled([
        fetch(`${WC26_BASE}/games`   ).then(r => r.ok ? r.json() : null),
        fetch(`${WC26_BASE}/groups`  ).then(r => r.ok ? r.json() : null),
        fetch(`${WC26_BASE}/stadiums`).then(r => r.ok ? r.json() : null),
        fetchEspnEvents(),
      ]);

      const games    = gR.value?.games    || [];
      const groups   = grR.value?.groups  || [];
      const stadiums = stR.value?.stadiums|| [];
      const espn     = espnEvents.value   || [];

      const lookup = buildEspnLookup(espn);

      const patchedGames = games.map(g => {
        if (g.type !== 'group') return g;
        const hN = norm(g.home_team_name_en);
        const aN = norm(g.away_team_name_en);
        const patch = lookup[`${hN}__${aN}`];
        return patch ? { ...g, ...patch } : g;
      });

      const payload = { games: patchedGames, groups, stadiums, fetchedAt: new Date().toISOString() };
      this._saveCache(payload);
      this._cache = payload;
      return payload;

    } catch (err) {
      console.warn('[DataService] error, using cache:', err);
      return this._loadCache();
    }
  }

  _saveCache(d) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(d));
      localStorage.setItem(CACHE_TS,  d.fetchedAt);
    } catch (_) {}
  }

  _loadCache() {
    try {
      const r = localStorage.getItem(CACHE_KEY);
      return r ? (this._cache = JSON.parse(r)) : null;
    } catch (_) { return null; }
  }

  getLastUpdateText() {
    const ts = localStorage.getItem(CACHE_TS);
    if (!ts) return '';
    return 'Cập nhật ' + new Date(ts).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });
  }

  getCache() { return this._cache || this._loadCache(); }
}

export const dataService = new DataService();
