import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim()
const BASE_URL =
  rawApiUrl.length === 0
    ? 'http://localhost:4000'
    : /:\d+$/.test(rawApiUrl)
      ? rawApiUrl
      : `${rawApiUrl}:4000`

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000
})

api.interceptors.request.use(
  async (config) => {
    // ✅ FIX 3: Đọc custom_ip cho HTTP API — giống logic socket trong ChatContext
    const customIp = await AsyncStorage.getItem('custom_ip')
    if (customIp && customIp.trim().length > 0) {
      config.baseURL = `http://${customIp.trim()}:4000`
    } else {
      config.baseURL = BASE_URL
    }

    const token = await AsyncStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)