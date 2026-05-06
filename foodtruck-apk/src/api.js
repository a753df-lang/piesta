// 데이터 레이어 - 서버 API + 로컬 저장소
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';

// ⚠️ 배포 시 이 주소를 실제 서버 도메인으로 변경하세요
// 예: https://foodtruck-api.your-domain.com
export const API_BASE = 'https://your-server.com';

// API: 공고 목록 조회
export async function fetchNotices({ region, search } = {}) {
  const params = new URLSearchParams();
  if (region && region !== '전체') params.set('region', region);
  if (search) params.set('search', search);
  params.set('limit', '200');

  const res = await fetch(`${API_BASE}/api/notices?${params}`, {
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`API 오류: ${res.status}`);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || '공고 조회 실패');

  // 서버 응답을 앱 모델로 변환
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
}

// 서버 상태
export async function fetchStats() {
  try {
    const res = await fetch(`${API_BASE}/api/stats`);
    return await res.json();
  } catch {
    return null;
  }
}

// 네트워크 상태 확인
export async function isOnline() {
  const status = await Network.getStatus();
  return status.connected;
}

// ========== 로컬 저장소 (Capacitor Preferences) ==========
const KEYS = {
  cachedNotices: 'cached_notices',
  favorites: 'favorites',
  manualNotices: 'manual_notices',
  settings: 'settings',
  seenIds: 'seen_ids',
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

  // 이미 알림으로 본 공고 ID 추적 (중복 알림 방지)
  async getSeenIds() {
    const { value } = await Preferences.get({ key: KEYS.seenIds });
    return new Set(value ? JSON.parse(value) : []);
  },
  async addSeenIds(ids) {
    const set = await storage.getSeenIds();
    ids.forEach(id => set.add(id));
    // 너무 커지지 않게 최근 1000개만 유지
    const arr = [...set].slice(-1000);
    await Preferences.set({ key: KEYS.seenIds, value: JSON.stringify(arr) });
  },
};
