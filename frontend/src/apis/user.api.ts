import type { User } from '@/types/user.type'
import http from '@/utils/http'

const userApi = {
  getMe() {
    return http.get<User>('/users/me')
  },

  getListBlockedUser() {
    return http.get<User[]>('/users/block')
  },

  unBlockUser(user_id: string) {
    return http.delete(`/users/unblock/${user_id}`)
  }
}

export default userApi
