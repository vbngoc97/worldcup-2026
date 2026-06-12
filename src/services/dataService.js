/**
 * DataService – fetches and caches World Cup 2026 data from worldcup26.ir
 * Falls back to localStorage cache on network failure.
 */

const API_BASE = 'https://worldcup26.ir/get';
const CACHE_KEY = 'wc2026_cache_v2';
const CACHE_TS_KEY = 'wc2026_cache_ts';

// Team flag images via flagcdn.com (ISO alpha-2 codes)
const TEAM_FLAGS = {
  "1":  "mx", "2":  "za", "3":  "kr", "4":  "cz",
  "5":  "ca", "6":  "ba", "7":  "qa", "8":  "ch",
  "9":  "br", "10": "ma", "11": "ht", "12": "gb-sct",
  "13": "us", "14": "py", "15": "au", "16": "tr",
  "17": "de", "18": "cw", "19": "ci", "20": "ec",
  "21": "nl", "22": "jp", "23": "se", "24": "tn",
  "25": "be", "26": "eg", "27": "ir", "28": "nz",
  "29": "es", "30": "cv", "31": "sa", "32": "uy",
  "33": "fr", "34": "sn", "35": "iq", "36": "no",
  "37": "ar", "38": "dz", "39": "at", "40": "jo",
  "41": "pt", "42": "cd", "43": "uz", "44": "co",
  "45": "gb-eng", "46": "hr", "47": "gh", "48": "pa",
};

// Team name map (English → Vietnamese)
const TEAM_NAMES_VI = {
  "Mexico": "Mexico", "South Africa": "Nam Phi", "South Korea": "Hàn Quốc",
  "Czech Republic": "Cộng hoà Séc", "Canada": "Canada", "Bosnia and Herzegovina": "Bosnia",
  "Qatar": "Qatar", "Switzerland": "Thuỵ Sĩ", "Brazil": "Brazil",
  "Morocco": "Morocco", "Haiti": "Haiti", "Scotland": "Scotland",
  "United States": "Mỹ", "Paraguay": "Paraguay", "Australia": "Úc",
  "Turkey": "Thổ Nhĩ Kỳ", "Germany": "Đức", "Curaçao": "Curaçao",
  "Ivory Coast": "Bờ Biển Ngà", "Ecuador": "Ecuador", "Netherlands": "Hà Lan",
  "Japan": "Nhật Bản", "Sweden": "Thuỵ Điển", "Tunisia": "Tunisia",
  "Belgium": "Bỉ", "Egypt": "Ai Cập", "Iran": "Iran",
  "New Zealand": "New Zealand", "Spain": "Tây Ban Nha", "Cape Verde": "Cape Verde",
  "Saudi Arabia": "Ả Rập Xê Út", "Uruguay": "Uruguay", "France": "Pháp",
  "Senegal": "Senegal", "Iraq": "Iraq", "Norway": "Na Uy",
  "Argentina": "Argentina", "Algeria": "Algeria", "Austria": "Áo",
  "Jordan": "Jordan", "Portugal": "Bồ Đào Nha",
  "Democratic Republic of the Congo": "Congo DR",
  "Uzbekistan": "Uzbekistan", "Colombia": "Colombia",
  "England": "Anh", "Croatia": "Croatia", "Ghana": "Ghana", "Panama": "Panama",
};

export function getFlagUrl(teamId) {
  const code = TEAM_FLAGS[String(teamId)];
  if (!code) return null;
  return `https://flagcdn.com/w40/${code.replace('gb-sct', 'gb-sct').replace('gb-eng', 'gb-eng')}.png`;
}

export function getTeamNameVi(nameEn) {
  return TEAM_NAMES_VI[nameEn] || nameEn;
}

class DataService {
  constructor() {
    this._cache = null;
    this._lastFetchTime = null;
  }

  async fetchAll() {
    try {
      const [gamesRes, groupsRes, stadiumsRes, teamsRes] = await Promise.all([
        fetch(`${API_BASE}/games`),
        fetch(`${API_BASE}/groups`),
        fetch(`${API_BASE}/stadiums`),
        fetch(`${API_BASE}/teams`),
      ]);

      if (!gamesRes.ok) throw new Error('Games fetch failed');

      const gamesData   = await gamesRes.json();
      const groupsData  = groupsRes.ok  ? await groupsRes.json()  : { groups: [] };
      const stadiumData = stadiumsRes.ok ? await stadiumsRes.json() : { stadiums: [] };
      const teamsData   = teamsRes.ok   ? await teamsRes.json()   : { teams: [] };

      const payload = {
        games:    gamesData.games    || [],
        groups:   groupsData.groups  || [],
        stadiums: stadiumData.stadiums || [],
        teams:    teamsData.teams    || [],
        fetchedAt: new Date().toISOString(),
      };

      this._saveCache(payload);
      this._cache = payload;
      this._lastFetchTime = new Date();
      return payload;

    } catch (err) {
      console.warn('[DataService] Network error, using cache:', err.message);
      const cached = this._loadCache();
      if (cached) {
        this._cache = cached;
        return cached;
      }
      return null;
    }
  }

  _saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TS_KEY, data.fetchedAt);
    } catch (_) {}
  }

  _loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  getLastUpdateText() {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (!ts) return '';
    const d = new Date(ts);
    const hh = d.toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
    return `Cập nhật ${hh}`;
  }

  getCache() { return this._cache || this._loadCache(); }
}

export const dataService = new DataService();
