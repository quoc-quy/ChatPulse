// src/apis/friends.api.ts
import { api } from "./api";

export const friendApi = {
  getFriends: () => api.get("/friends/list"),

  // Cập nhật lại cho đúng với endpoint bạn đang gọi ở Screen
  getRequests: () => api.get("/friends/requests/received"),

  // Cập nhật theo Postman: PATCH http://localhost:4000/friends/requests/:id/accept
  acceptRequest: (requestId: string) =>
    api.patch(`/friends/requests/${requestId}/accept`),

  // Sửa lại theo đúng Postman: DELETE /friends/unfriend kèm body { friend_id }
  deleteFriend: (friendId: string) =>
    api.delete("/friends/unfriend", {
      data: { friend_id: friendId },
    }),

  //Từ chối lời mời kết bạn
  // Cập nhật theo Postman: DELETE http://localhost:4000/friends/requests/:id/decline
  declineRequest: (requestId: string) =>
    api.delete(`/friends/requests/${requestId}/decline`),

  // Lấy toàn bộ pending requests (cả sent và received)
  getPendingRequests: () => api.get("/friends/requests/pending"),

  //Hủy lời mời đã gửi
  // DELETE http://localhost:4000/friends/requests/:id/cancel
  cancelRequest: (requestId: string) =>
    api.delete(`/friends/requests/${requestId}/cancel`),
  // Tìm kiếm người dùng theo userName hoặc số điện thoại
  searchUsers: (keyword: string) =>
    api.get("/users/search", { params: { q: keyword } }),

  // Gửi lời mời kết bạn
  sendFriendRequest: (receiverId: string) =>
    api.post("/friends/request", { receiver_id: receiverId }),
};
