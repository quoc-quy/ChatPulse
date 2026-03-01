// frontend/src/utils/http.ts
import config from '@/constants/config'
import axios, { type AxiosInstance } from 'axios'
import {
  clearLS,
  getAccessTokenFromLS,
  getRefreshTokenFromLS,
  setAccessTokenToLS,
  setProfileFromLS,
  setRefreshTokenToLS
} from './auth'

class Http {
  instance: AxiosInstance
  private access_token: string
  private refresh_token: string

  constructor() {
    // Khởi tạo token từ LocalStorage
    this.access_token = getAccessTokenFromLS()
    this.refresh_token = getRefreshTokenFromLS()

    this.instance = axios.create({
      baseURL: config.baseUrl,
      timeout: 10000, // Khuyên dùng 10s (10000) thay vì 1s (1000) để tránh lỗi timeout do mạng chậm
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request Interceptor: Tự động đính kèm Token vào Header
    this.instance.interceptors.request.use(
      (config) => {
        if (this.access_token && config.headers) {
          // BẮT BUỘC phải có chữ 'Bearer ' trước token
          config.headers.Authorization = `Bearer ${this.access_token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response Interceptor: Xử lý tự động lưu/xóa dữ liệu khi Login/Logout
    this.instance.interceptors.response.use(
      (response) => {
        const { url } = response.config

        // Xử lý khi Đăng nhập hoặc Đăng ký thành công
        if (url === '/users/login' || url === '/users/register') {
          const data = response.data
          // Cập nhật biến class
          this.access_token = data.result.access_token
          this.refresh_token = data.result.refresh_token

          // Lưu xuống LocalStorage
          setAccessTokenToLS(this.access_token)
          setRefreshTokenToLS(this.refresh_token)
          // Đảm bảo hàm setProfileFromLS của bạn thực chất là hàm LƯU profile xuống LS (thường đặt tên là setProfileToLS)
          setProfileFromLS(data.result.user)
        }
        // Xử lý khi Đăng xuất
        else if (url === '/users/logout') {
          this.access_token = ''
          this.refresh_token = ''
          clearLS()
        }

        return response
      },
      (error) => {
        // Có thể bổ sung logic bắt lỗi 401 ở đây sau này (ví dụ: Refresh Token)
        return Promise.reject(error)
      }
    )
  }
}

// Khởi tạo một instance duy nhất để export
const http = new Http()

// Export instance của axios để các file api sử dụng
export default http.instance
