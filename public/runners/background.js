// 백그라운드 알림 러너 (@capacitor/background-runner)
// 앱이 꺼져 있어도 안드로이드가 약 30분마다 실행 → 서버에 새 공고가 있으면 알림
// 주의: 웹뷰 밖의 별도 JS 환경이라 fetch / CapacitorKV / CapacitorNotifications 만 사용 가능
const API_BASE = 'https://piesta-server.onrender.com';
const KEY_LAST = 'bg_last_created_at';

function readLast() {
  try {
    const r = CapacitorKV.get(KEY_LAST);
    const v = r && r.value ? parseInt(r.value, 10) : 0;
    return isNaN(v) ? 0 : v;
  } catch (e) {
    return 0;
  }
}

function writeLast(ts) {
  try { CapacitorKV.set(KEY_LAST, String(ts)); } catch (e) {}
}

// 앱이 열려서 공고를 확인했을 때 기준 시각을 갱신 (중복 알림 방지)
addEventListener('markSeen', (resolve, reject, args) => {
  try {
    const ts = args && args.ts ? parseInt(args.ts, 10) : 0;
    if (ts > readLast()) writeLast(ts);
    resolve();
  } catch (e) {
    reject(e);
  }
});

addEventListener('checkNotices', async (resolve, reject) => {
  try {
    const last = readLast();
    // 처음 실행이면 기준 시각만 잡고 알림은 보내지 않음 (기존 공고 폭탄 방지)
    if (!last) {
      writeLast(Date.now());
      resolve();
      return;
    }
    const res = await fetch(API_BASE + '/api/notices?limit=20&since=' + last);
    if (!res.ok) { resolve(); return; }
    const data = await res.json();
    const items = (data && data.notices) || [];
    if (items.length === 0) { resolve(); return; }

    let newest = last;
    for (const n of items) if (n.created_at > newest) newest = n.created_at;
    writeLast(newest);

    const base = Math.floor(Date.now() / 1000) % 100000 + 300000;
    const list = items.slice(0, 5).map((n, i) => ({
      id: base + i,
      title: '🚚 새 푸드트럭 공고 [' + n.region + ']',
      body: n.title,
      smallIcon: 'ic_stat_notification',
      autoCancel: true,
      extra: { url: n.url, noticeId: n.id },
    }));
    if (items.length > 5) {
      list.push({
        id: base + 99,
        title: '🔔 푸드트럭 공고 추가',
        body: (items.length - 5) + '건의 공고가 더 있습니다',
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
