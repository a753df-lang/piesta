// 백그라운드 러너와 통신 (플러그인이 없거나 웹 미리보기에서는 조용히 무시)
import { BackgroundRunner } from '@capacitor/background-runner';
import { Capacitor } from '@capacitor/core';

const LABEL = 'com.foodtruck.alarm.check';

// 앱에서 이미 본(알린) 공고 ID 를 백그라운드 확인에 알려줘서 같은 공고를 두 번 알리지 않게 함
export function markNoticesSeenInBackground(ids) {
  if (!Capacitor.isNativePlatform() || !ids || !ids.length) return;
  BackgroundRunner.dispatchEvent({ label: LABEL, event: 'markSeen', details: { ids } })
    .catch(() => {});
}
