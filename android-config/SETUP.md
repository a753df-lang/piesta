# Android 네이티브 설정 가이드

`npx cap add android` 실행 후 자동 생성되는 `android/` 폴더 안의 파일을 아래대로 수정하세요.

---

## 1. AndroidManifest.xml 권한 추가

**파일 위치**: `android/app/src/main/AndroidManifest.xml`

`<manifest>` 태그 안, `<application>` 위에 다음 권한 추가:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
```

`<application>` 태그에 다음 속성 추가 (HTTP 서버 사용 시):

```xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"
    android:supportsRtl="true"
    android:theme="@style/AppTheme"
    android:usesCleartextTraffic="true">
```

---

## 2. 앱 이름 한글로 변경

**파일 위치**: `android/app/src/main/res/values/strings.xml`

```xml
<resources>
    <string name="app_name">푸드트럭 알리미</string>
    <string name="title_activity_main">푸드트럭 알리미</string>
    <string name="package_name">com.foodtruck.alarm</string>
    <string name="custom_url_scheme">com.foodtruck.alarm</string>
</resources>
```

---

## 3. 알림 아이콘 추가 (선택)

기본 아이콘으로도 작동하지만, 깔끔한 알림 아이콘을 원한다면:

**파일 위치**: `android/app/src/main/res/drawable/ic_stat_notification.xml`

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24"
    android:tint="#FFFFFF">
    <path
        android:fillColor="@android:color/white"
        android:pathData="M3,17h2v2h2v-2h10v2h2v-2h2v-6.31l-3.86,-7.16C16.96,3.21 16.4,3 15.83,3H8.17C7.6,3 7.04,3.21 6.86,3.69L3,10.69V17z"/>
</vector>
```

---

## 4. 앱 아이콘 변경 (선택)

기본 아이콘을 그대로 써도 되지만, 푸드트럭 아이콘으로 바꾸려면:

1. https://icon.kitchen 또는 Android Studio의 Image Asset Studio 사용
2. 결과물을 `android/app/src/main/res/mipmap-*` 디렉토리에 덮어쓰기
3. 권장 도구: **Android Studio > Right Click on `res` > New > Image Asset**

---

## 5. 서명 키 생성 (Release APK용)

```bash
keytool -genkey -v -keystore foodtruck-release.keystore \
  -alias foodtruck -keyalg RSA -keysize 2048 -validity 10000
```

**파일 위치**: `android/app/build.gradle` 의 `android { ... }` 안에 추가:

```gradle
signingConfigs {
    release {
        storeFile file('../../foodtruck-release.keystore')
        storePassword 'YOUR_PASSWORD'
        keyAlias 'foodtruck'
        keyPassword 'YOUR_PASSWORD'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

---

## 6. 최종 APK 빌드

```bash
# 디버그 APK (테스트용 - 서명 자동)
cd android
./gradlew assembleDebug
# 결과: android/app/build/outputs/apk/debug/app-debug.apk

# 릴리즈 APK (배포용 - 위 5번 키 필요)
./gradlew assembleRelease
# 결과: android/app/build/outputs/apk/release/app-release.apk
```

---

## 디버그 vs 릴리즈

| 종류 | 용도 | 서명 | 크기 | 속도 |
|---|---|---|---|---|
| **debug APK** | 본인/지인 테스트 | 자동 (디버그 키) | 큼 | 느림 |
| **release APK** | 일반 배포, 플레이스토어 | 직접 서명 | 작음 | 빠름 |

처음에는 **debug APK**로 테스트하시고, 잘 동작하면 release로 넘어가세요.
