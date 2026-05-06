/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.foodtruck.alarm',
  appName: '푸드트럭 알리미',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 개발 시 로컬 서버 주소를 여기에 넣으면 핫리로드 가능
    // url: 'http://192.168.0.10:5173',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true, // HTTP 서버 호출 허용 (개발용)
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#EF4444',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notification',
      iconColor: '#EF4444',
      sound: 'default',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#EF4444',
    },
  },
};

export default config;
