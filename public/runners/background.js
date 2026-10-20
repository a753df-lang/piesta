// 백그라운드 알림 러너 (@capacitor/background-runner)
// 안드로이드가 약 1시간마다 깨우지만, 실제로 서버에 묻는 건 하루 3번뿐
// (서버 수집 시각 10시·14시·17시 + 수집이 끝날 30분 뒤) → 그 외에는 인터넷을 전혀 안 씀
// 주의: 웹뷰 밖의 별도 JS 환경이라 fetch / CapacitorKV / CapacitorNotifications 만 사용 가능
//
// 중복 알림 방지: 무료 서버는 재시작되면 DB가 비워지고 공고를 다시 수집하므로
// "서버에 들어온 시각"만으로는 새 공고인지 알 수 없음 → 이미 알린 공고 ID 를 기억해서 거름
const API_BASE = 'https://piesta-server.onrender.com';
const KEY_SEEN = 'bg_seen_ids';
const KEY_INIT = 'bg_initialized';
const MAX_SEEN = 500;
const KEY_LAST_CHECK = 'bg_last_check';
const CHECK_HOURS = [10, 14, 17]; // 서버 수집 시각 (한국시간)
const CHECK_DELAY_MIN = 30;       // 수집이 끝날 때까지 기다리는 시간
const KST = 9 * 3600000;

// 가장 최근의 "확인할 시각" (예: 14:30). 한국시간 기준
function latestCheckTime(now) {
  const k = new Date(now + KST);
  const dayStart = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST;
  const times = CHECK_HOURS.map(h => dayStart + h * 3600000 + CHECK_DELAY_MIN * 60000).filter(t => t <= now);
  if (times.length) return times[times.length - 1];
  return dayStart - 86400000 + CHECK_HOURS[CHECK_HOURS.length - 1] * 3600000 + CHECK_DELAY_MIN * 60000;
}

function readNum(key) {
  try { const r = CapacitorKV.get(key); const v = r && r.value ? parseInt(r.value, 10) : 0; return isNaN(v) ? 0 : v; }
  catch (e) { return 0; }
}

function readSeen() {
  try {
    const r = CapacitorKV.get(KEY_SEEN);
    return r && r.value ? JSON.parse(r.value) : [];
  } catch (e) {
    return [];
  }
}

function writeSeen(list) {
  try { CapacitorKV.set(KEY_SEEN, JSON.stringify(list.slice(-MAX_SEEN))); } catch (e) {}
}

function addSeen(ids) {
  const list = readSeen();
  const set = {};
  for (const id of list) set[id] = true;
  for (const id of ids) if (id && !set[id]) { list.push(id); set[id] = true; }
  writeSeen(list);
}

function isInitialized() {
  try { const r = CapacitorKV.get(KEY_INIT); return !!(r && r.value); } catch (e) { return false; }
}

// 앱이 열려서 공고를 확인했을 때 본 공고 ID 를 전달받음 (앱에서 이미 알린 건 다시 안 알림)
addEventListener('markSeen', (resolve, reject, args) => {
  try {
    const ids = (args && args.ids) || [];
    addSeen(ids);
    CapacitorKV.set(KEY_INIT, '1');
    resolve();
  } catch (e) {
    reject(e);
  }
});

addEventListener('checkNotices', async (resolve) => {
  try {
    const now = Date.now();
    // 이미 이번 수집 결과를 확인했으면 아무것도 안 함 (인터넷 사용 없음)
    if (isInitialized() && readNum(KEY_LAST_CHECK) >= latestCheckTime(now)) { resolve(); return; }
    const res = await fetch(API_BASE + '/api/notices?limit=100');
    if (!res.ok) { resolve(); return; }
    const data = await res.json();
    const items = (data && data.notices) || [];
    try { CapacitorKV.set(KEY_LAST_CHECK, String(now)); } catch (e) {}

    // 처음 실행이면 지금 있는 공고는 "이미 본 것"으로 기록만 하고 알림은 보내지 않음 (기존 공고 폭탄 방지)
    if (!isInitialized()) {
      addSeen(items.map(n => n.id));
      CapacitorKV.set(KEY_INIT, '1');
      resolve();
      return;
    }

    const seen = {};
    for (const id of readSeen()) seen[id] = true;
    const fresh = items.filter(n => n.id && !seen[n.id]);
    if (fresh.length === 0) { resolve(); return; }
    addSeen(fresh.map(n => n.id));

    const base = Math.floor(Date.now() / 1000) % 100000 + 300000;
    const list = fresh.slice(0, 5).map((n, i) => ({
      id: base + i,
      title: '🚚 새 푸드트럭 공고 [' + n.region + ']',
      body: n.title,
      smallIcon: 'ic_stat_notification',
      autoCancel: true,
      extra: { url: n.url, noticeId: n.id },
    }));
    if (fresh.length > 5) {
      list.push({
        id: base + 99,
        title: '🔔 푸드트럭 공고 추가',
        body: (fresh.length - 5) + '건의 공고가 더 있습니다',
        smallIcon: 'ic_stat_notification',
        autoCancel: true,
      });
    }
    CapacitorNotifications.schedule(list);
    resolve();
  } catch (e) {
    // 네트워크 실패 등은 다음 주기에 재시도
    resolve();
  }
});
