import axios from "axios"
import AsyncStorage from "@react-native-async-storage/async-storage"

const API_URL = "http://localhost:4000"
// const API_URL = "http://192.168.1.17:4000";

const authHeader = async () => {
  const token = await AsyncStorage.getItem("access_token")
  return {
    Authorization: `Bearer ${token}`
  }
}

export const searchUsers = async (keyword: string) => {
  const headers = await authHeader()
  return axios.get(`${API_URL}/users/search`, {
    headers,
    params: { q: keyword }
  })
}

export const blockUser = async (userId: string) => {
  const headers = await authHeader()
  return axios.post(
    `${API_URL}/users/block`,
    { userId },
    { headers }
  )
}

export const unblockUser = async (userId: string) => {
  const headers = await authHeader()
  return axios.delete(
    `${API_URL}/users/block/${userId}`,
    { headers }
  )
}