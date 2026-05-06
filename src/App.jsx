import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import {
  Bell, MapPin, Calendar, ExternalLink, Star, Search, Plus, X,
  Truck, Megaphone, Trash2, Edit3, Heart, Settings, ChevronRight,
  Building2, RefreshCw, WifiOff, CheckCircle2,
} from 'lucide-react';

import { fetchNotices, fetchStats, isOnline, storage, API_BASE } from './api';
import { notifyNewNotices, scheduleDeadlineReminders, listenNotificationClick, ensurePermission } from './notifications';

// 지역별 관공서 / 문화관광 사이트 정보
const SITES = [
  // ========== 충남권 ==========
  // 논산
  { region: '논산', name: '논산시청', url: 'https://www.nonsan.go.kr/', type: '관공서' },
  { region: '논산', name: '논산 공지사항', url: 'https://www.nonsan.go.kr/kor/html/sub03/030101.html', type: '관공서' },
  { region: '논산', name: '논산 공고/고시', url: 'https://www.nonsan.go.kr/kor/html/sub03/03010201.html', type: '관공서' },
  { region: '논산', name: '논산문화관광재단', url: 'https://www.nscf.or.kr/', type: '문화관광' },

  // 부여
  { region: '부여', name: '부여군청', url: 'https://www.buyeo.go.kr/html/kr/', type: '관공서' },
  { region: '부여', name: '부여 공지사항', url: 'https://www.buyeo.go.kr/_prog/_board/?code=news_01&site_dvs_cd=kr&menu_dvs_cd=0401', type: '관공서' },
  { region: '부여', name: '부여문화관광재단', url: 'https://www.buyeoctf.or.kr/', type: '문화관광' },

  // 공주
  { region: '공주', name: '공주시청', url: 'https://www.gongju.go.kr/kr/', type: '관공서' },
  { region: '공주', name: '공주 공지사항/고시', url: 'https://www.gongju.go.kr/kr/sub05_010101.do', type: '관공서' },
  { region: '공주', name: '공주문화관광재단', url: 'https://www.gjcf.or.kr/', type: '문화관광' },

  // 서천
  { region: '서천', name: '서천군청', url: 'https://www.seocheon.go.kr/kor.do', type: '관공서' },
  { region: '서천', name: '서천 공지/공고', url: 'https://www.seocheon.go.kr/kor/sub01_03_01.do', type: '관공서' },
  { region: '서천', name: '서천 문화관광', url: 'https://www.seocheon.go.kr/tour.do', type: '문화관광' },

  // 보령
  { region: '보령', name: '보령시청', url: 'https://www.brcn.go.kr/kor.do', type: '관공서' },
  { region: '보령', name: '보령 공지사항', url: 'https://www.brcn.go.kr/kor/sub01_03_01.do', type: '관공서' },
  { region: '보령', name: '보령 문화관광', url: 'https://www.brcn.go.kr/tour/', type: '문화관광' },

  // 청양
  { region: '청양', name: '청양군청', url: 'https://www.cheongyang.go.kr/kr.do', type: '관공서' },
  { region: '청양', name: '청양 공지/공고', url: 'https://www.cheongyang.go.kr/kr/sub05_01_01.do', type: '관공서' },
  { region: '청양', name: '청양 문화관광', url: 'https://www.cheongyang.go.kr/tour/', type: '문화관광' },

  // ========== 전북권 ==========
  // 익산
  { region: '익산', name: '익산시청', url: 'https://www.iksan.go.kr/', type: '관공서' },
  { region: '익산', name: '익산 고시공고', url: 'https://www.iksan.go.kr/index.iksan?menuCd=DOM_000002003009003000', type: '관공서' },
  { region: '익산', name: '익산 시험·채용', url: 'https://www.iksan.go.kr/index.iksan?menuCd=DOM_000002003009005000', type: '관공서' },
  { region: '익산', name: '익산문화관광재단', url: 'https://www.iksancf.com/', type: '문화관광' },

  // 군산
  { region: '군산', name: '군산시청', url: 'https://www.gunsan.go.kr/', type: '관공서' },
  { region: '군산', name: '군산 공지/공고', url: 'https://www.gunsan.go.kr/menu.es?mid=a10301010000', type: '관공서' },
  { region: '군산', name: '군산 문화관광', url: 'https://www.gunsan.go.kr/tour/', type: '문화관광' },

  // 김제
  { region: '김제', name: '김제시청', url: 'https://www.gimje.go.kr/', type: '관공서' },
  { region: '김제', name: '김제 공지사항', url: 'https://www.gimje.go.kr/board/list.gimje?boardId=BBS_0000017&menuCd=DOM_000000104003001000', type: '관공서' },
  { region: '김제', name: '김제 문화관광', url: 'https://www.gimje.go.kr/tour/', type: '문화관광' },

  // 전주
  { region: '전주', name: '전주시청', url: 'https://www.jeonju.go.kr/', type: '관공서' },
  { region: '전주', name: '전주 공지/공고', url: 'https://www.jeonju.go.kr/index.9is?contentUid=9be517c47b6c5a48017b6cee2f3f0042', type: '관공서' },
  { region: '전주', name: '전주문화재단', url: 'https://www.jjcf.or.kr/', type: '문화관광' },

  // 완주
  { region: '완주', name: '완주군청', url: 'https://www.wanju.go.kr/', type: '관공서' },
  { region: '완주', name: '완주 공지/공고', url: 'https://www.wanju.go.kr/index.wanju?menuCd=DOM_000000401001001000', type: '관공서' },
  { region: '완주', name: '완주 문화관광', url: 'https://www.wanju.go.kr/tour/', type: '문화관광' },
];

const REGIONS = ['전체', '논산', '부여', '공주', '서천', '보령', '청양', '익산', '군산', '김제', '전주', '완주'];

export default function App() {
  const [tab, setTab] = useState('home');
  const [region, setRegion] = useState('전체');
  const [search, setSearch] = useState('');
  const [serverNotices, setServerNotices] = useState([]); // 서버에서 받은 자동 크롤링 공고
  const [manualNotices, setManualNotices] = useState([]); // 사용자가 직접 등록한 공고
  const [favorites, setFavorites] = useState(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);
  const [settings, setSettings] = useState({ notifyEnabled: true, notifyDays: 3, autoRefresh: true });
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);

  // 통합된 공고 리스트
  const allNotices = useMemo(() => [...serverNotices, ...manualNotices], [serverNotices, manualNotices]);

  // 네이티브 초기화
  useEffect(() => {
    const init = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: '#EF4444' });
      } catch {}

      // 저장된 데이터 로드
      const cached = await storage.getCachedNotices();
      const manual = await storage.getManualNotices();
      const favs = await storage.getFavorites();
      const s = await storage.getSettings();
      setServerNotices(cached);
      setManualNotices(manual);
      setFavorites(favs);
      setSettings(s);

      // 온라인 상태 확인
      const net = await isOnline();
      setOnline(net);

      // 알림 권한 미리 요청
      if (s.notifyEnabled) {
        await ensurePermission();
      }

      // 알림 클릭 리스너
      listenNotificationClick(async (url) => {
        if (url) await Browser.open({ url });
      });

      // Android 뒤로가기 버튼 처리
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (showAdd) {
          setShowAdd(false);
          setEditingNotice(null);
        } else if (tab !== 'home') {
          setTab('home');
        } else {
          CapApp.exitApp();
        }
      });

      // 앱 포그라운드 복귀 시 자동 새로고침
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && s.autoRefresh) {
          refresh();
        }
      });

      // 첫 새로고침
      await refresh();

      await SplashScreen.hide();
    };
    init();
  }, []);

  // 서버에서 공고 새로고침
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const net = await isOnline();
      setOnline(net);
      if (!net) {
        setError('오프라인 상태입니다');
        return;
      }

      const fresh = await fetchNotices({ limit: 200 });
      const cached = await storage.getCachedNotices();
      const cachedIds = new Set(cached.map(n => n.id));

      // 새 공고 식별
      const seenIds = await storage.getSeenIds();
      const trulyNew = fresh.filter(n => !cachedIds.has(n.id) && !seenIds.has(n.id));

      // 알림 발송
      if (trulyNew.length > 0 && settings.notifyEnabled && cached.length > 0) {
        // 첫 로드(cached가 비어있을 때)에는 알림 X — 너무 많은 알림 폭탄 방지
        await notifyNewNotices(trulyNew);
        await storage.addSeenIds(trulyNew.map(n => n.id));
      } else if (trulyNew.length > 0) {
        await storage.addSeenIds(trulyNew.map(n => n.id));
      }

      setServerNotices(fresh);
      await storage.setCachedNotices(fresh);
      setLastSync(new Date());

      // 마감 임박 알림 재예약
      if (settings.notifyEnabled) {
        const all = [...fresh, ...manualNotices];
        await scheduleDeadlineReminders(all, settings.notifyDays);
      }
    } catch (err) {
      setError(err.message);
      // 오프라인이면 캐시된 데이터 유지
      const cached = await storage.getCachedNotices();
      setServerNotices(cached);
    } finally {
      setRefreshing(false);
    }
  }, [settings.notifyEnabled, settings.notifyDays, manualNotices]);

  // 즐겨찾기 토글
  const toggleFavorite = async (id) => {
    const next = new Set(favorites);
    if (next.has(id)) next.delete(id); else next.add(id);
    setFavorites(next);
    await storage.setFavorites(next);
  };

  // 설정 변경
  const updateSettings = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await storage.setSettings(next);
  };

  // 수동 공고 저장
  const saveManualNotice = async (notice) => {
    const isEdit = !!notice.id && manualNotices.some(n => n.id === notice.id);
    let next;
    if (isEdit) {
      next = manualNotices.map(n => n.id === notice.id ? notice : n);
    } else {
      next = [...manualNotices, { ...notice, id: 'm_' + Date.now() }];
    }
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

  // URL을 외부 브라우저(인앱 브라우저)로 열기
  const openUrl = async (url) => {
    if (!url) return;
    try {
      await Browser.open({ url, presentationStyle: 'popover' });
    } catch {
      window.open(url, '_blank');
    }
  };

  // 마감일 계산
  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dl = new Date(dateStr);
    return Math.ceil((dl - today) / (1000 * 60 * 60 * 24));
  };

  // 마감 임박 공고
  const urgentNotices = useMemo(() => {
    return allNotices.filter(n => {
      const d = daysUntil(n.deadline);
      return d !== null && d >= 0 && d <= settings.notifyDays;
    });
  }, [allNotices, settings.notifyDays]);

  // 필터링된 공고
  const filteredNotices = useMemo(() => {
    return allNotices
      .filter(n => region === '전체' || n.region === region)
      .filter(n => !search || n.title.toLowerCase().includes(search.toLowerCase()) || (n.org || '').toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        // 마감일 있는 것부터, 그 다음 createdAt 최신순
        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [allNotices, region, search]);

  const filteredSites = useMemo(() => SITES.filter(s => region === '전체' || s.region === region), [region]);
  const favoriteNotices = useMemo(() => allNotices.filter(n => favorites.has(n.id)), [allNotices, favorites]);

  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20 shadow-2xl">
        {/* 헤더 */}
        <header className="sticky top-0 z-30 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white px-5 pt-6 pb-5 shadow-lg safe-top">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 backdrop-blur p-2 rounded-xl">
                <Truck className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">푸드트럭 알리미</h1>
                <p className="text-[11px] text-white/80 font-medium flex items-center gap-1">
                  충남·전북 공고 통합
                  {!online && <WifiOff className="w-3 h-3 ml-1" />}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={refresh}
                disabled={refreshing}
                className="p-2 rounded-full bg-white/20 active:bg-white/30 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.5} />
              </button>
              {urgentNotices.length > 0 && settings.notifyEnabled && (
                <div className="relative p-2">
                  <Bell className="w-6 h-6 animate-[pulseSoft_2s_infinite]" />
                  <span className="absolute top-0 right-0 bg-yellow-300 text-red-700 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                    {urgentNotices.length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 지역 필터 칩 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-5 px-5 mt-4">
            {REGIONS.map(r => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                  region === r ? 'bg-white text-red-600 shadow-md scale-105' : 'bg-white/20 text-white active:bg-white/30'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-3 bg-red-700/30 border border-white/30 rounded-lg px-3 py-1.5 text-[11px] font-medium">
              ⚠️ {error}
            </div>
          )}
        </header>

        <main className="px-5 py-5 animate-[slideUp_0.3s_ease-out]">
          {tab === 'home' && (
            <HomeView
              urgentNotices={urgentNotices}
              recentNotices={filteredNotices.slice(0, 4)}
              sites={filteredSites}
              notifyEnabled={settings.notifyEnabled}
              daysUntil={daysUntil}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              onTabChange={setTab}
              onOpenUrl={openUrl}
              lastSync={lastSync}
              totalCount={allNotices.length}
              serverCount={serverNotices.length}
            />
          )}
          {tab === 'notices' && (
            <NoticesView
              notices={filteredNotices}
              search={search}
              setSearch={setSearch}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              daysUntil={daysUntil}
              onAdd={() => setShowAdd(true)}
              onEdit={(n) => { setEditingNotice(n); setShowAdd(true); }}
              onDelete={deleteManualNotice}
              onOpenUrl={openUrl}
            />
          )}
          {tab === 'sites' && <SitesView sites={filteredSites} onOpenUrl={openUrl} />}
          {tab === 'favorites' && (
            <FavoritesView
              notices={favoriteNotices}
              onToggleFavorite={toggleFavorite}
              daysUntil={daysUntil}
              onOpenUrl={openUrl}
            />
          )}
          {tab === 'settings' && (
            <SettingsView
              settings={settings}
              onChange={updateSettings}
              noticeCount={allNotices.length}
              favoriteCount={favorites.size}
              lastSync={lastSync}
              onRefresh={refresh}
              refreshing={refreshing}
            />
          )}
        </main>

        {/* 하단 네비 */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-stone-200 z-30 safe-bottom">
          <div className="grid grid-cols-5 gap-1 px-2 py-2">
            {[
              { id: 'home', icon: Megaphone, label: '홈' },
              { id: 'notices', icon: Calendar, label: '공고' },
              { id: 'sites', icon: Building2, label: '사이트' },
              { id: 'favorites', icon: Heart, label: '즐겨찾기' },
              { id: 'settings', icon: Settings, label: '설정' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${
                  tab === t.id ? 'text-red-600 bg-red-50' : 'text-stone-500 active:bg-stone-100'
                }`}
              >
                <t.icon className="w-5 h-5" strokeWidth={tab === t.id ? 2.5 : 2} />
                <span className={`text-[10px] ${tab === t.id ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* FAB */}
        {tab === 'notices' && (
          <button
            onClick={() => { setEditingNotice(null); setShowAdd(true); }}
            className="fixed bottom-24 right-5 w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 text-white rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform z-20"
            style={{ left: 'calc(50% + 80px)' }}
          >
            <Plus className="w-7 h-7" strokeWidth={2.5} />
          </button>
        )}

        {showAdd && (
          <NoticeForm
            initial={editingNotice}
            onSave={saveManualNotice}
            onClose={() => { setShowAdd(false); setEditingNotice(null); }}
          />
        )}
      </div>
    </div>
  );
}

// ============ 홈 뷰 ============
function HomeView({ urgentNotices, recentNotices, sites, notifyEnabled, daysUntil, favorites, onToggleFavorite, onTabChange, onOpenUrl, lastSync, totalCount, serverCount }) {
  return (
    <div className="space-y-6">
      {urgentNotices.length > 0 && notifyEnabled && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
              <span className="text-lg">🔔</span> 마감 임박
            </h2>
            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{urgentNotices.length}건</span>
          </div>
          <div className="space-y-2">
            {urgentNotices.map(n => (
              <UrgentCard key={n.id} notice={n} daysLeft={daysUntil(n.deadline)} onOpenUrl={onOpenUrl} />
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-3 gap-2">
        <StatCard label="자동수집" value={serverCount} icon="🤖" />
        <StatCard label="전체공고" value={totalCount} icon="📋" />
        <StatCard label="즐겨찾기" value={favorites.size} icon="⭐" />
      </section>

      {lastSync && (
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500 font-medium">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          마지막 동기화: {lastSync.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

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
              <NoticeCard
                key={n.id}
                notice={n}
                isFavorite={favorites.has(n.id)}
                onToggleFavorite={() => onToggleFavorite(n.id)}
                daysLeft={daysUntil(n.deadline)}
                onOpenUrl={onOpenUrl}
              />
            ))
          )}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-stone-900">관공서 바로가기</h2>
          <button onClick={() => onTabChange('sites')} className="text-xs font-bold text-red-600 flex items-center gap-0.5">
            전체보기 <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {sites.slice(0, 4).map((s, i) => <SiteChip key={i} site={s} onOpenUrl={onOpenUrl} />)}
        </div>
      </section>
    </div>
  );
}

function UrgentCard({ notice, daysLeft, onOpenUrl }) {
  return (
    <button
      onClick={() => onOpenUrl(notice.url)}
      className="w-full text-left bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-3.5 active:scale-[0.98] transition-transform"
    >
      <div className="flex items-start gap-3">
        <div className="bg-red-500 text-white rounded-xl px-2.5 py-1.5 text-center min-w-[58px]">
          <div className="text-[9px] font-bold opacity-90">D-DAY</div>
          <div className="text-lg font-black leading-none mt-0.5">{daysLeft === 0 ? 'D-DAY' : `D-${daysLeft}`}</div>
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

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-black text-stone-900">{value}</div>
      <div className="text-[10px] font-medium text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

// ============ 공고 리스트 ============
function NoticesView({ notices, search, setSearch, favorites, onToggleFavorite, daysUntil, onEdit, onDelete, onOpenUrl }) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="공고 제목, 기관 검색"
          className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-2xl text-sm font-medium placeholder-stone-400 focus:outline-none focus:bg-stone-200 transition-colors"
        />
      </div>

      <h2 className="text-sm font-bold text-stone-700">공고 {notices.length}건</h2>

      <div className="space-y-2.5">
        {notices.length === 0 ? (
          <EmptyState message="등록된 공고가 없습니다" sub="당겨서 새로고침하거나 + 버튼으로 직접 등록" />
        ) : (
          notices.map(n => (
            <NoticeCard
              key={n.id}
              notice={n}
              isFavorite={favorites.has(n.id)}
              onToggleFavorite={() => onToggleFavorite(n.id)}
              daysLeft={daysUntil(n.deadline)}
              onEdit={n.id?.startsWith('m_') ? () => onEdit(n) : null}
              onDelete={n.id?.startsWith('m_') ? () => onDelete(n.id) : null}
              onOpenUrl={onOpenUrl}
              expandable
            />
          ))
        )}
      </div>
    </div>
  );
}

function NoticeCard({ notice, isFavorite, onToggleFavorite, daysLeft, onEdit, onDelete, onOpenUrl, expandable }) {
  const [open, setOpen] = useState(false);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;
  const isPast = daysLeft !== null && daysLeft < 0;

  return (
    <div className={`border-2 rounded-2xl overflow-hidden transition-all ${
      isPast ? 'bg-stone-50 border-stone-200 opacity-60' : isUrgent ? 'bg-white border-red-300' : 'bg-white border-stone-200'
    }`}>
      <div className="p-3.5">
        <div className="flex items-start gap-2.5">
          {daysLeft !== null && (
            <div className={`text-center rounded-xl px-2 py-1.5 min-w-[56px] ${
              isPast ? 'bg-stone-200 text-stone-500' :
              isUrgent ? 'bg-red-500 text-white' :
              daysLeft <= 7 ? 'bg-orange-500 text-white' : 'bg-stone-100 text-stone-700'
            }`}>
              <div className="text-[9px] font-bold opacity-80">{isPast ? '마감' : 'D-DAY'}</div>
              <div className="text-base font-black leading-none mt-0.5">
                {isPast ? '종료' : daysLeft === 0 ? 'D-0' : `D-${daysLeft}`}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">{notice.region}</span>
              {notice.id?.startsWith('m_') && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">직접등록</span>
              )}
              {notice.isNew && (
                <span className="text-[10px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded">NEW</span>
              )}
              <span className="text-[10px] text-stone-500 font-medium truncate">{notice.org}</span>
            </div>
            <h3 className="text-sm font-bold text-stone-900 leading-snug line-clamp-2">{notice.title}</h3>
            {notice.deadline && (
              <div className="flex items-center gap-1 mt-2 text-[11px] text-stone-600">
                <Calendar className="w-3 h-3" />~{notice.deadline}
              </div>
            )}
          </div>
          <button onClick={onToggleFavorite} className="shrink-0 p-1">
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-stone-300'}`} />
          </button>
        </div>

        {expandable && (
          <button
            onClick={() => setOpen(!open)}
            className="w-full mt-2.5 text-[11px] font-bold text-stone-500 flex items-center justify-center gap-1"
          >
            {open ? '접기' : '자세히'}
            <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        )}

        {open && (
          <div className="mt-3 pt-3 border-t border-stone-100 space-y-2 animate-[slideUp_0.2s_ease-out]">
            {notice.eventDate && <Detail label="행사일" value={notice.eventDate} />}
            {notice.location && <Detail label="장소" value={notice.location} icon={<MapPin className="w-3 h-3" />} />}
            {notice.fee && <Detail label="비용" value={notice.fee} />}
            {notice.summary && (
              <p className="text-[11px] text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-lg">{notice.summary}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => onOpenUrl(notice.url)}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                공고 보기
              </button>
              {onEdit && (
                <button onClick={onEdit} className="bg-stone-100 text-stone-700 px-3 rounded-xl active:scale-95">
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              {onDelete && (
                <button onClick={onDelete} className="bg-red-50 text-red-600 px-3 rounded-xl active:scale-95">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
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

// ============ 사이트 ============
function SitesView({ sites, onOpenUrl }) {
  const grouped = sites.reduce((acc, s) => {
    if (!acc[s.region]) acc[s.region] = [];
    acc[s.region].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3.5">
        <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
          💡 <span className="font-bold">자동 수집 외에</span> 직접 사이트에서 공고를 확인할 수도 있어요. 발견한 공고는 [공고] 탭에서 + 버튼으로 등록하면 마감일 알림을 받을 수 있어요.
        </p>
      </div>
      {Object.keys(grouped).map(region => (
        <section key={region}>
          <h2 className="text-sm font-black text-stone-900 mb-2.5 flex items-center gap-2">
            <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">{region}</span>
            <span className="text-stone-400 font-medium text-[11px]">{grouped[region].length}개 사이트</span>
          </h2>
          <div className="space-y-2">
            {grouped[region].map((s, i) => <SiteCard key={i} site={s} onOpenUrl={onOpenUrl} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function SiteCard({ site, onOpenUrl }) {
  return (
    <button
      onClick={() => onOpenUrl(site.url)}
      className="w-full text-left flex items-center gap-3 bg-white border-2 border-stone-200 rounded-2xl p-3.5 active:scale-[0.98] transition-transform"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
        site.type === '관공서' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
      }`}>
        {site.type === '관공서' ? <Building2 className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-stone-900 truncate">{site.name}</h3>
        <p className="text-[11px] text-stone-500 mt-0.5">{site.type}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-stone-400 shrink-0" />
    </button>
  );
}

function SiteChip({ site, onOpenUrl }) {
  return (
    <button
      onClick={() => onOpenUrl(site.url)}
      className="text-left bg-stone-50 active:bg-stone-100 border border-stone-200 rounded-xl p-2.5 transition-colors active:scale-95"
    >
      <div className="text-[10px] font-black text-orange-600 mb-0.5">{site.region}</div>
      <div className="text-[11px] font-bold text-stone-800 leading-tight line-clamp-2">{site.name}</div>
    </button>
  );
}

// ============ 즐겨찾기 ============
function FavoritesView({ notices, onToggleFavorite, daysUntil, onOpenUrl }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-black text-stone-900 flex items-center gap-2">
        <Heart className="w-5 h-5 fill-red-500 text-red-500" />
        즐겨찾는 공고
      </h2>
      <div className="space-y-2.5">
        {notices.length === 0 ? (
          <EmptyState message="즐겨찾는 공고가 없어요" sub="공고에 ⭐를 눌러 즐겨찾기에 추가해보세요" />
        ) : (
          notices.map(n => (
            <NoticeCard
              key={n.id}
              notice={n}
              isFavorite={true}
              onToggleFavorite={() => onToggleFavorite(n.id)}
              daysLeft={daysUntil(n.deadline)}
              onOpenUrl={onOpenUrl}
              expandable
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============ 설정 ============
function SettingsView({ settings, onChange, noticeCount, favoriteCount, lastSync, onRefresh, refreshing }) {
  return (
    <div className="space-y-5">
      <h2 className="text-base font-black text-stone-900">설정</h2>

      <section className="bg-white border-2 border-stone-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
          <h3 className="text-xs font-black text-stone-700">알림</h3>
        </div>
        <div className="p-4 space-y-4">
          <ToggleRow
            title="새 공고 알림"
            sub="새 공고 발견시 푸시 알림 발송"
            value={settings.notifyEnabled}
            onChange={(v) => onChange('notifyEnabled', v)}
          />
          <ToggleRow
            title="앱 시작 시 자동 새로고침"
            sub="앱을 열 때마다 새 공고 확인"
            value={settings.autoRefresh}
            onChange={(v) => onChange('autoRefresh', v)}
          />
          <div>
            <div className="text-sm font-bold text-stone-900 mb-2">마감 임박 기준</div>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => onChange('notifyDays', d)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    settings.notifyDays === d
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {d}일 전
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-2xl p-4">
        <h3 className="text-xs font-black text-stone-700 mb-3">동기화</h3>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '동기화 중...' : '지금 새로고침'}
        </button>
        {lastSync && (
          <p className="text-center text-[11px] text-stone-500 mt-2 font-medium">
            마지막 동기화: {lastSync.toLocaleString('ko-KR')}
          </p>
        )}
      </section>

      <section className="bg-white border-2 border-stone-200 rounded-2xl p-4">
        <h3 className="text-xs font-black text-stone-700 mb-3">내 데이터</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center bg-stone-50 rounded-xl p-3">
            <div className="text-2xl font-black text-orange-600">{noticeCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">전체 공고</div>
          </div>
          <div className="text-center bg-stone-50 rounded-xl p-3">
            <div className="text-2xl font-black text-red-500">{favoriteCount}</div>
            <div className="text-[10px] text-stone-500 font-medium mt-0.5">즐겨찾기</div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4">
        <h3 className="text-xs font-black text-amber-900 mb-2">📱 앱 사용 안내</h3>
        <ul className="text-[11px] text-amber-900 space-y-1.5 leading-relaxed font-medium">
          <li>• 서버에서 8개 사이트의 공고를 자동 수집해요</li>
          <li>• 새 공고가 있으면 알림으로 알려드려요</li>
          <li>• 공고 카드를 누르면 원문 사이트가 열려요</li>
          <li>• 직접 발견한 공고도 + 버튼으로 추가 가능</li>
          <li>• 모든 데이터는 본인 기기에 저장됩니다</li>
        </ul>
      </section>

      <p className="text-center text-[10px] text-stone-400 font-medium pt-2">
        푸드트럭 알리미 v1.0.0<br />
        서버: {API_BASE}
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
      <button
        onClick={() => onChange(!value)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
          value ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-stone-300'
        }`}
      >
        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? 'right-1' : 'left-1'}`} />
      </button>
    </label>
  );
}

// ============ 폼 ============
function NoticeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    region: '논산', title: '', org: '', deadline: '', eventDate: '', location: '', url: '', summary: '', fee: '',
  });

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = () => {
    if (!form.title || !form.deadline) {
      alert('공고명과 마감일은 필수입니다');
      return;
    }
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto animate-[slideUp_0.3s_ease-out]">
        <div className="sticky top-0 bg-white border-b border-stone-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-black text-stone-900">{initial ? '공고 수정' : '공고 등록'}</h2>
          <button onClick={onClose} className="p-1 -mr-1"><X className="w-5 h-5 text-stone-500" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="지역 *">
            <div className="grid grid-cols-5 gap-1.5">
              {['논산', '부여', '공주', '서천', '보령', '청양', '익산', '군산', '김제', '전주', '완주'].map(r => (
                <button
                  key={r}
                  onClick={() => update('region', r)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    form.region === r ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >{r}</button>
              ))}
            </div>
          </Field>
          <Field label="공고 제목 *">
            <input type="text" value={form.title} onChange={(e) => update('title', e.target.value)}
              placeholder="예: 2026 백제문화제 푸드트럭 모집"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="주관 기관">
            <input type="text" value={form.org} onChange={(e) => update('org', e.target.value)}
              placeholder="예: 부여문화관광재단"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="마감일 *">
            <input type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)}
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="행사 일시">
            <input type="text" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)}
              placeholder="예: 2026-09-25 ~ 2026-10-04"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="장소">
            <input type="text" value={form.location} onChange={(e) => update('location', e.target.value)}
              placeholder="예: 부여 백마강 일원"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="참가비">
            <input type="text" value={form.fee} onChange={(e) => update('fee', e.target.value)}
              placeholder="예: 참가비 30만원"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="공고 URL">
            <input type="url" value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://..."
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200" />
          </Field>
          <Field label="요약 / 메모">
            <textarea value={form.summary} onChange={(e) => update('summary', e.target.value)} rows={3}
              placeholder="공고의 주요 내용, 자격 요건 등"
              className="w-full px-4 py-3 bg-stone-100 rounded-xl text-sm font-medium focus:outline-none focus:bg-stone-200 resize-none" />
          </Field>
          <button onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-3.5 rounded-2xl text-sm shadow-lg active:scale-95 transition-transform">
            {initial ? '수정 완료' : '공고 등록'}
          </button>
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
