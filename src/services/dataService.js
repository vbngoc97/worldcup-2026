export class DataService {
  constructor() {
    this.useMockData = true; // Cấu hình để sử dụng dữ liệu mock
    this.apiToken = ''; // Token API nếu có
    this.baseUrl = 'https://api.football-data.org/v4';
    this.cacheKey = 'wc2026_data_cache';
    this.lastUpdateKey = 'wc2026_last_update';
  }

  async fetchData() {
    try {
      if (this.useMockData) {
        return await this.fetchMockData();
      }

      const headers = new Headers();
      if (this.apiToken) {
        headers.append('X-Auth-Token', this.apiToken);
      }

      const response = await fetch(`${this.baseUrl}/competitions/WC/matches?season=2026`, {
        method: 'GET',
        headers: headers
      });

      if (!response.ok) {
        throw new Error('API fetch failed');
      }

      const data = await response.json();
      this.saveToCache(data);
      return data;
    } catch (error) {
      console.warn('Fetching data failed, trying cache...', error);
      return this.getFromCache();
    }
  }

  async fetchMockData() {
    try {
      const response = await fetch('./src/data/worldcup-2026.json');
      if (!response.ok) throw new Error('Mock data fetch failed');
      const data = await response.json();
      this.saveToCache(data);
      return data;
    } catch (error) {
      console.warn('Fetching mock data failed, trying cache...', error);
      return this.getFromCache();
    }
  }

  saveToCache(data) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify(data));
      localStorage.setItem(this.lastUpdateKey, new Date().toISOString());
    } catch (e) {
      console.error('Failed to save to cache', e);
    }
  }

  getFromCache() {
    try {
      const data = localStorage.getItem(this.cacheKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to read from cache', e);
    }
    return null;
  }

  getLastUpdateTime() {
    const time = localStorage.getItem(this.lastUpdateKey);
    if (!time) return null;
    const date = new Date(time);
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
  }
}

export const dataService = new DataService();
