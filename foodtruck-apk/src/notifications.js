// 로컬 알림 관리 (서버 푸시 없이도 동작)
import { LocalNotifications } from '@capacitor/local-notifications';

export async function ensurePermission() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    const r = await LocalNotifications.requestPermissions();
    return r.display === 'granted';
  }
  return true;
}

// 새 공고 발견 시 즉시 알림
export async function notifyNewNotices(notices) {
  if (!notices || notices.length === 0) return;
  const ok = await ensurePermission();
  if (!ok) return;

  // 한 번에 최대 5건만 알림 (스팸 방지)
  const items = notices.slice(0, 5);
  const baseId = Math.floor(Date.now() / 1000) % 100000;

  await LocalNotifications.schedule({
    notifications: items.map((n, idx) => ({
      id: baseId + idx,
      title: `🚚 새 푸드트럭 공고 [${n.region}]`,
      body: n.title,
      smallIcon: 'ic_stat_notification',
      iconColor: '#EF4444',
      extra: { url: n.url, noticeId: n.id },
      schedule: { at: new Date(Date.now() + 1000 + idx * 500) },
    })),
  });

  // 6건 이상이면 요약 알림 추가
  if (notices.length > 5) {
    await LocalNotifications.schedule({
      notifications: [{
        id: baseId + 99,
        title: '🔔 푸드트럭 공고 추가',
        body: `${notices.length - 5}건의 공고가 더 있습니다`,
        smallIcon: 'ic_stat_notification',
        iconColor: '#EF4444',
        schedule: { at: new Date(Date.now() + 4000) },
      }],
    });
  }
}

// 마감 임박 공고 일일 리마인더
export async function scheduleDeadlineReminders(notices, daysBefore = 3) {
  const ok = await ensurePermission();
  if (!ok) return;

  // 기존 예약 취소
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications
        .filter(n => n.id >= 200000 && n.id < 300000)
        .map(n => ({ id: n.id })),
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = notices.filter(n => {
    if (!n.deadline) return false;
    const dl = new Date(n.deadline);
    const diff = (dl - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= daysBefore;
  });

  if (upcoming.length === 0) return;

  // 다음날 오전 9시에 마감 임박 알림
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);

  await LocalNotifications.schedule({
    notifications: [{
      id: 200001,
      title: '⏰ 마감 임박 푸드트럭 공고',
      body: `${upcoming.length}건의 공고가 ${daysBefore}일 내 마감됩니다`,
      smallIcon: 'ic_stat_notification',
      iconColor: '#EF4444',
      schedule: { at: tomorrow9am },
    }],
  });
}

// 알림 클릭 시 처리
export function listenNotificationClick(handler) {
  LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
    const data = event.notification?.extra;
    if (data?.url) handler(data.url, data.noticeId);
  });
}
