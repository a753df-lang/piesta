# 🤖 GitHub Actions로 APK 자동 빌드하기

**컴퓨터에 아무것도 설치 안 해도 됩니다.** GitHub 계정만 있으면 클라우드에서 APK가 자동으로 만들어져요.

전체 소요시간: **15~20분** (대부분 기다리는 시간)

---

## 📝 사전 준비

- **GitHub 계정** (없으면 https://github.com/signup 에서 가입, 무료)
- **웹 브라우저** (그게 전부)

---

## 🚀 단계별 진행

### 1단계: GitHub에 새 저장소 만들기

1. https://github.com 로그인
2. 우측 상단 **+** 버튼 → **New repository** 클릭
3. 다음과 같이 입력:
   - **Repository name**: `foodtruck-alarm` (원하는 이름)
   - **Public** 또는 **Private** 선택 (무료 빌드는 Public이 무제한, Private도 월 2000분 무료)
   - **Add a README file** 체크 ✅
4. **Create repository** 클릭

---

### 2단계: 프로젝트 파일 업로드

#### 방법 A: 웹 UI로 드래그 앤 드롭 (가장 쉬움)

1. 만든 저장소 페이지에서 **Add file** → **Upload files** 클릭
2. `foodtruck-apk.tar.gz` 압축을 **컴퓨터에서 풀기**
3. 압축 푼 폴더 안의 **모든 파일과 폴더를** 웹 페이지로 드래그 앤 드롭
   - ⚠️ **중요**: `.github` 폴더가 보이지 않으면 운영체제에서 숨김 폴더 표시를 켜세요
   - 윈도우 탐색기: 보기 → 숨김 항목 ✅
   - 맥 Finder: `Cmd + Shift + .`
4. 페이지 하단 **Commit changes** 클릭

#### 방법 B: Git 명령어 (이미 Git을 쓰는 경우)

```bash
cd foodtruck-apk
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/foodtruck-alarm.git
git push -u origin main
```

---

### 3단계: 빌드 자동 실행 확인

파일 업로드가 완료되면 **자동으로 빌드가 시작됩니다.**

1. 저장소 페이지 상단 메뉴에서 **Actions** 탭 클릭
2. **Build Android APK** 워크플로우가 노란색 ●(진행중) 으로 표시됨
3. 클릭하면 진행 상황을 실시간으로 볼 수 있음
4. **약 5~10분 후** 초록색 ✅로 바뀌면 완료!

빌드 시간이 오래 걸리는 건 정상입니다 (Android SDK + JDK 설치 + Gradle 빌드 때문).

---

### 4단계: APK 다운로드

1. 완료된 워크플로우 페이지 (초록 ✅) 클릭
2. 페이지 하단 **Artifacts** 섹션 찾기
3. **foodtruck-apk-xxxxx** 클릭하면 ZIP 다운로드
4. ZIP 압축 해제 → `foodtruck-debug.apk` 파일 발견!

---

### 5단계: 폰에 APK 설치

#### 방법 A: 카톡으로 보내기
1. APK 파일을 본인 카톡에 전송
2. 폰에서 카톡 → 다운로드
3. 파일 탭하면 설치 화면 등장
4. **"출처를 알 수 없는 앱 설치"** 권한 허용 (안내 따라가면 됨)
5. **설치** 버튼 클릭

#### 방법 B: 구글 드라이브
1. APK를 드라이브에 업로드
2. 폰에서 드라이브 앱으로 다운로드 후 탭

#### 방법 C: USB 케이블
1. 폰을 컴퓨터에 연결
2. APK 파일을 폰의 다운로드 폴더로 복사
3. 폰의 파일 관리자에서 탭하여 설치

---

## 🔄 코드 수정 후 다시 빌드

코드를 바꾸고 GitHub에 다시 푸시하면 **자동으로 새 APK가 빌드됩니다.**

웹 UI로 파일 수정:
1. 저장소에서 수정할 파일 클릭 → 연필 아이콘 ✏️
2. 수정 후 페이지 하단 **Commit changes** 클릭
3. Actions 탭에서 새 빌드 자동 시작 확인

---

## ⚙️ 수동 빌드 트리거

```
저장소 → Actions 탭 → Build Android APK 클릭 → Run workflow 버튼
```

---

## 🔑 (선택) Release APK 서명 키 추가

배포용 서명된 APK가 필요하면:

### 1. 로컬에서 서명 키 생성 (한 번만)

JDK가 설치된 컴퓨터에서:
```bash
keytool -genkey -v -keystore foodtruck.keystore \
  -alias foodtruck -keyalg RSA -keysize 2048 -validity 10000
```
- 비밀번호 입력 (기억해두기!)
- 이름/조직 정보 입력

### 2. 키를 Base64로 변환

```bash
# Mac/Linux
base64 -i foodtruck.keystore | pbcopy   # 클립보드에 복사

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("foodtruck.keystore")) | Set-Clipboard
```

### 3. GitHub Secrets 등록

저장소 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

다음 4개 추가:
- `SIGNING_KEY_BASE64`: 위에서 복사한 base64 문자열
- `KEY_ALIAS`: `foodtruck`
- `KEY_STORE_PASSWORD`: 키 생성 시 입력한 비밀번호
- `KEY_PASSWORD`: 키 생성 시 입력한 비밀번호

다음 빌드부터 `foodtruck-release.apk`(서명됨)도 함께 생성됩니다.

---

## ❓ 문제 해결

### "빌드가 빨간색 ❌으로 실패해요"

1. 실패한 워크플로우 클릭
2. 빨간 ❌가 있는 단계 클릭하면 에러 로그 확인 가능
3. 에러 메시지를 복사해서 저에게 보내주시면 분석해드릴게요

자주 발생하는 에러:
- **`npm install` 실패**: package.json 잘못 업로드 → 다시 업로드
- **AndroidManifest 패치 실패**: 처음 빌드는 정상, 두 번째부터 정상화
- **Gradle 메모리 부족**: GitHub 무료 러너 한계, 보통 재시도하면 성공

### "Actions 탭이 안 보여요"

저장소 → Settings → Actions → General → "Allow all actions" 체크

### "Artifacts가 비어있어요"

빌드 로그에서 16번 단계(Upload APK artifacts) 확인. APK 파일이 안 만들어졌으면 12번 단계(Build Debug APK)에서 에러를 찾아보세요.

### "APK 설치 시 '앱이 설치되지 않았습니다' 에러"

기존에 같은 패키지명(`com.foodtruck.alarm`) 앱이 설치되어 있을 수 있어요. 기존 것 삭제 후 재설치.

---

## 📊 빌드 비용

- **Public 저장소**: 무제한 무료
- **Private 저장소**: 월 2000분 무료 (1회 빌드 ~7분 = 월 280회 가능)
- 일반 개인 사용에는 충분합니다

---

## 🎯 요약 흐름도

```
[로컬 컴퓨터]
   ↓ 파일 업로드
[GitHub 저장소]
   ↓ 자동 트리거
[GitHub Actions 클라우드]
   ↓ 빌드 (5-10분)
[Artifacts에 APK 저장]
   ↓ 다운로드
[로컬 컴퓨터]
   ↓ 카톡/드라이브로 전송
[안드로이드 폰] → 설치 → 완료! 🎉
```

---

## 💬 막히면 알려주세요

빌드 로그에서 빨간색 에러 메시지를 캡처해서 보내주시면 해결해드립니다.
