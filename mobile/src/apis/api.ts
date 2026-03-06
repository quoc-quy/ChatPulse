import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "http://192.168.1.10:4000";
export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});
// Thêm interceptor để tự động gắn Token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
