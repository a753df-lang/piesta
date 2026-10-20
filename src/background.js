// 백그라운드 러너와 통신 (플러그인이 없거나 웹 미리보기에서는 조용히 무시)
import { BackgroundRunner } from '@capacitor/background-runner';
import { Capacitor } from '@capacitor/core';

const LABEL = 'com.foodtruck.alarm.check';

export function markNoticesSeenInBackground(ts) {
  if (!Capacitor.isNativePlatform()) return;
  BackgroundRunner.dispatchEvent({ label: LABEL, event: 'markSeen', details: { ts } })
    .catch(() => {});
}
