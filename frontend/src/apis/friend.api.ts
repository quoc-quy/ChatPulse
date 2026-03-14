import type { User } from '@/types/user.type'
import http from '@/utils/http'

const friendApi = {
  getListFriend() {
    return http.get<User[]>('/friends/list')
  },

  getListFriendRequest() {
    return http.get('/friends/requests/received')
  },

  acceptFriend(sender_id: string) {
    return http.patch(`/friends/requests/${sender_id}/accept`)
  },

  requestFriend(body: { receiver_id: string }) {
    return http.post(`/friends/request`, body)
  },

  unFriend(body: { friend_id: string }) {
    return http.delete(`/friends/unfriend`, { data: body })
  },

  declineRequestFriend(user_id: string) {
    return http.delete(`/friends/requests/${user_id}/decline`)
  },

  getListRequestFriend() {
    return http.get('/friends/requests/pending')
  },

  cancelRequestFriend(user_id: string) {
    return http.delete(`/friends/requests/${user_id}/cancel`)
  }
}

export default friendApi
