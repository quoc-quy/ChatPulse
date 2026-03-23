import type { User } from '@/types/user.type'
import http from '@/utils/http'

export interface BodyUpdateProfile extends Omit<User, '_id' | 'created_at' | 'updated_at' | 'email'> {
  new_password?: string
}

export interface ChangePasswordBody {
  old_password: string
  password: string
  confirm_password: string
}

const userApi = {
  getMe() {
    return http.get<User>('/users/me')
  },

  getListBlockedUser() {
    return http.get<User[]>('/users/block')
  },

  unBlockUser(user_id: string) {
    return http.delete(`/users/unblock/${user_id}`)
  },

  blockUser(body: { blocked_user_id: string }) {
    return http.post('/users/block', body)
  },

  updateMe(body: BodyUpdateProfile) {
    return http.patch('/users/update-profile', body)
  },

  changePassword(body: ChangePasswordBody) {
    return http.put('/users/change-password', body)
  }
}

export default userApi
