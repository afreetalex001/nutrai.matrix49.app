import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.matrix49.nutriclinic',
  appName: 'NutriClinic',
  // التطبيق يفتح الموقع المنشور مباشرة - مربوط بنفس DB وكل التحديثات فورية
  server: {
    url: 'https://nutriclinic.matrix49.app',
    cleartext: false,
    androidScheme: 'https',
  },
  // webDir ضروري حتى لو نستخدم server.url - يحتوي صفحة fallback offline
  webDir: 'android-shell',
  android: {
    backgroundColor: '#059669',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#059669',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
  },
};

export default config;
