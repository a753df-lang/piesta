// 앱 업데이트 확인 (GitHub Releases 기반)
// - 깃허브 Actions 가 main 에 push 될 때마다 v1.0.<빌드번호> 릴리스를 만들고 APK 를 첨부함
// - 앱은 자신의 빌드번호(versionCode)와 최신 릴리스 번호를 비교해서 새 버전이 있으면 알려줌
import { App as CapApp } from '@capacitor/app';
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

// 외부 브라우저(크롬)로 열기 - 앱 내 설치가 안 될 때 예비 방법
// (앱 안 브라우저 탭은 파일 다운로드를 조용히 닫아버리는 경우가 많아서 외부 브라우저로 보냄)
export function openInExternalBrowser(url) {
  window.location.href = url || RELEASES_PAGE;
}

// APK 를 앱 안에서 내려받아 바로 설치 화면 열기
// onProgress(0~1) 로 진행률 전달. 실패하면 예외를 던짐 (호출 쪽에서 외부 브라우저로 대체)
export async function downloadAndInstall(url, onProgress) {
  if (!Capacitor.isNativePlatform()) { openInExternalBrowser(url); return; }
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { FileOpener } = await import('@capawesome-team/capacitor-file-opener');
  let listener = null;
  try {
    listener = await Filesystem.addListener('progress', (e) => {
      if (onProgress && e.contentLength > 0) onProgress(Math.min(1, e.bytes / e.contentLength));
    });
    const res = await Filesystem.downloadFile({
      url, path: 'foodtruck-update.apk', directory: Directory.Cache, progress: true,
    });
    if (onProgress) onProgress(1);
    const path = String(res.path || '').replace(/^file:\/\//, '');
    if (!path) throw new Error('다운로드 경로를 찾지 못했어요');
    await FileOpener.openFile({ path, mimeType: 'application/vnd.android.package-archive' });
  } finally {
    if (listener) listener.remove();
  }
}

// 하위 호환
export async function openUpdateDownload(url) {
  try { await downloadAndInstall(url); } catch { openInExternalBrowser(url); }
}
