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
  timeout: 10000
})

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)