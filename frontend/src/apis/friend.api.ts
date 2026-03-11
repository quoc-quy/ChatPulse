import type { User } from '@/types/user.type'
import http from '@/utils/http'

const friendApi = {
  getListFriend() {
    return http.get<User[]>('/friends/list')
  },

  getListFriendRequest() {
    return http.get('/friends/requests/received')
  }
}

export default friendApi
