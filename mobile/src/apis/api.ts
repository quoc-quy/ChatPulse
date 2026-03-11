import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

const BASE_URL = `${process.env.EXPO_PUBLIC_API_URL}:4000`

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000
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