// شاشة WebView للتطبيق
import { useState, useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'

const API_URL = 'http://192.168.1.100:3000' // نفس العنوان المستخدم في تسجيل الدخول

export default function WebViewScreen() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // جلب التوكن المحفوظ
    SecureStore.getItemAsync('authToken').then(setToken)
  }, [])

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('authToken')
    await SecureStore.deleteItemAsync('user')
    router.replace('/')
  }

  const injectedJavaScript = `
    // تخزين التوكن في localStorage للWebView
    window.localStorage.setItem('auth-token', '${token}');

    // إخفاء أزرار التنقل غير الضرورية في وضع الموبايل
    const style = document.createElement('style');
    style.textContent = \`
      .mobile-hide { display: none !important; }
      @media (max-width: 768px) {
        body { padding-bottom: 60px; }
      }
    \`;
    document.head.appendChild(style);

    true;
  `

  if (!token) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header ثابت */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Etiquette Tailor</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>خروج</Text>
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <WebView
        source={{ uri: API_URL }}
        style={styles.webview}
        injectedJavaScript={injectedJavaScript}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  logoutButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
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
