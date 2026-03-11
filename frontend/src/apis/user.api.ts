import type { User } from '@/types/user.type'
import http from '@/utils/http'

const userApi = {
  getMe() {
    return http.get<User>('/users/me')
  },

  getListBlockedUser() {
    return http.get<User[]>('/users/block')
  }
}

export default userApi
