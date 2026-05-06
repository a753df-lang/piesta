// 데이터 레이어 - 서버 API + 로컬 저장소
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

// ⚠️ 배포 시 이 주소를 실제 서버 도메인으로 변경하세요
export const API_BASE = 'https://your-server.com';

// API: 공고 목록 조회
export async function fetchNotices({ region, search } = {}) {
  const params = new URLSearchParams();
  if (region && region !== '전체') params.set('region', region);
  if (search) params.set('search', search);
  params.set('limit', '200');

  try {
    const res = await fetch(`${API_BASE}/api/notices?${params}`, {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`API 오류: ${res.status}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '공고 조회 실패');

    return (data.notices || []).map(n => ({
      id: n.id,
      region: n.region,
      title: n.title,
      org: n.org || '',
      deadline: n.deadline || n.posted_date || '',
      eventDate: '',
      location: '',
      url: n.url,
      summary: n.raw_text || '',
      fee: '',
      isNew: !!n.is_new,
      createdAt: n.created_at,
    }));
  } catch (err) {
    // 서버가 없거나 연결 실패 시 빈 배열 반환 (앱은 정상 동작)
    console.warn('서버 연결 실패:', err.message);
    return [];
  }
}

export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function isOnline() {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return true;
  }
}

// ========== 로컬 저장소 ==========
const KEYS = {
  cachedNotices: 'cached_notices',
  favorites: 'favorites',
  manualNotices: 'manual_notices',
  settings: 'settings',
  seenIds: 'seen_ids',
  customRegions: 'custom_regions',
  customSites: 'custom_sites',
};

export const storage = {
  async getCachedNotices() {
    const { value } = await Preferences.get({ key: KEYS.cachedNotices });
    return value ? JSON.parse(value) : [];
  },
  async setCachedNotices(notices) {
    await Preferences.set({ key: KEYS.cachedNotices, value: JSON.stringify(notices) });
  },

  async getFavorites() {
    const { value } = await Preferences.get({ key: KEYS.favorites });
    return new Set(value ? JSON.parse(value) : []);
  },
  async setFavorites(set) {
    await Preferences.set({ key: KEYS.favorites, value: JSON.stringify([...set]) });
  },

  async getManualNotices() {
    const { value } = await Preferences.get({ key: KEYS.manualNotices });
    return value ? JSON.parse(value) : [];
  },
  async setManualNotices(list) {
    await Preferences.set({ key: KEYS.manualNotices, value: JSON.stringify(list) });
  },

  async getSettings() {
    const { value } = await Preferences.get({ key: KEYS.settings });
    return value ? JSON.parse(value) : {
      notifyEnabled: true,
      notifyDays: 3,
      regions: ['전체'],
      autoRefresh: true,
    };
  },
  async setSettings(s) {
    await Preferences.set({ key: KEYS.settings, value: JSON.stringify(s) });
  },

  async getSeenIds() {
    const { value } = await Preferences.get({ key: KEYS.seenIds });
    return new Set(value ? JSON.parse(value) : []);
  },
  async addSeenIds(ids) {
    const set = await storage.getSeenIds();
    ids.forEach(id => set.add(id));
    const arr = [...set].slice(-1000);
    await Preferences.set({ key: KEYS.seenIds, value: JSON.stringify(arr) });
  },

  // 사용자 정의 지역
  async getCustomRegions() {
    const { value } = await Preferences.get({ key: KEYS.customRegions });
    return value ? JSON.parse(value) : [];
  },
  async setCustomRegions(list) {
    await Preferences.set({ key: KEYS.customRegions, value: JSON.stringify(list) });
  },

  // 사용자 정의 사이트
  async getCustomSites() {
    const { value } = await Preferences.get({ key: KEYS.customSites });
    return value ? JSON.parse(value) : [];
  },
  async setCustomSites(list) {
    await Preferences.set({ key: KEYS.customSites, value: JSON.stringify(list) });
  },
};
