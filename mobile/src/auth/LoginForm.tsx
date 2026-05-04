import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native'
import { Input } from '../components/ui/Input'
import { SocialButtons } from '../components/auth/SocialButtons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../apis/api'
import { validateLoginIdentifier, validatePassword } from '../utils/validations'
import { useChatContext } from '../contexts/ChatContext'
import { useTheme } from '../contexts/ThemeContext'

interface LoginFormProps {
  navigation: any
  onLoginSuccess?: () => void
}

export function LoginForm({ navigation, onLoginSuccess }: LoginFormProps) {
  const { colors } = useTheme()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({})

  const { connectSocket } = useChatContext()

  const handleLogin = async () => {
    const identifierError = validateLoginIdentifier(identifier)
    const passwordError = validatePassword(password)

    if (identifierError || passwordError) {
      setErrors({
        identifier: identifierError || undefined,
        password: passwordError || undefined,
      })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        identifier: identifier.trim(),
        email: identifier.trim(),
        password: password,
      })

      if (response.data.result) {
        const { access_token, refresh_token } = response.data.result
        await AsyncStorage.setItem('access_token', access_token)
        await AsyncStorage.setItem('refresh_token', refresh_token)
        connectSocket()

        if (onLoginSuccess) {
          onLoginSuccess()
        } else {
          navigation.replace('Main')
        }
      }
    } catch (error: any) {
      console.log('Lỗi đăng nhập:', error.response?.data)
      const responseData = error?.response?.data
      const firstFieldError = responseData?.errors
        ? (Object.values(responseData.errors)[0] as any)
        : null
      const backendMessage =
        responseData?.message || firstFieldError?.msg || firstFieldError?.message
      const networkMessage =
        error?.message === 'Network Error'
          ? 'Không thể kết nối tới backend. Kiểm tra EXPO_PUBLIC_API_URL, cùng mạng Wi-Fi, và backend đang chạy cổng 4000.'
          : null

      Alert.alert(
        'Đăng nhập thất bại',
        backendMessage || networkMessage || 'Email/username hoặc mật khẩu không chính xác.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: colors.secondary }]}>Welcome back</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                  Login to your ChatPulse account
                </Text>
              </View>

              <Input
                label="Email hoặc username"
                placeholder="m@gmail.com hoặc username"
                value={identifier}
                error={errors.identifier}
                onChangeText={(text) => {
                  setIdentifier(text)
                  if (errors.identifier) setErrors({ ...errors, identifier: undefined })
                }}
                autoCapitalize="none"
              />

              <View style={styles.passwordSection}>
                <View style={styles.rowBetween}>
                  <View />
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={[styles.link, { color: colors.primary }]}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  error={errors.password}
                  onChangeText={(text) => {
                    setPassword(text)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  isPassword={true}
                />
              </View>

              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Login</Text>
                )}
              </TouchableOpacity>

              <View style={styles.separatorContainer}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
                <Text style={[styles.sepText, { color: colors.mutedForeground }]}>Or continue with</Text>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              <SocialButtons />

              <View style={styles.footer}>
                <Text style={[styles.footerGray, { color: colors.mutedForeground }]}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={[styles.boldLink, { color: colors.primary }]}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: { alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { marginTop: 4, textAlign: 'center' },
  passwordSection: { marginBottom: 10 },
  btnPrimary: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { fontWeight: '700', fontSize: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  link: { fontSize: 13, fontWeight: '600' },
  separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1 },
  sepText: { marginHorizontal: 10, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerGray: {},
  boldLink: { fontWeight: 'bold' },
})