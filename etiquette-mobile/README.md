# Etiquette Tailor - تطبيق الموبايل

تطبيق WebView بسيط لنظام إدارة ورشة الخياطة Etiquette Tailor.

## المميزات

- شاشة تسجيل دخول أصلية (Native)
- WebView لعرض لوحة التحكم
- حفظ بيانات الدخول محلياً
- واجهة عربية بتصميم أنيق
- دعم Android و iOS

## التثبيت

```bash
npm install
```

## التشغيل

### على جهاز Android
```bash
npm run android
```

### على جهاز iOS (يتطلب macOS)
```bash
npm run ios
```

### على المتصفح (للتجربة)
```bash
npm run web
```

### باستخدام Expo Go
```bash
npm start
```
ثم امسح الكود QR بتطبيق Expo Go على هاتفك.

## الإعدادات

قبل تشغيل التطبيق، قم بتغيير `API_URL` في الملفات التالية:

1. **app/index.tsx** (شاشة الدخول)
2. **app/webview.tsx** (شاشة WebView)

استبدل:
```typescript
const API_URL = 'http://192.168.1.100:3000'
```

بعنوان سيرفرك المحلي أو عنوان النشر:
- محلي: `http://YOUR_LOCAL_IP:3000`
- نشر: `https://your-domain.com`

## المتطلبات

- Node.js 18+
- npm أو yarn
- لـ Android: Android Studio
- لـ iOS: Xcode (macOS فقط)

## البناء للنشر

### Android APK
```bash
eas build --platform android
```

### iOS IPA
```bash
eas build --platform ios
```

## هيكل المشروع

```
etiquette-mobile/
├── app/
│   ├── _layout.tsx      # Layout الرئيسي
│   ├── index.tsx        # شاشة تسجيل الدخول
│   └── webview.tsx      # شاشة WebView للتطبيق
├── assets/              # صور وأيقونات
├── package.json
└── app.json             # إعدادات Expo
```

## الأمان

- كلمات المرور محفوظة بشكل آمن باستخدام `expo-secure-store`
- التوكنات محفوظة محلياً فقط على الجهاز
- الاتصال عبر HTTPS في بيئة الإنتاج

## الدعم

للدعم والتقارير، يرجى التواصل مع فريق التطوير.
