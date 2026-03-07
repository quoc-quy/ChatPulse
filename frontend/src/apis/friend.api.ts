import type { User } from '@/types/user.type'
import http from '@/utils/http'

const friendApi = {
  getListFriend() {
    return http.get<User[]>('/friends/list')
  }
}

export default friendApi
