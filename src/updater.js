// 앱 업데이트 확인 (GitHub Releases 기반)
// - 깃허브 Actions 가 main 에 push 될 때마다 v1.0.<빌드번호> 릴리스를 만들고 APK 를 첨부함
// - 앱은 자신의 빌드번호(versionCode)와 최신 릴리스 번호를 비교해서 새 버전이 있으면 알려줌
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const REPO = 'a753df-lang/piesta';
const LATEST_API = `https://api.github.com/repos/${REPO}/releases/latest`;
export const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`;

// 현재 설치된 앱 정보 { version: '1.0.12', build: 12 }
export async function getCurrentVersion() {
  if (!Capacitor.isNativePlatform()) return { version: 'web', build: 0 };
  try {
    const info = await CapApp.getInfo();
    return { version: info.version, build: parseInt(info.build, 10) || 0 };
  } catch {
    return { version: '?', build: 0 };
  }
}

function buildFromTag(tag) {
  // 'v1.0.12' → 12
  const m = String(tag || '').match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

// 반환: { hasUpdate, current, latest: {version, build, notes, apkUrl, publishedAt} } 또는 { error }
export async function checkForUpdate() {
  const current = await getCurrentVersion();
  try {
    const res = await fetch(LATEST_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (res.status === 404) return { hasUpdate: false, current, latest: null };
    if (!res.ok) throw new Error(`업데이트 서버 오류 (${res.status})`);
    const rel = await res.json();
    const apk = (rel.assets || []).find(a => /\.apk$/i.test(a.name));
    const latest = {
      version: String(rel.tag_name || '').replace(/^v/, ''),
      build: buildFromTag(rel.tag_name),
      notes: rel.body || '',
      apkUrl: apk ? apk.browser_download_url : RELEASES_PAGE,
      publishedAt: rel.published_at,
    };
    // 웹 미리보기(build 0)에서는 업데이트 안내 안 함
    const hasUpdate = current.build > 0 && latest.build > current.build;
    return { hasUpdate, current, latest };
  } catch (err) {
    return { hasUpdate: false, current, latest: null, error: err.message };
  }
}

// APK 다운로드 → 알림창/다운로드 폴더에서 눌러서 설치
export async function openUpdateDownload(url) {
  try { await Browser.open({ url: url || RELEASES_PAGE }); }
  catch { window.open(url || RELEASES_PAGE, '_blank'); }
}
