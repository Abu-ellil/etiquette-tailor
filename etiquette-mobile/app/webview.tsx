import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, BackHandler } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

const APP_URL = 'https://etiquette-tailor.vercel.app'

type Locale = 'en' | 'ar'
type Theme = 'light' | 'dark'

export default function WebViewScreen() {
  const router = useRouter()
  const webViewRef = useRef<WebView>(null)
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const [locale, setLocale] = useState<Locale>('ar')
  const [theme, setTheme] = useState<Theme>('dark')

  const handleBackPress = useCallback(() => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack()
      return true
    }
    return true
  }, [canGoBack])

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress)
    return () => subscription.remove()
  }, [handleBackPress])

  const handleLogout = async () => {
    webViewRef.current?.injectJavaScript(`
      localStorage.clear();
      sessionStorage.clear();
      document.cookie.split(';').forEach(c => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      true;
    `)
    await SecureStore.deleteItemAsync('authToken')
    await SecureStore.deleteItemAsync('user')
    router.replace('/')
  }

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar'
    setLocale(newLocale)
    webViewRef.current?.injectJavaScript(`
      localStorage.setItem('etq_locale', '${newLocale}');
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { locale: '${newLocale}' } }));
      true;
    `)
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    webViewRef.current?.injectJavaScript(`
      localStorage.setItem('etq_theme', '${newTheme}');
      window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { theme: '${newTheme}' } }));
      true;
    `)
  }

  const headerBg = theme === 'dark' ? '#1e293b' : '#fff'
  const headerBorderColor = theme === 'dark' ? '#334155' : '#e5e5e5'
  const titleColor = theme === 'dark' ? '#e2e8f0' : '#1e3a5f'

  return (
    <View style={[styles.container, theme === 'dark' && styles.containerDark]}>
      <View style={[styles.header, { backgroundColor: headerBg, borderBottomColor: headerBorderColor }]}>
        <Text style={[styles.headerTitle, { color: titleColor }]}>Etiquette Tailor</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={toggleLocale}
            style={[styles.iconButton, styles.localeButton]}
          >
            <Text style={styles.localeText}>{locale === 'ar' ? 'EN' : 'عربي'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleTheme}
            style={[styles.iconButton, theme === 'dark' ? styles.themeButtonDark : styles.themeButtonLight]}
          >
            <Text style={styles.themeText}>{theme === 'light' ? '☾' : '☀'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>خروج</Text>
          </TouchableOpacity>
        </View>
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: APP_URL }}
        style={styles.webview}
        injectedJavaScript={`
          const style = document.createElement('style');
          style.textContent = \`
            .mobile-hide { display: none !important; }
            @media (max-width: 768px) {
              body { padding-bottom: 60px; }
            }
          \`;
          document.head.appendChild(style);
          true;
        `}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          </View>
        )}
        onError={(error) => console.log('WebView error:', error)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  localeButton: {
    backgroundColor: '#3b82f6',
  },
  localeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  themeButtonLight: {
    backgroundColor: '#f59e0b',
  },
  themeButtonDark: {
    backgroundColor: '#6366f1',
  },
  themeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
})
