import type { User } from '@/types/user.type'
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
    return http.post('/users/register', body)
  },

  login(body: { email: string; password: string }) {
    return http.post('/users/login', body)
  }
}

export default authApi
