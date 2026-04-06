import http from '@/utils/http'

export interface RegisterBody {
  email: string
  userName: string
  password: string
  confirm_password: string
  phone: string
  date_of_birth: string
}

const authApi = {
  register(body: RegisterBody) {
    return http.post('/auth/register', body)
  },

  login(body: { email: string; password: string }) {
    return http.post('/auth/login', body)
  },

  forgotPassword(body: { email: string }) {
    return http.post('/auth/forgot-password', body)
  },

  resetPassword(body: { password: string; confirm_password: string; forgot_password_token: string }) {
    return http.post('/auth/reset-password', body)
  }
}

export default authApi
