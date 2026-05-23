import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import {
  Bell, MapPin, Calendar, ExternalLink, Star, Search, Plus, X,
  Truck, Megaphone, Trash2, Edit3, Heart, Settings, ChevronRight,
  Building2, RefreshCw, WifiOff, CheckCircle2, MapPinned, CalendarCheck,
  CheckSquare, Square, TrendingUp, Navigation, Map,
} from 'lucide-react';

import { fetchNotices, isOnline, storage, API_BASE, registerUserSiteOnServer, removeUserSiteFromServer } from './api';
import { notifyNewNotices, scheduleDeadlineReminders, listenNotificationClick, ensurePermission } from './notifications';
import { searchRegions, generateSitesFromRegion } from './regionsDB';

const DEFAULT_SITES = [
  // 충남권
  { region: '논산', name: '논산시청', url: 'https://www.nonsan.go.kr/', type: '관공서' },
  { region: '논산', name: '논산 문화관광', url: 'https://www.nonsan.go.kr/tour/', type: '문화관광' },
  { region: '논산', name: '논산문화관광재단', url: 'https://www.nonsan.go.kr/cntf/', type: '문화관광' },

  { region: '부여', name: '부여군청', url: 'https://www.buyeo.go.kr/html/kr/', type: '관공서' },
  { region: '부여', name: '부여 문화관광', url: 'https://www.buyeo.go.kr/html/tour/', type: '문화관광' },

  { region: '공주', name: '공주시청', url: 'https://www.gongju.go.kr/kr/', type: '관공서' },
  { region: '공주', name: '공주 문화관광', url: 'https://www.gongju.go.kr/tour/', type: '문화관광' },
  { region: '공주', name: '공주문화관광재단', url: 'https://www.gongjucf.or.kr/', type: '문화관광' },

  { region: '서천', name: '서천군청', url: 'https://www.seocheon.go.kr/kor.do', type: '관공서' },
  { region: '서천', name: '서천 문화관광', url: 'https://www.seocheon.go.kr/tour.do', type: '문화관광' },
  { region: '서천', name: '서천문화관광재단', url: 'https://www.seocheonctf.or.kr/', type: '문화관광' },

  { region: '보령', name: '보령시청', url: 'https://www.brcn.go.kr/kor.do', type: '관공서' },
  { region: '보령', name: '보령 문화관광', url: 'https://www.brcn.go.kr/tour.do', type: '문화관광' },

  { region: '청양', name: '청양군청', url: 'https://www.cheongyang.go.kr/kr.do', type: '관공서' },
  { region: '청양', name: '청양 문화관광', url: 'https://tour.cheongyang.go.kr/', type: '문화관광' },

  // 전북권
  { region: '익산', name: '익산시청', url: 'https://www.iksan.go.kr/', type: '관공서' },
  { region: '익산', name: '익산 문화관광', url: 'https://www.iksan.go.kr/tour', type: '문화관광' },
  { region: '익산', name: '익산문화관광재단', url: 'https://www.ictf.or.kr/', type: '문화관광' },

  { region: '군산', name: '군산시청', url: 'https://www.gunsan.go.kr/', type: '관공서' },
  { region: '군산', name: '군산 문화관광', url: 'https://www.gunsan.go.kr/tour', type: '문화관광' },

  { region: '김제', name: '김제시청', url: 'https://www.gimje.go.kr/', type: '관공서' },
  { region: '김제', name: '김제 문화관광', url: 'https://www.gimje.go.kr/tour/', type: '문화관광' },

  { region: '전주', name: '전주시청', url: 'https://www.jeonju.go.kr/', type: '관공서' },
  { region: '전주', name: '전주문화재단', url: 'https://www.jjcf.or.kr/', type: '문화관광' },

  { region: '완주', name: '완주군청', url: 'https://www.wanju.go.kr/', type: '관공서' },
  { region: '완주', name: '완주 문화관광', url: 'https://www.wanju.go.kr/tour/index.wanju', type: '문화관광' },
];

const DEFAULT_REGIONS = ['논산', '부여', '공주', '서천', '보령', '청양', '익산', '군산', '김제', '전주', '완주'];

const DEFAULT_CHECKLIST = [
  { id: 'c1', text: '식자재 구입', done: false },
  { id: 'c2', text: '가스/전기 점검', done: false },
  { id: 'c3', text: '거스름돈 준비', done: false },
  { id: 'c4', text: '결제 단말기 충전', done: false },
  { id: 'c5', text: '메뉴판 준비', done: false },
];

// 금액 포맷팅: 숫자 → "850,000원"
function formatMoney(val) {
  if (!val) return '';
  const num = parseInt(String(val).replace(/[^\d]/g, '')) || 0;
  if (num === 0) return '';
  return num.toLocaleString() + '원';
}

// 금액 입력값에서 숫자만 추출
function parseMoney(val) {
  if (!val) return '';
  return String(val).replace(/[^\d]/g, '');
}

// 날짜 표시: YYYY-MM-DD → "2026년 7월 15일"
function formatDate(dateStr) {
  if (!dateStr) return '';
  const m = String(dateStr).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return dateStr;
  return `${m[1]}년 ${parseInt(m[2])}월 ${parseInt(m[3])}일`;
}

// 시작-종료 합쳐서 표시
function formatDateRange(start, end) {
  if (!start) return '';
  if (!end || start === end) return formatDate(start);
  return `${formatDate(start)} ~ ${formatDate(end)}`;
}

async function openNaverMap(location, mode = 'search') {
  if (!location || !location.trim()) {
    alert('장소가 입력되지 않았어요');
    return;
  }
  const encoded = encodeURIComponent(location.trim());
  let appUrl, webUrl;

  if (mode === 'search') {
    appUrl = `nmap://search?query=${encoded}&appname=com.foodtruck.alarm`;
    webUrl = `https://map.naver.com/v5/search/${encoded}`;
  } else if (mode === 'route') {
    appUrl = `nmap://route/car?dlat=&dlng=&dname=${encoded}&appname=com.foodtruck.alarm`;
    webUrl = `https://map.naver.com/v5/directions/-/-/${encoded}`;
  }

  try {
    const start = Date.now();
    window.location.href = appUrl;
    setTimeout(() => {
      if (Date.now() - start < 2000 && !document.hidden) {
        try { Browser.open({ url: webUrl }); }
        catch { window.open(webUrl, '_blank'); }
      }
    }, 1500);
  } catch {
    try { await Browser.open({ url: webUrl }); }
    catch { window.open(webUrl, '_blank'); }
  }
}

export default function App() {
  const [tab, setTab] = useState('home');
  const [region, setRegion] = useState('전체');
  const [search, setSearch] = useState('');
  const [serverNotices, setServerNotices] = useState([]);
  const [manualNotices, setManualNotices] = useState([]);
  const [favorites, setFavorites] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [settings, setSettings] = useState({ notifyEnabled: true, notifyDays: 3, autoRefresh: true });
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [customRegions, setCustomRegions] = useState([]);
  const [customSites, setCustomSites] = useState([]);
  const [showRegionManager, setShowRegionManager] = useState(false);
  const [showSiteManager, setShowSiteManager] = useState(false);

  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventTabFilter, setEventTabFilter] = useState('upcoming');
  const [selectedEventId, setSelectedEventId] = useState(null); // 🆕 홈에서 일정 선택 시

  const allNotices = useMemo(() => [...serverNotices, ...manualNotices], [serverNotices, manualNotices]);
  const allRegions = useMemo(() => ['전체', ...DEFAULT_REGIONS, ...customRegions], [customRegions]);
  const formRegions = useMemo(() => [...DEFAULT_REGIONS, ...customRegions], [customRegions]);
  const allSites = useMemo(() => [...DEFAULT_SITES, ...customSites], [customSites]);

  useEffect(() => {
    const init = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#EF4444' });
      } catch {}
      const cached = await storage.getCachedNotices();
      const manual = await storage.getManualNotices();
      const favs = await storage.getFavorites();
      const s = await storage.getSettings();
      const cr = await storage.getCustomRegions();
      const cs = await storage.getCustomSites();
      const ev = await storage.getEvents();
      setServerNotices(cached);
      setManualNotices(manual);
      setFavorites(favs);
      setSettings(s);
      setCustomRegions(cr);
      setCustomSites(cs);
      setEvents(ev);
      const net = await isOnline();
      setOnline(net);
      if (s.notifyEnabled) await ensurePermission();
      listenNotificationClick(async (url) => {
        if (url) await Browser.open({ url });
      });
      CapApp.addListener('backButton', () => {
        if (showAdd || showRegionManager || showSiteManager || showEventForm) {
          setShowAdd(false); setEditingNotice(null);
          setShowRegionManager(false); setShowSiteManager(false);
          setShowEventForm(false); setEditingEvent(null);
        } else if (tab !== 'home') setTab('home');
        else CapApp.exitApp();
      });
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && s.autoRefresh) refresh();
      });
      await refresh();
      await SplashScreen.hide();
    };
    init();
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const net = await isOnline();
      setOnline(net);
      if (!net) { setError('오프라인 상태입니다'); return; }
      const fresh = await fetchNotices({ limit: 200 });
      const cached = await storage.getCachedNotices();
      const cachedIds = new Set(cached.map(n => n.id));
      const seenIds = await storage.getSeenIds();
      const trulyNew = fresh.filter(n => !cachedIds.has(n.id) && !seenIds.has(n.id));
      if (trulyNew.length > 0 && settings.notifyEnabled && cached.length > 0) {
        await notifyNewNotices(trulyNew);
        await storage.addSeenIds(trulyNew.map(n => n.id));
      } else if (trulyNew.length > 0) {
        await storage.addSeenIds(trulyNew.map(n => n.id));
      }
      setServerNotices(fresh);
      await storage.setCachedNotices(fresh);
      setLastSync(new Date());
      if (settings.notifyEnabled) {
        const all = [...fresh, ...manualNotices];
        await scheduleDeadlineReminders(all, settings.notifyDays);
      }
    } catch (err) {
      setError(err.message);
      const cached = await storage.getCachedNotices();
      setServerNotices(cached);
    } finally {
      setRefreshing(false);
    }
  }, [settings.notifyEnabled, settings.notifyDays, manualNotices]);

  const toggleFavorite = async (id) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFavorites(next);
    await storage.setFavorites(next);
  };

  const updateSettings = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.setSettings(next);
  };

  const saveManualNotice = async (notice) => {
    const isEdit = !!notice.id && manualNotices.some(n => n.id === notice.id);
    let next;
    if (isEdit) next = manualNotices.map(n => n.id === notice.id ? notice : n);
    else next = [...manualNotices, { ...notice, id: 'm_' + Date.now() }];
    setManualNotices(next);
    await storage.setManualNotices(next);
    setShowAdd(false);
    setEditingNotice(null);
  };

  const deleteManualNotice = async (id) => {
    if (!confirm('이 공고를 삭제할까요?')) return;
    const next = manualNotices.filter(n => n.id !== id);
    setManualNotices(next);
    await storage.setManualNotices(next);
  };

  const openUrl = async (url) => {
    if (!url) return;
    try { await Browser.open({ url, presentationStyle: 'popover' }); }
    catch { window.open(url, '_blank'); }
  };

  // ========== 일정 관리 ==========
  const saveEvent = async (event) => {
    const isEdit = !!event.id && events.some(e => e.id === event.id);
    let next;
    if (isEdit) {
      next = events.map(e => e.id === event.id ? event : e);
    } else {
      next = [...events, {
        ...event,
        id: 'ev_' + Date.now(),
        checklist: event.checklist || DEFAULT_CHECKLIST.map(c => ({ ...c })),
        createdAt: Date.now(),
      }];
    }
    setEvents(next);
    await storage.setEvents(next);
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const deleteEvent = async (id) => {
    if (!confirm('이 일정을 삭제할까요?')) return;
    const next = events.filter(e => e.id !== id);
    setEvents(next);
    await storage.setEvents(next);
  };

  const toggleChecklistItem = async (eventId, itemId) => {
    const next = events.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, checklist: (e.checklist || []).map(c => c.id === itemId ? { ...c, done: !c.done } : c) };
    });
    setEvents(next);
    await storage.setEvents(next);
  };

  const addChecklistItem = async (eventId, text) => {
    if (!text.trim()) return;
    const next = events.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, checklist: [...(e.checklist || []), { id: 'c_' + Date.now(), text: text.trim(), done: false }] };
    });
    setEvents(next);
    await storage.setEvents(next);
  };

  const removeChecklistItem = async (eventId, itemId) => {
    const next = events.map(e => {
      if (e.id !== eventId) return e;
      return { ...e, checklist: (e.checklist || []).filter(c => c.id !== itemId) };
    });
    setEvents(next);
    await storage.setEvents(next);
  };

  const updateEventRevenue = async (eventId, actualRevenue) => {
    const next = events.map(e =>
      e.id === eventId ? { ...e, actualRevenue: actualRevenue, completed: true } : e
    );
    setEvents(next);
    await storage.setEvents(next);
  };

  const confirmAttendance = async (notice) => {
    const exists = events.some(e => e.fromNoticeId === notice.id);
    if (exists) {
      alert('이미 일정에 추가된 공고입니다');
      return;
    }
    // 공고에서 행사일 추출 (있다면)
    let startDate = '', endDate = '';
    if (notice.eventDate) {
      const m = notice.eventDate.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
      if (m) {
        startDate = `${m[1]}-${String(parseInt(m[2])).padStart(2, '0')}-${String(parseInt(m[3])).padStart(2, '0')}`;
        // 끝 날짜 패턴 찾기 (예: 2026-09-25 ~ 2026-10-04)
        const m2 = notice.eventDate.match(/[~\-]\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
        if (m2) {
          endDate = `${m2[1]}-${String(parseInt(m2[2])).padStart(2, '0')}-${String(parseInt(m2[3])).padStart(2, '0')}`;
        }
      }
    }
    const newEvent = {
      id: 'ev_' + Date.now(),
      title: notice.title,
      region: notice.region,
      org: notice.org || '',
      startDate, endDate,
      location: notice.location || '',
      fee: notice.fee || '',
      expectedRevenue: '',
      actualRevenue: '',
      memo: notice.summary || '',
      checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })),
      url: notice.url || '',
      fromNoticeId: notice.id,
      completed: false,
      createdAt: Date.now(),
    };
    const next = [...events, newEvent];
    setEvents(next);
    await storage.setEvents(next);
    alert('✅ 일정에 추가되었어요!\n[내일정] 탭에서 확인할 수 있어요');
  };

  // 캘린더 추가 (일정 또는 공고)
  const addToCalendar = async (item, isEvent = false) => {
    const evList = [];

    if (isEvent) {
      // 일정 - 시작일~종료일
      if (!item.startDate) {
        alert('시작일이 없어 캘린더에 추가할 수 없어요');
        return;
      }
      const [sy, sm, sd] = item.startDate.split('-').map(Number);
      const evStart = new Date(sy, sm - 1, sd, 9, 0, 0);
      let evEnd;
      if (item.endDate && item.endDate !== item.startDate) {
        const [ey, em, ed] = item.endDate.split('-').map(Number);
        evEnd = new Date(ey, em - 1, ed, 18, 0, 0);
      } else {
        evEnd = new Date(sy, sm - 1, sd, 18, 0, 0);
      }
      const checklistText = (item.checklist || []).map(c => '☐ ' + c.text).join('\n');
      evList.push({
        title: '🚚 ' + item.title,
        start: evStart, end: evEnd,
        details: '푸드트럭 행사\n주관: ' + (item.org || '-') + '\n지역: ' + item.region +
          (item.fee ? '\n참가비: ' + item.fee : '') +
          (item.expectedRevenue ? '\n예상수익: ' + item.expectedRevenue : '') +
          (item.memo ? '\n\n' + item.memo : '') +
          (checklistText ? '\n\n[준비물]\n' + checklistText : '') +
          (item.url ? '\n\n공고: ' + item.url : ''),
        location: item.location || '',
      });
    } else {
      // 공고 - 마감일 + 행사일
      if (item.deadline) {
        const dl = new Date(item.deadline);
        dl.setHours(9, 0, 0, 0);
        const dlEnd = new Date(dl);
        dlEnd.setHours(10, 0, 0, 0);
        evList.push({
          title: '[마감] ' + item.title,
          start: dl, end: dlEnd,
          details: '푸드트럭 공고 마감일\n주관: ' + (item.org || '-') + '\n지역: ' + item.region +
            (item.summary ? '\n\n' + item.summary : '') + '\n\n공고: ' + (item.url || '-'),
          location: item.location || '',
        });
      }
      if (item.eventDate) {
        const m = item.eventDate.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
        if (m) {
          const evStart = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]), 9, 0, 0);
          const evEnd = new Date(evStart);
          evEnd.setHours(18, 0, 0, 0);
          evList.push({
            title: '[행사] ' + item.title,
            start: evStart, end: evEnd,
            details: '푸드트럭 행사일\n주관: ' + (item.org || '-') + '\n지역: ' + item.region,
            location: item.location || '',
          });
        }
      }
    }

    if (evList.length === 0) { alert('일정 날짜를 인식할 수 없어요'); return; }
    let chosen = evList;
    if (evList.length === 2) {
      const choice = confirm('어떤 일정을 캘린더에 추가할까요?\n[확인] 마감일 + 행사일 모두\n[취소] 마감일만 추가');
      chosen = choice ? evList : [evList[0]];
    }
    for (const ev of chosen) {
      const beginMs = ev.start.getTime();
      const endMs = ev.end.getTime();

      // 웹 fallback URL (네이티브 플러그인 실패 시)
      const fmt = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
      };
      const params = new URLSearchParams({
        action: 'TEMPLATE', text: ev.title,
        dates: fmt(ev.start) + '/' + fmt(ev.end),
        details: ev.details, location: ev.location,
      });
      const webFallback = 'https://calendar.google.com/calendar/render?' + params.toString();

      try {
        // 안드로이드 네이티브 플러그인 호출 - 캘린더 앱 선택 팝업 강제 표시
        const { registerPlugin } = await import('@capacitor/core');
        const CalendarIntent = registerPlugin('CalendarIntent');
        await CalendarIntent.addEvent({
          title: ev.title,
          description: ev.details,
          location: ev.location || '',
          beginTime: beginMs,
          endTime: endMs,
        });
      } catch (err) {
        console.warn('네이티브 캘린더 실패, 웹으로 fallback:', err);
        // 네이티브 플러그인 실패 시 웹 구글 캘린더로 fallback
        try { await Browser.open({ url: webFallback }); }
        catch { window.open(webFallback, '_blank'); }
      }
      if (chosen.length > 1) await new Promise(r => setTimeout(r, 1500));
    }
  };

  const addAllEventsToCalendar = async () => {
    const pendingEvents = events.filter(e => !e.completed && e.startDate);
    if (pendingEvents.length === 0) {
      alert('캘린더에 추가할 일정이 없어요');
      return;
    }
    if (!confirm(pendingEvents.length + '개 일정을 모두 캘린더에 추가할까요?')) return;
    for (const ev of pendingEvents) {
      await addToCalendar(ev, true);
      await new Promise(r => setTimeout(r, 1000));
    }
  };

  const addRegionFromDB = async (regionData) => {
    const regionName = regionData.name;
    if (DEFAULT_REGIONS.includes(regionName) || customRegions.includes(regionName)) {
      alert('이미 추가된 지역입니다'); return;
    }
    const nextRegions = [...customRegions, regionName];
    setCustomRegions(nextRegions);
    await storage.setCustomRegions(nextRegions);

    const generatedSites = generateSitesFromRegion(regionData).map(s => ({
      ...s, id: 'cs_' + Date.now() + Math.random().toString(36).slice(2, 6),
    }));

    // 🆕 각 생성된 사이트를 서버에도 등록
    let serverSuccessCount = 0;
    for (const site of generatedSites) {
      const result = await registerUserSiteOnServer({
        region: site.region,
        name: site.name,
        url: site.url,
        type: site.type || '관공서',
      });
      if (result.ok) {
        site.serverId = result.serverId;
        serverSuccessCount++;
      }
    }

    const nextSites = [...customSites, ...generatedSites];
    setCustomSites(nextSites);
    await storage.setCustomSites(nextSites);

    alert(`✅ ${regionName} 추가됨\n시청 사이트 ${generatedSites.length}개 등록 (서버 ${serverSuccessCount}개 자동 크롤링)`);
  };

  const addCustomRegionManual = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (DEFAULT_REGIONS.includes(trimmed) || customRegions.includes(trimmed)) {
      alert('이미 존재하는 지역입니다'); return;
    }
    const next = [...customRegions, trimmed];
    setCustomRegions(next);
    await storage.setCustomRegions(next);
  };

  const removeCustomRegion = async (name) => {
    if (!confirm('"' + name + '" 지역을 삭제할까요?\n해당 지역의 사이트도 함께 삭제됩니다.')) return;
    const nextRegions = customRegions.filter(r => r !== name);
    const nextSites = customSites.filter(s => s.region !== name);
    setCustomRegions(nextRegions);
    setCustomSites(nextSites);
    await storage.setCustomRegions(nextRegions);
    await storage.setCustomSites(nextSites);
  };

  const addCustomSite = async (site) => {
    if (!site.region || !site.name || !site.url) {
      alert('지역, 사이트명, URL을 모두 입력해주세요'); return;
    }
    let url = site.url.trim();
    if (!/^https?:\/\//.test(url)) url = 'https://' + url;

    const newSite = { ...site, url, id: 'cs_' + Date.now() };

    // 🆕 서버에도 등록 시도 (자동 크롤링 + 알림용)
    const serverResult = await registerUserSiteOnServer({
      region: site.region,
      name: site.name,
      url,
      type: site.type || '관공서',
    });

    if (serverResult.ok) {
      newSite.serverId = serverResult.serverId;
      console.log('✅ 서버 등록 성공:', serverResult.serverId);
    } else {
      console.warn('⚠️ 서버 등록 실패, 앱에만 저장됨:', serverResult.error);
    }

    const next = [...customSites, newSite];
    setCustomSites(next);
    await storage.setCustomSites(next);

    if (serverResult.ok) {
      alert('✅ 사이트 등록 완료!\n서버에서 자동 크롤링 시작합니다.\n(잠시 후 공고가 나타날 수 있어요)');
    } else {
      alert('⚠️ 앱에 저장됐지만 서버 등록은 실패했어요.\n사이트는 사용 가능하지만 자동 알림은 안 옵니다.');
    }
  };

  const removeCustomSite = async (id) => {
    if (!confirm('이 사이트를 삭제할까요?')) return;
    const target = customSites.find(s => s.id === id);

    // 🆕 서버에서도 삭제
    if (target && target.serverId) {
      await removeUserSiteFromServer(target.serverId);
    }

    const next = customSites.filter(s => s.id !== id);
    setCustomSites(next);
    await storage.setCustomSites(next);
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const m = String(dateStr).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
      const dl = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
    }
    return null;
  };

  const urgentNotices = useMemo(() => {
    return allNotices.filter(n => {
      // 자동 수집 공고는 마감일이 부정확하므로 제외 (직접 등록한 공고만)
      const isManual = n.id && n.id.startsWith('m_');
      if (!isManual) return false;
      const d = daysUntil(n.deadline);
      return d !== null && d >= 0 && d <= settings.notifyDays;
    });
  }, [allNotices, settings.notifyDays]);

  const filteredNotices = useMemo(() => {
    return allNotices
      .filter(n => region === '전체' || n.region === region)
      .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.org || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [allNotices, region, search]);

  const filteredSites = useMemo(() => allSites.filter(s => region === '전체' || s.region === region), [allSites, region]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const da = a.startDate ? new Date(a.startDate) : new Date(0);
      const db = b.startDate ? new Date(b.startDate) : new Date(0);
      return da - db;
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    return sortedEvents.filter(e => {
      if (e.completed) return false;
      const dateRef = e.endDate || e.startDate;
      const d = daysUntil(dateRef);
      return d === null || d >= 0;
    });
  }, [sortedEvents]);

  const pastEvents = useMemo(() => {
    return sortedEvents.filter(e => {
      if (e.completed) return true;
      const dateRef = e.endDate || e.startDate;
      const d = daysUntil(dateRef);
      return d !== null && d < 0;
    }).reverse();
  }, [sortedEvents]);

  const nextEvent = upcomingEvents[0];
  const nextEventDays = nextEvent ? daysUntil(nextEvent.startDate) : null;

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    let thisMonthCount = 0;
    let thisMonthRevenue = 0;
    let totalRevenue = 0;
    const byRegion = {};
    for (const e of events) {
      if (e.startDate) {
        const [y, mo] = e.startDate.split('-').map(Number);
        if (y === thisYear && (mo - 1) === thisMonth) {
          thisMonthCount++;
          if (e.actualRevenue) {
            const rev = parseInt(String(e.actualRevenue).replace(/[^\d]/g, '')) || 0;
            thisMonthRevenue += rev;
          }
        }
      }
      if (e.actualRevenue) {
        const rev = parseInt(String(e.actualRevenue).replace(/[^\d]/g, '')) || 0;
        totalRevenue += rev;
      }
      if (e.region) byRegion[e.region] = (byRegion[e.region] || 0) + 1;
    }
    return { thisMonthCount, thisMonthRevenue, totalRevenue, byRegion };
  }, [events]);

  // 🆕 홈에서 일정 카드 누르면 일정 탭으로 이동하면서 해당 일정 펼치기
  const goToEvent = (eventId) => {
    setSelectedEventId(eventId);
    setTab('events');
    setEventTabFilter('upcoming');
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20 shadow-2xl">
        <header className="sticky top-0 z-30 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white px-5 pt-6 pb-5 shadow-lg safe-top">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur p-2 rounded-xl">
                <Truck className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">푸드트럭 알리미</h1>
                <p className="text-[11px] text-white/80 font-medium flex items-center gap-1">
                  공고 + 일정 + 비즈니스
                  {!online && <WifiOff className="w-3 h-3 ml-1" />}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={refresh} disabled={refreshing} className="p-2 rounded-full bg-white/20 active:bg-white/30">
                <RefreshCw className={'w-5 h-5 ' + (refreshing ? 'animate-spin' : '')} strokeWidth={2.5} />
              </button>
              {(urgentNotices.length > 0 || (nextEvent && nextEventDays !== null && nextEventDays <= 3)) && settings.notifyEnabled && (
                <div className="relative p-2">
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-0 right-0 bg-yellow-300 text-red-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {urgentNotices.length + (nextEvent && nextEventDays !== null && nextEventDays <= 3 ? 1 : 0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {(tab === 'home' || tab === 'notices' || tab === 'sites') && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-4">
              {allRegions.map(r => (
                <button key={r} onClick={() => setRegion(r)}
                  className={'shrink-0 px-4 py-1.5 rounded-full text-sm font-bold ' + (region === r ? 'bg-white text-red-600 shadow-md scale-105' : 'bg-white/20 text-white active:bg-white/30')}>
                  {r}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-700/30 border border-white/30 rounded-lg px-3 py-1.5 text-[11px] font-medium">
              ⚠️ {error}
            </div>
          )}
        </header>

        <main className="px-5 py-5">
          {tab === 'home' && (
            <HomeView
              urgentNotices={urgentNotices}
              recentNotices={filteredNotices.slice(0, 3)}
              nextEvent={nextEvent}
              nextEventDays={nextEventDays}
              upcomingCount={upcomingEvents.length}
              stats={stats}
              notifyEnabled={settings.notifyEnabled}
              daysUntil={daysUntil}
              onTabChange={setTab}
              onOpenUrl={openUrl}
              onOpenMap={openNaverMap}
              onGoToEvent={goToEvent}
            />
          )}
          {tab === 'notices' && (
            <NoticesView notices={filteredNotices} search={search} setSearch={setSearch}
              favorites={favorites} onToggleFavorite={toggleFavorite} daysUntil={daysUntil}
              onEdit={(n) => { setEditingNotice(n); setShowAdd(true); }}
              onDelete={deleteManualNotice} onOpenUrl={openUrl}
              onAddToCalendar={(n) => addToCalendar(n, false)}
              onConfirmAttendance={confirmAttendance}
              events={events} />
          )}
          {tab === 'events' && (
            <EventsView
              upcomingEvents={upcomingEvents}
              pastEvents={pastEvents}
              filter={eventTabFilter}
              setFilter={setEventTabFilter}
              daysUntil={daysUntil}
              onEdit={(e) => { setEditingEvent(e); setShowEventForm(true); }}
              onDelete={deleteEvent}
              onToggleChecklist={toggleChecklistItem}
              onAddChecklistItem={addChecklistItem}
              onRemoveChecklistItem={removeChecklistItem}
              onUpdateRevenue={updateEventRevenue}
              onAddToCalendar={(e) => addToCalendar(e, true)}
              onAddAllToCalendar={addAllEventsToCalendar}
              onOpenUrl={openUrl}
              onOpenMap={openNaverMap}
              selectedEventId={selectedEventId}
              onClearSelected={() => setSelectedEventId(null)}
            />
          )}
          {tab === 'sites' && (
            <SitesView sites={filteredSites} onOpenUrl={openUrl} onRemoveSite={removeCustomSite}
              onOpenSiteManager={() => setShowSiteManager(true)} />
          )}
          {tab === 'settings' && (
            <SettingsView settings={settings} onChange={updateSettings}
              noticeCount={allNotices.length} favoriteCount={favorites.size}
              eventCount={events.length} stats={stats}
              customRegions={customRegions} customSites={customSites}
              lastSync={lastSync} onRefresh={refresh} refreshing={refreshing}
              onOpenRegionManager={() => setShowRegionManager(true)}
              onOpenSiteManager={() => setShowSiteManager(true)} />
          )}
        </main>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-stone-200 z-30 safe-bottom">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {[
              { id: 'home', icon: Megaphone, label: '홈' },
              { id: 'notices', icon: Calendar, label: '공고' },
              { id: 'events', icon: CalendarCheck, label: '내일정' },
              { id: 'sites', icon: Building2, label: '사이트' },
              { id: 'settings', icon: Settings, label: '설정' },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={'flex flex-col items-center gap-0.5 py-2 rounded-xl ' + (tab === t.id ? 'text-red-600 bg-red-50' : 'text-stone-500 active:bg-stone-100')}>
                <t.icon className="w-5 h-5" strokeWidth={tab === t.id ? 2.5 : 2} />
                <span className={'text-[10px] ' + (tab === t.id ? 'font-bold' : 'font-medium')}>{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {tab === 'notices' && (
          <button onClick={() => { setEditingNotice(null); setShowAdd(true); }}
            className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 z-20"
            style={{ left: 'calc(50% + 80px)' }}>
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        )}
        {tab === 'events' && (
          <button onClick={() => { setEditingEvent(null); setShowEventForm(true); }}
            className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-green-500 to-teal-500 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 z-20"
            style={{ left: 'calc(50% + 80px)' }}>
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        )}
        {tab === 'sites' && (
          <button onClick={() => setShowSiteManager(true)}
            className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 z-20"
            style={{ left: 'calc(50% + 80px)' }}>
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        )}

        {showAdd && <NoticeForm initial={editingNotice} onSave={saveManualNotice} onClose={() => { setShowAdd(false); setEditingNotice(null); }} regions={formRegions} />}
        {showEventForm && <EventForm initial={editingEvent} onSave={saveEvent} onClose={() => { setShowEventForm(false); setEditingEvent(null); }} regions={formRegions} onOpenMap={openNaverMap} />}
        {showRegionManager && <RegionManager customRegions={customRegions} defaultRegions={DEFAULT_REGIONS} onAddFromDB={addRegionFromDB} onAddManual={addCustomRegionManual} onRemove={removeCustomRegion} onClose={() => setShowRegionManager(false)} />}
        {showSiteManager && <SiteManager customSites={customSites} regions={formRegions} onAdd={addCustomSite} onRemove={removeCustomSite} onClose={() => setShowSiteManager(false)} />}
      </div>
    </div>
  );
}

// ============ 홈 ============
function HomeView({ urgentNotices, recentNotices, nextEvent, nextEventDays, upcomingCount, stats, notifyEnabled, daysUntil, onTabChange, onOpenUrl, onOpenMap, onGoToEvent }) {
  return (
    <div className="space-y-6">
      {nextEvent && (
        <section>
          <h2 className="text-base font-black text-stone-900 mb-3 flex items-center gap-2">
            <span className="text-lg">🚚</span> 다음 행사
          </h2>
          {/* 🆕 카드 전체가 클릭 가능 → 일정 탭으로 이동 */}
          <button onClick={() => onGoToEvent(nextEvent.id)}
            className="w-full text-left bg-gradient-to-br from-green-500 to-teal-600 text-white rounded-2xl p-4 shadow-lg active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{nextEvent.region}</span>
              {nextEventDays !== null && (
                <span className="text-2xl font-black">
                  {nextEventDays === 0 ? 'TODAY!' : 'D-' + nextEventDays}
                </span>
              )}
            </div>
            <h3 className="text-base font-black leading-tight line-clamp-2 mb-2">{nextEvent.title}</h3>
            <div className="flex items-center gap-3 text-[11px] text-white/90 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDateRange(nextEvent.startDate, nextEvent.endDate) || '날짜 미정'}
              </div>
            </div>
            {nextEvent.location && (
              <div className="flex items-center gap-1 text-[11px] text-white/90 mb-3 truncate">
                <MapPin className="w-3 h-3 shrink-0" />{nextEvent.location}
              </div>
            )}
            <div className="flex gap-2">
              {nextEvent.location && (
                <div onClick={(e) => { e.stopPropagation(); onOpenMap(nextEvent.location, 'route'); }}
                  className="flex-1 bg-white/20 active:bg-white/30 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  길찾기
                </div>
              )}
              <div className="flex-1 bg-white text-green-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1">
                자세히 <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </button>
        </section>
      )}

      {urgentNotices.length > 0 && notifyEnabled && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="text-lg">🔔</span> 마감 임박
            </h2>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{urgentNotices.length}건</span>
          </div>
          <div className="space-y-2">
            {urgentNotices.map(n => <UrgentCard key={n.id} notice={n} daysLeft={daysUntil(n.deadline)} onOpenUrl={onOpenUrl} />)}
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-2">
        <StatCard label="이번달 행사" value={stats.thisMonthCount} icon="📅"
          onClick={() => onTabChange('events')} />
        <StatCard label="예정 일정" value={upcomingCount} icon="🚚"
          onClick={() => onTabChange('events')} />
        <StatCard label="이번달 수익" value={stats.thisMonthRevenue > 0 ? Math.round(stats.thisMonthRevenue / 10000) + '만' : '0'} icon="💰"
          onClick={() => onTabChange('settings')} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-stone-900">최근 공고</h2>
          <button onClick={() => onTabChange('notices')} className="text-xs font-bold text-red-600 flex items-center gap-0.5">
            전체보기 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-2.5">
          {recentNotices.length === 0 ? (
            <EmptyState message="등록된 공고가 없습니다" sub="새로고침하거나 + 버튼으로 직접 등록할 수 있어요" />
          ) : (
            recentNotices.map(n => (
              <button key={n.id} onClick={() => onOpenUrl(n.url)}
                className="w-full text-left bg-white border-2 border-stone-200 rounded-2xl p-3.5 active:scale-[0.98]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{n.region}</span>
                  <span className="text-[10px] text-stone-500 font-medium truncate">{n.org}</span>
                </div>
                <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">{n.title}</h3>
                {n.deadline && (
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-stone-500">
                    <Calendar className="w-3 h-3" />등록일: {n.deadline}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function UrgentCard({ notice, daysLeft, onOpenUrl }) {
  return (
    <button onClick={() => onOpenUrl(notice.url)}
      className="w-full text-left bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-3.5 active:scale-[0.98]">
      <div className="flex items-start gap-3">
        <div className="bg-red-500 text-white rounded-xl px-2.5 py-1.5 text-center min-w-[58px]">
          <div className="text-[9px] font-bold opacity-90">D-DAY</div>
          <div className="text-lg font-black leading-none mt-0.5">{daysLeft === 0 ? 'D-DAY' : 'D-' + daysLeft}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-red-600 mb-0.5">{notice.region}</div>
          <h3 className="text-sm font-black text-stone-900 leading-tight line-clamp-2">{notice.title}</h3>
          <p className="text-[11px] text-stone-600 mt-1">{notice.org}</p>
        </div>
      </div>
    </button>
  );
}

function StatCard({ label, value, icon, onClick }) {
  if (onClick) {
    return (
      <button onClick={onClick}
        className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center active:scale-95 active:bg-stone-100 transition-all">
        <div className="text-2xl mb-1">{icon}</div>
        <div className="text-xl font-black text-stone-900">{value}</div>
        <div className="text-[10px] font-medium text-stone-500 mt-0.5">{label}</div>
      </button>
    );
  }
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black text-stone-900">{value}</div>
      <div className="text-[10px] font-medium text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

// ============ 공고 ============
function NoticesView({ notices, search, setSearch, favorites, onToggleFavorite, daysUntil, onEdit, onDelete, onOpenUrl, onAddToCalendar, onConfirmAttendance, events }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="공고 제목, 기관 검색"
          className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-2xl text-sm font-medium placeholder-stone-400 focus:outline-none focus:bg-stone-200" />
      </div>
      <h2 className="text-sm font-bold text-stone-700">공고 {notices.length}건</h2>
      <div className="space-y-2.5">
        {notices.length === 0 ? (
          <EmptyState message="등록된 공고가 없습니다" sub="당겨서 새로고침하거나 + 버튼으로 직접 등록" />
        ) : (
          notices.map(n => {
            const isInEvents = events.some(e => e.fromNoticeId === n.id);
            return (
              <NoticeCard key={n.id} notice={n}
                isFavorite={favorites.has(n.id)}
                isInEvents={isInEvents}
                onToggleFavorite={() => onToggleFavorite(n.id)}
                daysLeft={daysUntil(n.deadline)}
                onEdit={n.id && n.id.startsWith('m_') ? () => onEdit(n) : null}
                onDelete={n.id && n.id.startsWith('m_') ? () => onDelete(n.id) : null}
                onOpenUrl={onOpenUrl} onAddToCalendar={onAddToCalendar}
                onConfirmAttendance={() => onConfirmAttendance(n)} expandable />
            );
          })
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice, isFavorite, isInEvents, onToggleFavorite, daysLeft, onEdit, onDelete, onOpenUrl, onAddToCalendar, onConfirmAttendance, expandable }) {
  const [open, setOpen] = useState(false);
  const isManual = notice.id && notice.id.startsWith('m_');  // 직접 등록한 공고
  const isUrgent = isManual && daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isPast = isManual && daysLeft !== null && daysLeft < 0;

  return (
    <div className={'border-2 rounded-2xl overflow-hidden ' + (isPast ? 'bg-stone-50 border-stone-200 opacity-60' : isUrgent ? 'bg-white border-red-300' : 'bg-white border-stone-200')}>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          {/* 직접 등록 공고만 D-Day 박스 표시 (자동 수집은 마감일이 부정확함) */}
          {isManual && daysLeft !== null && (
            <div className={'text-center rounded-xl px-2 py-1.5 min-w-[56px] ' + (isPast ? 'bg-stone-200 text-stone-500' : isUrgent ? 'bg-red-500 text-white' : daysLeft <= 7 ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-700')}>
              <div className="text-[9px] font-bold opacity-80">{isPast ? '마감' : 'D-DAY'}</div>
              <div className="text-base font-black leading-none mt-0.5">{isPast ? '종료' : daysLeft === 0 ? 'D-0' : 'D-' + daysLeft}</div>
            </div>
          )}
          {/* 자동 수집 공고는 등록일 배지 */}
          {!isManual && notice.deadline && (
            <div className="text-center rounded-xl px-2 py-1.5 min-w-[56px] bg-blue-50 text-blue-700">
              <div className="text-[9px] font-bold opacity-90">등록일</div>
              <div className="text-[11px] font-black leading-tight mt-0.5">{notice.deadline.slice(5).replace('-', '/')}</div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{notice.region}</span>
              {isManual && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">직접등록</span>}
              {notice.isNew && <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded">NEW</span>}
              {isInEvents && <span className="text-[10px] font-black text-white bg-green-500 px-1.5 py-0.5 rounded">참가확정</span>}
              <span className="text-[10px] text-stone-500 font-medium truncate">{notice.org}</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">{notice.title}</h3>
            {/* 직접 등록 공고: 마감일 / 자동 수집: 등록일 */}
            {notice.deadline && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-stone-500">
                <Calendar className="w-3 h-3" />
                {isManual ? '마감: ' + notice.deadline : '등록일: ' + notice.deadline}
              </div>
            )}
            {!isManual && (
              <div className="text-[10px] text-stone-400 mt-1 italic">
                💡 정확한 마감일은 공고를 열어 확인하세요
              </div>
            )}
          </div>
          <button onClick={onToggleFavorite} className="shrink-0 p-1">
            <Star className={'w-5 h-5 ' + (isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300')} />
          </button>
        </div>
        {expandable && (
          <button onClick={() => setOpen(!open)} className="w-full mt-2.5 text-[11px] font-bold text-stone-500 flex items-center justify-center gap-1">
            {open ? '접기' : '자세히'}
            <ChevronRight className={'w-3 h-3 transition-transform ' + (open ? 'rotate-90' : '')} />
          </button>
        )}
        {open && (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
            {notice.eventDate && <Detail label="행사일" value={notice.eventDate} />}
            {notice.location && <Detail label="장소" value={notice.location} icon={<MapPin className="w-3 h-3" />} />}
            {notice.fee && <Detail label="비용" value={notice.fee} />}
            {notice.summary && <p className="text-[11px] text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg">{notice.summary}</p>}
            <div className="flex gap-2 pt-1">
              {!isInEvents && !isPast && onConfirmAttendance && (
                <button onClick={onConfirmAttendance} className="bg-green-50 text-green-700 px-3 rounded-xl active:scale-95 flex items-center justify-center gap-1 text-xs font-bold" title="참가확정 → 일정에 추가">
                  <CheckCircle2 className="w-4 h-4" />확정
                </button>
              )}
              {(notice.deadline || notice.eventDate) && onAddToCalendar && (
                <button onClick={() => onAddToCalendar(notice)} className="bg-blue-50 text-blue-600 px-3 rounded-xl active:scale-95 flex items-center justify-center" title="캘린더에 추가">
                  <Calendar className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => onOpenUrl(notice.url)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95">
                <ExternalLink className="w-3.5 h-3.5" />공고
              </button>
              {onEdit && <button onClick={onEdit} className="bg-stone-100 text-stone-700 px-3 rounded-xl active:scale-95"><Edit3 className="w-4 h-4" /></button>}
              {onDelete && <button onClick={onDelete} className="bg-red-50 text-red-600 px-3 rounded-xl active:scale-95"><Trash2 className="w-4 h-4" /></button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value, icon }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="font-bold text-stone-500 min-w-[40px]">{label}</span>
      <span className="text-stone-700 flex items-center gap-1">{icon}{value}</span>
    </div>
  );
}

// ============ 내 일정 ============
function EventsView({ upcomingEvents, pastEvents, filter, setFilter, daysUntil, onEdit, onDelete, onToggleChecklist, onAddChecklistItem, onRemoveChecklistItem, onUpdateRevenue, onAddToCalendar, onAddAllToCalendar, onOpenUrl, onOpenMap, selectedEventId, onClearSelected }) {
  const list = filter === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
        <CalendarCheck className="w-5 h-5 text-green-600" />내 행사 일정
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setFilter('upcoming')}
          className={'py-2.5 rounded-xl text-sm font-bold ' + (filter === 'upcoming' ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md' : 'bg-stone-100 text-stone-600')}>
          예정 ({upcomingEvents.length})
        </button>
        <button onClick={() => setFilter('past')}
          className={'py-2.5 rounded-xl text-sm font-bold ' + (filter === 'past' ? 'bg-gradient-to-r from-stone-500 to-stone-700 text-white shadow-md' : 'bg-stone-100 text-stone-600')}>
          종료 ({pastEvents.length})
        </button>
      </div>
      {filter === 'upcoming' && upcomingEvents.length > 0 && (
        <button onClick={onAddAllToCalendar}
          className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 text-sm">
          <Calendar className="w-4 h-4" />
          예정된 일정 모두 캘린더에 추가
        </button>
      )}
      <div className="space-y-3">
        {list.length === 0 ? (
          <EmptyState
            message={filter === 'upcoming' ? '예정된 일정이 없어요' : '종료된 일정이 없어요'}
            sub={filter === 'upcoming' ? '+ 버튼이나 공고에서 [확정] 버튼으로 추가하세요' : ''}
          />
        ) : (
          list.map(e => (
            <EventCard key={e.id} event={e} daysLeft={daysUntil(e.startDate)}
              initialOpen={selectedEventId === e.id}
              onOpened={() => onClearSelected()}
              onEdit={() => onEdit(e)} onDelete={() => onDelete(e.id)}
              onToggleChecklist={(itemId) => onToggleChecklist(e.id, itemId)}
              onAddChecklistItem={(text) => onAddChecklistItem(e.id, text)}
              onRemoveChecklistItem={(itemId) => onRemoveChecklistItem(e.id, itemId)}
              onUpdateRevenue={(rev) => onUpdateRevenue(e.id, rev)}
              onAddToCalendar={() => onAddToCalendar(e)}
              onOpenUrl={() => onOpenUrl(e.url)}
              onOpenMap={onOpenMap} />
          ))
        )}
      </div>
    </div>
  );
}

function EventCard({ event, daysLeft, initialOpen, onOpened, onEdit, onDelete, onToggleChecklist, onAddChecklistItem, onRemoveChecklistItem, onUpdateRevenue, onAddToCalendar, onOpenUrl, onOpenMap }) {
  const [open, setOpen] = useState(!!initialOpen);
  const [newItem, setNewItem] = useState('');
  const [showRevenueInput, setShowRevenueInput] = useState(false);
  const [revenueInput, setRevenueInput] = useState(parseMoney(event.actualRevenue));
  const isPast = daysLeft !== null && daysLeft < 0;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const checklist = event.checklist || [];
  const doneCount = checklist.filter(c => c.done).length;
  const completedClass = event.completed ? 'opacity-70' : '';

  useEffect(() => {
    if (initialOpen) {
      setOpen(true);
      onOpened && onOpened();
    }
  }, [initialOpen]);

  return (
    <div className={'border-2 rounded-2xl overflow-hidden ' + (event.completed ? 'bg-stone-50 border-stone-200 ' + completedClass : isPast ? 'bg-stone-50 border-stone-200 opacity-70' : isUrgent ? 'bg-gradient-to-br from-green-50 to-teal-50 border-green-300' : 'bg-white border-stone-200')}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {daysLeft !== null && !event.completed && (
            <div className={'text-center rounded-xl px-2.5 py-2 min-w-[60px] ' + (isPast ? 'bg-stone-300 text-stone-600' : isUrgent ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white' : 'bg-green-100 text-green-700')}>
              <div className="text-[9px] font-bold opacity-90">{isPast ? '종료' : daysLeft === 0 ? 'TODAY' : 'D-DAY'}</div>
              <div className="text-base font-black leading-none mt-0.5">{isPast ? '✓' : daysLeft === 0 ? '!' : 'D-' + daysLeft}</div>
            </div>
          )}
          {event.completed && (
            <div className="bg-green-500 text-white rounded-xl px-2.5 py-2 text-center min-w-[60px]">
              <div className="text-[9px] font-bold opacity-90">완료</div>
              <div className="text-lg font-black leading-none mt-0.5">✓</div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{event.region}</span>
              {event.fromNoticeId && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">공고출처</span>}
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug">{event.title}</h3>
            {(event.startDate || event.endDate) && (
              <div className="flex items-center gap-1 mt-1.5 text-[11px] text-stone-600">
                <Calendar className="w-3 h-3" />{formatDateRange(event.startDate, event.endDate)}
              </div>
            )}
          </div>
        </div>

        {event.location && (
          <div className="flex items-center gap-2 mb-2 p-2 bg-stone-50 rounded-lg">
            <MapPin className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            <span className="text-xs text-stone-700 flex-1 truncate font-medium">{event.location}</span>
            <button onClick={() => onOpenMap(event.location, 'search')}
              className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-[10px] font-bold active:scale-95 flex items-center gap-1">
              <Map className="w-3 h-3" />지도
            </button>
            <button onClick={() => onOpenMap(event.location, 'route')}
              className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold active:scale-95 flex items-center gap-1">
              <Navigation className="w-3 h-3" />길찾기
            </button>
          </div>
        )}

        {checklist.length > 0 && !open && (
          <div className="text-[11px] text-stone-600 mb-2 flex items-center gap-2">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>준비물 {doneCount}/{checklist.length} 완료</span>
            <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-teal-500" style={{ width: (doneCount / checklist.length * 100) + '%' }} />
            </div>
          </div>
        )}

        {event.actualRevenue && (
          <div className="text-[11px] text-stone-600 mb-2 flex items-center gap-2">
            <span className="font-bold text-green-700">💰 실제 수익:</span>
            <span className="font-black text-stone-900">{formatMoney(event.actualRevenue)}</span>
          </div>
        )}

        <button onClick={() => setOpen(!open)}
          className="w-full text-[11px] font-bold text-stone-500 flex items-center justify-center gap-1 mt-1">
          {open ? '접기' : '자세히 / 준비물'}
          <ChevronRight className={'w-3 h-3 transition-transform ' + (open ? 'rotate-90' : '')} />
        </button>

        {open && (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-3">
            {event.org && <Detail label="주관" value={event.org} />}
            {event.fee && <Detail label="참가비" value={formatMoney(event.fee) || event.fee} />}
            {event.expectedRevenue && <Detail label="예상수익" value={formatMoney(event.expectedRevenue) || event.expectedRevenue} />}
            {event.memo && <p className="text-[11px] text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg">{event.memo}</p>}

            <div>
              <div className="text-xs font-black text-stone-700 mb-2 flex items-center gap-1">
                <CheckSquare className="w-4 h-4" />
                준비물 체크리스트 ({doneCount}/{checklist.length})
              </div>
              <div className="space-y-1.5">
                {checklist.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <button onClick={() => onToggleChecklist(c.id)} className="active:scale-95">
                      {c.done ? <CheckSquare className="w-5 h-5 text-green-600" /> : <Square className="w-5 h-5 text-stone-400" />}
                    </button>
                    <span className={'flex-1 text-sm ' + (c.done ? 'line-through text-stone-400' : 'text-stone-700')}>{c.text}</span>
                    <button onClick={() => onRemoveChecklistItem(c.id)} className="text-red-400 active:scale-95 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-1.5 mt-2">
                  <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { onAddChecklistItem(newItem); setNewItem(''); } }}
                    placeholder="준비물 추가..."
                    className="flex-1 px-3 py-2 bg-stone-50 rounded-lg text-xs focus:outline-none focus:bg-stone-100" />
                  <button onClick={() => { onAddChecklistItem(newItem); setNewItem(''); }}
                    className="bg-stone-700 text-white px-3 rounded-lg text-xs font-bold active:scale-95">+</button>
                </div>
              </div>
            </div>

            {(isPast || event.completed) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs font-black text-amber-900 mb-2">💰 실제 수익 기록</div>
                {showRevenueInput || !event.actualRevenue ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 items-center">
                      <input
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={revenueInput}
                        onChange={(e) => setRevenueInput(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="예: 850000"
                        className="flex-1 px-3 py-2.5 bg-white border-2 border-amber-300 rounded-lg text-base font-bold focus:outline-none focus:border-amber-500" />
                      <span className="text-sm font-bold text-amber-900">원</span>
                    </div>
                    {revenueInput && (
                      <div className="text-xs text-amber-700 font-medium">
                        = {parseInt(revenueInput).toLocaleString()}원
                      </div>
                    )}
                    <button onClick={() => { onUpdateRevenue(revenueInput); setShowRevenueInput(false); }}
                      className="w-full bg-amber-500 text-white py-2 rounded-lg text-xs font-bold active:scale-95">
                      저장
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setShowRevenueInput(true)}
                    className="w-full bg-white border border-amber-300 text-amber-900 py-2 rounded-lg text-xs font-bold active:scale-95">
                    수정하기
                  </button>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {event.startDate && (
                <button onClick={onAddToCalendar} className="bg-blue-50 text-blue-600 px-3 py-2.5 rounded-xl active:scale-95 flex items-center justify-center" title="캘린더에 추가">
                  <Calendar className="w-4 h-4" />
                </button>
              )}
              {event.url && (
                <button onClick={onOpenUrl} className="bg-stone-100 text-stone-700 px-3 py-2.5 rounded-xl active:scale-95 flex items-center justify-center" title="원본 공고">
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
              <button onClick={onEdit} className="flex-1 bg-stone-100 text-stone-700 text-xs font-bold py-2.5 rounded-xl active:scale-95 flex items-center justify-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />수정
              </button>
              <button onClick={onDelete} className="bg-red-50 text-red-600 px-3 py-2.5 rounded-xl active:scale-95">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ 사이트 ============
function SitesView({ sites, onOpenUrl, onRemoveSite, onOpenSiteManager }) {
  const grouped = sites.reduce((acc, s) => {
    if (!acc[s.region]) acc[s.region] = [];
    acc[s.region].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <button onClick={onOpenSiteManager}
        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 active:scale-95 shadow-md">
        <Plus className="w-5 h-5" />새 사이트 추가
      </button>
      {Object.keys(grouped).length === 0 ? (
        <EmptyState message="이 지역에 등록된 사이트가 없어요" sub="상단 + 버튼으로 사이트를 추가해보세요" />
      ) : (
        Object.keys(grouped).map(region => (
          <section key={region}>
            <h2 className="text-sm font-black text-stone-900 mb-2.5">
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{region}</span>
              <span className="text-stone-400 font-medium text-[11px] ml-2">{grouped[region].length}개</span>
            </h2>
            <div className="space-y-2">
              {grouped[region].map((s, i) => {
                const isCustom = !!s.id;
                return (
                  <div key={s.id || i} className="flex items-center gap-2">
                    <button onClick={() => onOpenUrl(s.url)}
                      className="flex-1 text-left flex items-center gap-3 bg-white border-2 border-stone-200 rounded-2xl p-3.5 active:scale-[0.98]">
                      <div className={'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ' + (s.type === '관공서' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')}>
                        {s.type === '관공서' ? <Building2 className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-stone-900 truncate">{s.name}</h3>
                          {isCustom && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">내 사이트</span>}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">{s.type}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-stone-400 shrink-0" />
                    </button>
                    {isCustom && (
                      <button onClick={() => onRemoveSite(s.id)} className="bg-red-50 text-red-600 p-2 rounded-xl active:scale-95">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

// ============ 설정 ============
function SettingsView({ settings, onChange, noticeCount, favoriteCount, eventCount, stats, customRegions, customSites, lastSync, onRefresh, refreshing, onOpenRegionManager, onOpenSiteManager }) {
  const sortedRegions = Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-5">
      <h2 className="text-base font-black text-stone-900">설정</h2>
      <section className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-2xl p-5 shadow-lg">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          비즈니스 통계
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <div className="text-[10px] opacity-90 mb-1">이번달 행사</div>
            <div className="text-2xl font-black">{stats.thisMonthCount}</div>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <div className="text-[10px] opacity-90 mb-1">이번달 수익</div>
            <div className="text-2xl font-black">{stats.thisMonthRevenue > 0 ? Math.round(stats.thisMonthRevenue / 10000) + '만원' : '-'}</div>
          </div>
        </div>
        <div className="bg-white/15 backdrop-blur rounded-xl p-3">
          <div className="text-[10px] opacity-90 mb-1">누적 수익</div>
          <div className="text-xl font-black">{stats.totalRevenue > 0 ? stats.totalRevenue.toLocaleString() + '원' : '아직 기록된 수익 없음'}</div>
        </div>
        {sortedRegions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className="text-[10px] opacity-90 mb-2">지역별 행사 (TOP 5)</div>
            <div className="space-y-1">
              {sortedRegions.map(([region, count]) => (
                <div key={region} className="flex items-center gap-2 text-xs">
                  <span className="font-bold w-12">{region}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: (count / sortedRegions[0][1] * 100) + '%' }} />
                  </div>
                  <span className="font-bold w-8 text-right">{count}건</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
          <h3 className="text-xs font-black text-stone-700">알림</h3>
        </div>
        <div className="p-4 space-y-4">
          <ToggleRow title="새 공고 알림" sub="새 공고 발견시 푸시 알림 발송"
            value={settings.notifyEnabled} onChange={(v) => onChange('notifyEnabled', v)} />
          <ToggleRow title="앱 시작 시 자동 새로고침" sub="앱을 열 때마다 새 공고 확인"
            value={settings.autoRefresh} onChange={(v) => onChange('autoRefresh', v)} />
          <div>
            <div className="text-sm font-bold text-stone-900 mb-2">마감 임박 기준</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 14].map(d => (
                <button key={d} onClick={() => onChange('notifyDays', d)}
                  className={'py-2 rounded-xl text-xs font-bold ' + (settings.notifyDays === d ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-stone-100 text-stone-600')}>
                  {d}일 전
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
          <h3 className="text-xs font-black text-stone-700">내 지역 / 사이트</h3>
        </div>
        <div className="p-4 space-y-3">
          <button onClick={onOpenRegionManager}
            className="w-full flex items-center justify-between p-3 bg-stone-50 rounded-xl active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <MapPinned className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-stone-900">지역 관리</div>
                <div className="text-[11px] text-stone-500">전국 검색 / 추가 {customRegions.length}개</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
          <button onClick={onOpenSiteManager}
            className="w-full flex items-center justify-between p-3 bg-stone-50 rounded-xl active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-stone-900">사이트 관리</div>
                <div className="text-[11px] text-stone-500">추가한 사이트 {customSites.length}개</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>
        </div>
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-2xl p-4">
        <h3 className="text-xs font-black text-stone-700 mb-3">내 데이터</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center bg-stone-50 rounded-xl p-3">
            <div className="text-2xl font-black text-orange-600">{noticeCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">전체 공고</div>
          </div>
          <div className="text-center bg-stone-50 rounded-xl p-3">
            <div className="text-2xl font-black text-green-600">{eventCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">내 일정</div>
          </div>
          <div className="text-center bg-stone-50 rounded-xl p-3">
            <div className="text-2xl font-black text-red-500">{favoriteCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">즐겨찾기</div>
          </div>
        </div>
      </section>

      <p className="text-center text-[10px] text-stone-400 font-medium pt-2">
        푸드트럭 알리미 v1.3.1
      </p>
    </div>
  );
}

function ToggleRow({ title, sub, value, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <div className="flex-1 min-w-0 pr-3">
        <div className="text-sm font-bold text-stone-900">{title}</div>
        <div className="text-[11px] text-stone-500 mt-0.5">{sub}</div>
      </div>
      <button onClick={() => onChange(!value)}
        className={'relative w-12 h-7 rounded-full shrink-0 ' + (value ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-stone-300')}>
        <div className={'absolute top-1 w-5 h-5 bg-white rounded-full shadow ' + (value ? 'right-1' : 'left-1')} />
      </button>
    </label>
  );
}

// ============ 공고 폼 ============
function NoticeForm({ initial, onSave, onClose, regions }) {
  const [form, setForm] = useState(initial || {
    region: regions[0] || '논산', title: '', org: '', deadline: '', eventDate: '', location: '', url: '', summary: '', fee: '',
  });
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const handleSubmit = () => {
    if (!form.title || !form.deadline) { alert('공고명과 마감일은 필수입니다'); return; }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-black text-stone-900">{initial ? '공고 수정' : '공고 등록'}</h2>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="지역 *">
            <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
              {regions.map(r => (
                <button key={r} onClick={() => update('region', r)}
                  className={'py-2 rounded-lg text-xs font-bold ' + (form.region === r ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-stone-100 text-stone-600')}>
                  {r}
                </button>
              ))}
            </div>
          </Field>
          <Field label="공고 제목 *">
            <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="예: 2026 백제문화제 푸드트럭 모집"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="주관 기관">
            <input type="text" value={form.org} onChange={(e) => update('org', e.target.value)} placeholder="예: 부여문화관광재단"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="마감일 *">
            <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)}
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="행사 일시 (메모)">
            <input type="text" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} placeholder="예: 2026-09-25 ~ 2026-10-04"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="장소">
            <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="예: 부여 백마강 일원"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="참가비">
            <input type="text" value={form.fee} onChange={(e) => update('fee', e.target.value)} placeholder="예: 참가비 30만원"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="공고 URL">
            <input type="url" value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://..."
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="요약 / 메모">
            <textarea value={form.summary} onChange={(e) => update('summary', e.target.value)} rows={3} placeholder="공고의 주요 내용, 자격 요건 등"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200 resize-none" />
          </Field>
          <button onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg active:scale-95">
            {initial ? '수정 완료' : '공고 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 일정 폼 (대대적 개편) ============
function EventForm({ initial, onSave, onClose, regions, onOpenMap }) {
  const [form, setForm] = useState(initial || {
    region: regions[0] || '논산', title: '', org: '',
    startDate: '', endDate: '',  // 🆕 시작/종료일 분리
    location: '', fee: '', expectedRevenue: '', actualRevenue: '', memo: '', url: '',
    checklist: DEFAULT_CHECKLIST.map(c => ({ ...c })), completed: false,
  });
  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.title) { alert('행사 제목은 필수입니다'); return; }
    if (!form.startDate) { alert('시작일은 필수입니다 (캘린더 추가에 필요)'); return; }
    if (form.endDate && form.endDate < form.startDate) {
      alert('종료일은 시작일 이후여야 합니다'); return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-green-600" />
            {initial ? '일정 수정' : '새 일정 등록'}
          </h2>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="지역 *">
            <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
              {regions.map(r => (
                <button key={r} onClick={() => update('region', r)}
                  className={'py-2 rounded-lg text-xs font-bold ' + (form.region === r ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' : 'bg-stone-100 text-stone-600')}>
                  {r}
                </button>
              ))}
            </div>
          </Field>

          <Field label="행사 제목 *">
            <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="예: 부여 서동연꽃축제"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>

          <Field label="주관">
            <input type="text" value={form.org} onChange={(e) => update('org', e.target.value)} placeholder="예: 부여군청"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>

          {/* 🆕 시작일 / 종료일 분리 (날짜 선택기) */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 space-y-3">
            <div className="text-xs font-black text-green-900 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              행사 날짜 (탭해서 선택)
            </div>
            <Field label="📅 시작일 *">
              <input type="date" value={form.startDate} onChange={(e) => update('startDate', e.target.value)}
                className="w-full px-4 py-3 bg-white rounded-xl text-base font-bold focus:outline-none border-2 border-green-300 focus:border-green-500" />
            </Field>
            <Field label="📅 종료일 (당일 행사면 비워두기)">
              <input type="date" value={form.endDate} onChange={(e) => update('endDate', e.target.value)}
                min={form.startDate}
                className="w-full px-4 py-3 bg-white rounded-xl text-base font-bold focus:outline-none border-2 border-green-300 focus:border-green-500" />
            </Field>
            {form.startDate && (
              <p className="text-[11px] text-green-700 font-bold bg-white rounded-lg p-2">
                ✓ {formatDateRange(form.startDate, form.endDate)}
              </p>
            )}
          </div>

          <Field label="📍 장소">
            <div className="space-y-2">
              <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="예: 부여 궁남지"
                className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
              {form.location && (
                <button type="button" onClick={() => onOpenMap(form.location, 'search')}
                  className="w-full bg-green-100 text-green-700 font-bold text-xs py-2 rounded-lg active:scale-95 flex items-center justify-center gap-1">
                  <Map className="w-3.5 h-3.5" />네이버 지도에서 확인
                </button>
              )}
            </div>
          </Field>

          {/* 🆕 금액 입력 - 숫자 키패드 + 자동 포맷팅 */}
          <Field label="💵 참가비">
            <MoneyInput value={form.fee} onChange={(v) => update('fee', v)} placeholder="예: 300000" />
          </Field>

          <Field label="💰 예상 수익">
            <MoneyInput value={form.expectedRevenue} onChange={(v) => update('expectedRevenue', v)} placeholder="예: 1000000" />
          </Field>

          <Field label="공고 URL">
            <input type="url" value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://..."
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>

          <Field label="메모">
            <textarea value={form.memo} onChange={(e) => update('memo', e.target.value)} rows={3} placeholder="특이사항, 메뉴 계획 등"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200 resize-none" />
          </Field>

          <button onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg active:scale-95">
            {initial ? '수정 완료' : '일정 등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 🆕 금액 입력 컴포넌트 (숫자 키패드 + 천단위 콤마 표시)
function MoneyInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  const numericValue = parseMoney(value);

  return (
    <div>
      <div className="flex gap-2 items-center">
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={numericValue}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 px-4 py-3 bg-stone-100 rounded-xl text-base font-bold focus:outline-none focus:bg-stone-200" />
        <span className="text-sm font-bold text-stone-700 shrink-0">원</span>
      </div>
      {numericValue && (
        <div className="text-xs text-green-700 font-bold mt-1 px-1">
          = {parseInt(numericValue).toLocaleString()}원
        </div>
      )}
    </div>
  );
}

// ============ 지역 관리 ============
function RegionManager({ customRegions, defaultRegions, onAddFromDB, onAddManual, onRemove, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [manualName, setManualName] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchRegions(searchQuery);
  }, [searchQuery]);

  const groupedResults = useMemo(() => {
    const groups = {};
    for (const r of searchResults) {
      if (!groups[r.province]) groups[r.province] = [];
      groups[r.province].push(r);
    }
    return groups;
  }, [searchResults]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
            <MapPinned className="w-5 h-5 text-purple-600" />지역 관리
          </h2>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <label className="block text-xs font-black text-stone-700 mb-2">🔍 전국 지자체 검색</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="시·군·구 이름 (예: 천안, 강릉, 제주)"
                className="w-full pl-10 pr-4 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl text-sm font-medium focus:outline-none focus:border-purple-400" />
            </div>
            {searchQuery.trim() && (
              <div className="mt-3 space-y-3 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="text-center py-6 text-[12px] text-stone-400">검색 결과가 없어요</p>
                ) : (
                  Object.keys(groupedResults).map(province => (
                    <div key={province}>
                      <div className="text-[10px] font-bold text-purple-600 mb-1.5">{province}</div>
                      <div className="space-y-1.5">
                        {groupedResults[province].map(r => {
                          const isAlreadyAdded = defaultRegions.includes(r.name) || customRegions.includes(r.name);
                          return (
                            <button key={r.name} onClick={() => !isAlreadyAdded && onAddFromDB(r)} disabled={isAlreadyAdded}
                              className={'w-full text-left p-2.5 rounded-lg flex items-center justify-between ' + (isAlreadyAdded ? 'bg-stone-50 text-stone-400' : 'bg-white border border-stone-200 active:bg-purple-50')}>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold truncate">{r.name}</div>
                                <div className="text-[10px] text-stone-500 truncate">{r.domain}</div>
                              </div>
                              {isAlreadyAdded ? <span className="text-[10px] font-bold text-stone-400">추가됨</span> : <Plus className="w-4 h-4 text-purple-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <details className="bg-stone-50 rounded-xl p-3">
            <summary className="text-xs font-black text-stone-700 cursor-pointer">➕ DB에 없는 지역 직접 추가</summary>
            <div className="mt-3 flex gap-2">
              <input type="text" value={manualName} onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { onAddManual(manualName); setManualName(''); } }}
                placeholder="지역 이름 직접 입력"
                className="flex-1 px-4 py-2.5 bg-white rounded-lg text-sm font-medium focus:outline-none border border-stone-200" />
              <button onClick={() => { onAddManual(manualName); setManualName(''); }}
                className="bg-stone-700 text-white px-4 rounded-lg font-bold text-sm active:scale-95">추가</button>
            </div>
          </details>
          <div>
            <h3 className="text-xs font-black text-stone-700 mb-2">내가 추가한 지역 ({customRegions.length})</h3>
            {customRegions.length === 0 ? (
              <p className="text-center py-6 text-[12px] text-stone-400">아직 추가한 지역이 없어요</p>
            ) : (
              <div className="space-y-2">
                {customRegions.map(r => (
                  <div key={r} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <span className="text-sm font-bold text-purple-900">{r}</span>
                    <button onClick={() => onRemove(r)} className="text-red-500 p-1 active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-black text-stone-700 mb-2">기본 지역 ({defaultRegions.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {defaultRegions.map(r => (
                <span key={r} className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-md">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 사이트 관리 ============
function SiteManager({ customSites, regions, onAdd, onRemove, onClose }) {
  const [form, setForm] = useState({ region: regions[0] || '논산', name: '', url: '', type: '관공서' });

  const handleAdd = () => {
    if (!form.name.trim() || !form.url.trim()) { alert('사이트명과 URL을 입력해주세요'); return; }
    onAdd(form);
    setForm({ region: form.region, name: '', url: '', type: '관공서' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />사이트 관리
          </h2>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-5">
          <div className="space-y-3">
            <h3 className="text-xs font-black text-stone-700">새 사이트 추가</h3>
            <Field label="지역">
              <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
                {regions.map(r => (
                  <button key={r} onClick={() => setForm({ ...form, region: r })}
                    className={'py-2 rounded-lg text-xs font-bold ' + (form.region === r ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-stone-100 text-stone-600')}>
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="사이트명">
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 천안시청 공지사항"
                className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
            </Field>
            <Field label="URL">
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..."
                className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
            </Field>
            <Field label="유형">
              <div className="grid grid-cols-2 gap-2">
                {['관공서', '문화관광'].map(t => (
                  <button key={t} onClick={() => setForm({ ...form, type: t })}
                    className={'py-2 rounded-lg text-xs font-bold ' + (form.type === t ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' : 'bg-stone-100 text-stone-600')}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>
            <button onClick={handleAdd}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-black py-3 rounded-xl text-sm shadow-md active:scale-95">
              사이트 추가
            </button>
          </div>
          <div>
            <h3 className="text-xs font-black text-stone-700 mb-2">내가 추가한 사이트 ({customSites.length})</h3>
            {customSites.length === 0 ? (
              <p className="text-center py-6 text-[12px] text-stone-400">아직 추가한 사이트가 없어요</p>
            ) : (
              <div className="space-y-2">
                {customSites.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">{s.region}</span>
                        <span className="text-[10px] text-stone-500">{s.type}</span>
                      </div>
                      <div className="text-sm font-bold text-stone-900 truncate">{s.name}</div>
                      <div className="text-[10px] text-stone-500 truncate">{s.url}</div>
                    </div>
                    <button onClick={() => onRemove(s.id)} className="text-red-500 p-1 active:scale-95">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-black text-stone-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ message, sub }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-sm font-bold text-stone-700">{message}</p>
      {sub && <p className="text-[11px] text-stone-500 mt-1.5 leading-relaxed">{sub}</p>}
    </div>
  );
}
