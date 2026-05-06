# 🚚 푸드트럭 알리미 안드로이드 앱

충남, 전북, 논산, 부여, 익산 지역의 푸드트럭 공고를 자동으로 받아보는 안드로이드 앱입니다.

---

## 🌟 가장 쉬운 빌드 방법: GitHub Actions (추천)

**컴퓨터에 아무것도 설치 안 해도 됩니다.** 클라우드에서 자동으로 APK가 만들어져요.

👉 **[GITHUB_ACTIONS_GUIDE.md](./GITHUB_ACTIONS_GUIDE.md)** 파일 참고

요약:
1. GitHub에 새 저장소 만들기
2. 이 폴더의 모든 파일 업로드 (`.github` 폴더 포함!)
3. 자동으로 5~10분 후 APK 완성
4. Actions 탭에서 APK 다운로드 → 폰에 전송 → 설치

---

## 🛠 로컬 빌드 (Android Studio 사용)

### 사전 준비물

다음 3가지가 컴퓨터에 설치되어 있어야 합니다:

1. **Node.js 18 이상** — https://nodejs.org
2. **Android Studio** (최신 버전) — https://developer.android.com/studio
3. **JDK 17** — Android Studio 설치 시 자동 설치됨

---

## 🚀 APK 빌드 5단계

### 1️⃣ 의존성 설치 (1회만)

```bash
cd foodtruck-apk
npm install
```

### 2️⃣ 서버 주소 설정

`src/api.js` 파일 5번째 줄을 자신의 서버 주소로 수정:

```js
export const API_BASE = 'https://your-server.com'; // ← 여기 수정
```

> 💡 자동 크롤링 서버는 별도 프로젝트(`foodtruck-server`)로 제공됩니다. Railway/Render/라즈베리파이 등에 배포한 뒤 그 주소를 넣으세요.

### 3️⃣ 안드로이드 프로젝트 생성

```bash
npm run cap:add
```

이 명령어가 `android/` 디렉토리를 자동 생성합니다.

### 4️⃣ 권한 설정 (1회만)

**`android-config/SETUP.md`** 파일을 열고 안내대로 다음 파일을 수정:
- `android/app/src/main/AndroidManifest.xml` — 인터넷/알림 권한 추가
- `android/app/src/main/res/values/strings.xml` — 앱 이름 한글로

### 5️⃣ APK 빌드

```bash
# 테스트용 디버그 APK
npm run apk:debug

# 결과 파일 위치:
# android/app/build/outputs/apk/debug/app-debug.apk
```

이 APK 파일을 안드로이드 폰에 옮겨서 설치하면 끝!

---

## 📲 폰에 설치하는 방법

### 방법 A: USB 케이블 (가장 빠름)
```bash
# 폰의 개발자 옵션 → USB 디버깅 켜기 → 컴퓨터 연결 후
npm run android
```

### 방법 B: APK 파일 직접 전달
1. `app-debug.apk` 파일을 카톡/구글드라이브로 폰에 전송
2. 폰에서 파일 탭 → "출처를 알 수 없는 앱 설치" 허용
3. 설치 완료

---

## 🛠 개발 모드 (실시간 미리보기)

UI를 수정하면서 실시간으로 보고 싶다면:

```bash
npm run dev
```

브라우저에서 http://localhost:5173 으로 접속하면 모바일 사이즈로 미리보기 가능.

---

## 📂 프로젝트 구조

```
foodtruck-apk/
├── src/
│   ├── App.jsx              ← 메인 앱 (UI 전체)
│   ├── api.js               ← 서버 API + 로컬 저장소
│   ├── notifications.js     ← 안드로이드 로컬 알림
│   ├── main.jsx             ← React 진입점
│   └── index.css            ← 전역 스타일
├── android-config/
│   └── SETUP.md             ← AndroidManifest 권한 설정 가이드
├── capacitor.config.js      ← 앱 ID, 이름 설정
├── package.json
└── README.md (이 파일)
```

---

## 🔑 주요 기능

### 자동 수집 (서버 연동)
- 8개 관공서·문화관광 사이트에서 새 공고를 자동 받아옴
- 새 공고 발견 시 안드로이드 알림 자동 발송
- 오프라인에서도 마지막 수신 데이터 유지

### 수동 등록
- 직접 발견한 공고를 + 버튼으로 등록 (서버 없이도 가능)
- 등록한 공고는 폰에만 저장됨

### 알림
- 새 공고 알림 (서버에서 새 공고 받을 때)
- 마감 임박 알림 (D-3, D-1 등)
- 알림 클릭 시 해당 공고 페이지로 바로 이동

### 즐겨찾기 / 검색 / 필터
- ⭐ 별표로 즐겨찾기 등록
- 지역별 (충남/전북/논산/부여/익산) 필터
- 제목·기관 검색

---

## ❓ 자주 묻는 질문

**Q. 서버 없이도 앱이 작동하나요?**
A. 네. 자동 수집은 안 되지만, 사이트 바로가기 + 수동 공고 등록 + 마감 임박 알림은 다 작동합니다.

**Q. 플레이스토어에 올릴 수 있나요?**
A. 네, 가능합니다. release APK 또는 AAB(권장)로 빌드 후 Google Play Console에 등록 ($25 등록비). 
자세한 건 https://developer.android.com/distribute 참고.

**Q. iOS 앱으로도 만들 수 있나요?**
A. 네! 같은 코드로 `npx cap add ios` 하면 iOS 앱도 만들 수 있어요. (Mac + Xcode 필요)

**Q. APK 파일 크기는 얼마나 되나요?**
A. 디버그 APK 약 8-10MB, 릴리즈 APK 약 5-7MB입니다.

**Q. 알림이 안 와요!**
A. 안드로이드 13+ 에서는 앱 첫 실행 시 알림 권한을 허용해야 합니다. 설정 → 앱 → 푸드트럭 알리미 → 알림 → 허용 으로 확인하세요.

---

## 🔗 다른 프로젝트와 연결

- **자동 크롤링 서버**: `foodtruck-server` 프로젝트 (Node.js + SQLite)
- 두 프로젝트를 함께 사용하면 완전한 자동화 시스템이 됩니다.

---

## 📝 라이선스

개인/공익 목적 자유 사용 가능. 상업적 이용 시 각 관공서 사이트의 이용약관을 준수하세요.
