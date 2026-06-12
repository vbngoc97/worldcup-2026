/**
 * DataService – Dual source strategy:
 *   1. worldcup26.ir   → Full schedule (104 matches), standings, stadiums [structure]
 *   2. ESPN hidden API  → Live/completed scores, real-time status     [scores]
 *
 * ESPN data takes priority for status/score on matched games.
 * No API keys required for either source.
 */

const WC26_BASE   = 'https://worldcup26.ir/get';
const ESPN_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const CACHE_KEY   = 'wc2026_dual_v1';
const CACHE_TS    = 'wc2026_ts_v1';
const TZ          = 'Asia/Ho_Chi_Minh';

// ─── Flag images via flagcdn.com ─────────────────────────────────────────────
const FLAG_MAP = {
  "1":"mx","2":"za","3":"kr","4":"cz","5":"ca","6":"ba","7":"qa","8":"ch",
  "9":"br","10":"ma","11":"ht","12":"gb-sct","13":"us","14":"py","15":"au",
  "16":"tr","17":"de","18":"cw","19":"ci","20":"ec","21":"nl","22":"jp",
  "23":"se","24":"tn","25":"be","26":"eg","27":"ir","28":"nz","29":"es",
  "30":"cv","31":"sa","32":"uy","33":"fr","34":"sn","35":"iq","36":"no",
  "37":"ar","38":"dz","39":"at","40":"jo","41":"pt","42":"cd","43":"uz",
  "44":"co","45":"gb-eng","46":"hr","47":"gh","48":"pa",
};

const NAMES_VI = {
  "Mexico":"Mexico","South Africa":"Nam Phi","South Korea":"Hàn Quốc",
  "Czech Republic":"Cộng hoà Séc","Canada":"Canada",
  "Bosnia-Herzegovina":"Bosnia","Bosnia and Herzegovina":"Bosnia",
  "Qatar":"Qatar","Switzerland":"Thuỵ Sĩ","Brazil":"Brazil",
  "Morocco":"Morocco","Haiti":"Haiti","Scotland":"Scotland",
  "United States":"Mỹ","USA":"Mỹ","Paraguay":"Paraguay","Australia":"Úc",
  "Turkey":"Thổ Nhĩ Kỳ","Germany":"Đức","Curaçao":"Curaçao","Curacao":"Curaçao",
  "Ivory Coast":"Bờ Biển Ngà","Côte d'Ivoire":"Bờ Biển Ngà",
  "Ecuador":"Ecuador","Netherlands":"Hà Lan","Japan":"Nhật Bản",
  "Sweden":"Thuỵ Điển","Tunisia":"Tunisia","Belgium":"Bỉ","Egypt":"Ai Cập",
  "Iran":"Iran","New Zealand":"New Zealand","Spain":"Tây Ban Nha",
  "Cape Verde":"Cape Verde","Saudi Arabia":"Ả Rập Xê Út","Uruguay":"Uruguay",
  "France":"Pháp","Senegal":"Senegal","Iraq":"Iraq","Norway":"Na Uy",
  "Argentina":"Argentina","Algeria":"Algeria","Austria":"Áo","Jordan":"Jordan",
  "Portugal":"Bồ Đào Nha","DR Congo":"Congo DR",
  "Democratic Republic of the Congo":"Congo DR",
  "Uzbekistan":"Uzbekistan","Colombia":"Colombia",
  "England":"Anh","Croatia":"Croatia","Ghana":"Ghana","Panama":"Panama",
};

export function getFlagUrl(teamId) {
  const code = FLAG_MAP[String(teamId)];
  return code ? `https://flagcdn.com/w40/${code}.png` : null;
}

export function getTeamNameVi(nameEn) {
  return NAMES_VI[nameEn] || nameEn || '?';
}

// ─── ESPN status mapper ───────────────────────────────────────────────────────
function espnToWc26Status(espnEvent) {
  const comp = espnEvent.competitions?.[0];
  if (!comp) return null;
  const st = comp.status?.type;
  if (!st) return null;

  // state: "pre" | "in" | "post"
  const state = st.state;
  const name  = st.name; // STATUS_SCHEDULED | STATUS_IN_PROGRESS | STATUS_FULL_TIME | STATUS_HALFTIME | ...

  if (state === 'post' || name === 'STATUS_FULL_TIME' || name === 'STATUS_FINAL_OT' || name === 'STATUS_FINAL_PEN') {
    const competitors = comp.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');
    return {
      finished: 'TRUE',
      time_elapsed: 'finished',
      home_score: home?.score ?? '0',
      away_score: away?.score ?? '0',
      home_name_espn: home?.team?.displayName,
      away_name_espn: away?.team?.displayName,
      home_logo_espn: home?.team?.logo,
      away_logo_espn: away?.team?.logo,
      clock: comp.status?.displayClock,
    };
  }

  if (state === 'in' || name === 'STATUS_IN_PROGRESS') {
    const competitors = comp.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');
    const clock = comp.status?.displayClock || '?';
    return {
      finished: 'FALSE',
      time_elapsed: clock,
      home_score: home?.score ?? '0',
      away_score: away?.score ?? '0',
      home_name_espn: home?.team?.displayName,
      away_name_espn: away?.team?.displayName,
      home_logo_espn: home?.team?.logo,
      away_logo_espn: away?.team?.logo,
      clock,
    };
  }

  if (name === 'STATUS_HALFTIME') {
    const competitors = comp.competitors || [];
    const home = competitors.find(c => c.homeAway === 'home');
    const away = competitors.find(c => c.homeAway === 'away');
    return {
      finished: 'FALSE',
      time_elapsed: 'halftime',
      home_score: home?.score ?? '0',
      away_score: away?.score ?? '0',
    };
  }

  return { finished: 'FALSE', time_elapsed: 'notstarted' };
}

// ─── Build ESPN lookup key ────────────────────────────────────────────────────
// Key: normalize team names for matching across sources
function normalizeTeamName(name = '') {
  return name.toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace('unitedstates', 'usa')
    .replace('bosniaher', 'bosnia')
    .replace('cotered', 'ivorycoast')
    .replace('ivorycoast', 'cotedivoire')
    .replace('democraticrepublicofthecongo', 'drcongo')
    .replace('drcongo', 'congodr');
}

function buildEspnLookup(espnEvents) {
  // Map: "homeAbbr_awayAbbr" → espn status patch
  const lookup = {};
  for (const ev of espnEvents) {
    const comp = ev.competitions?.[0];
    if (!comp) continue;
    const comps = comp.competitors || [];
    const home = comps.find(c => c.homeAway === 'home');
    const away = comps.find(c => c.homeAway === 'away');
    if (!home || !away) continue;
    const patch = espnToWc26Status(ev);
    if (!patch) continue;

    // Store by normalized name pair
    const hN = normalizeTeamName(home.team?.displayName);
    const aN = normalizeTeamName(away.team?.displayName);
    lookup[`${hN}__${aN}`] = patch;
    lookup[`${aN}__${hN}`] = { ...patch,  // Also store reverse for robustness
      home_score: patch.away_score,
      away_score: patch.home_score,
      home_name_espn: patch.away_name_espn,
      away_name_espn: patch.home_name_espn,
    };

    // Also key by date+teams for extra reliability
    const dateKey = ev.date?.substring(0, 10); // YYYY-MM-DD
    lookup[`${dateKey}__${hN}`] = patch;
  }
  return lookup;
}

function applyEspnPatch(game, lookup) {
  const hN = normalizeTeamName(game.home_team_name_en);
  const aN = normalizeTeamName(game.away_team_name_en);
  const patch = lookup[`${hN}__${aN}`];
  if (!patch) return game;
  return { ...game, ...patch, _espnPatched: true };
}

// ─── Date range for ESPN fetch ────────────────────────────────────────────────
// Fetch from today -1 through today +1 to catch live matches near midnight
function getEspnDateRange() {
  const now = new Date();
  const dates = [];
  for (let offset = -1; offset <= 1; offset++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + offset);
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd   = String(d.getUTCDate()).padStart(2, '0');
    dates.push(`${yyyy}${mm}${dd}`);
  }
  return dates;
}

// ─── Fetch ESPN data for multiple dates ──────────────────────────────────────
async function fetchEspnEvents() {
  const dates = getEspnDateRange();
  const all = [];
  for (const date of dates) {
    try {
      const res = await fetch(`${ESPN_BASE}/scoreboard?dates=${date}&limit=20`);
      if (res.ok) {
        const json = await res.json();
        all.push(...(json.events || []));
      }
    } catch (e) {
      console.warn('[ESPN] fetch failed for date', date, e.message);
    }
  }
  return all;
}

// ─── Main DataService class ───────────────────────────────────────────────────
class DataService {
  constructor() {
    this._cache = null;
  }

  async fetchAll() {
    try {
      // Fetch both sources in parallel
      const [wc26Games, wc26Groups, wc26Stadiums, espnEvents] = await Promise.allSettled([
        fetch(`${WC26_BASE}/games`).then(r => r.ok ? r.json() : null),
        fetch(`${WC26_BASE}/groups`).then(r => r.ok ? r.json() : null),
        fetch(`${WC26_BASE}/stadiums`).then(r => r.ok ? r.json() : null),
        fetchEspnEvents(),
      ]);

      const games    = wc26Games.value?.games   || wc26Games.status === 'fulfilled' && wc26Games.value?.games || [];
      const groups   = wc26Groups.value?.groups || [];
      const stadiums = wc26Stadiums.value?.stadiums || [];
      const espn     = espnEvents.value || [];

      // Build ESPN lookup and patch games
      const espnLookup = buildEspnLookup(espn);
      const patchedGames = games.map(g => {
        // Only patch group stage games with team names
        if (g.type !== 'group') return g;
        return applyEspnPatch(g, espnLookup);
      });

      const payload = {
        games: patchedGames,
        groups,
        stadiums,
        espnRaw: espn,
        fetchedAt: new Date().toISOString(),
      };

      this._saveCache(payload);
      this._cache = payload;
      return payload;

    } catch (err) {
      console.warn('[DataService] Error, trying cache:', err);
      return this._loadCache();
    }
  }

  _saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TS, data.fetchedAt);
    } catch (_) {}
  }

  _loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        this._cache = JSON.parse(raw);
        return this._cache;
      }
    } catch (_) {}
    return null;
  }

  getLastUpdateText() {
    const ts = localStorage.getItem(CACHE_TS);
    if (!ts) return '';
    const d = new Date(ts);
    return 'Cập nhật ' + d.toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });
  }

  getCache() {
    return this._cache || this._loadCache();
  }
}

export const dataService = new DataService();
