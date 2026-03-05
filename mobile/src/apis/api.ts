import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export const api = axios.create({
  baseURL: "http://192.168.x.x:4000",
});
// Thêm interceptor để tự động gắn Token
api.interceptors.request.use(
  async (config) => {
    // Kiểm tra chính xác key "access_token" (phải khớp với lúc bạn set ở LoginForm)
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
