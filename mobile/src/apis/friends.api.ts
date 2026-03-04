import { api } from "./api";

export const friendApi = {
  // Lấy danh sách bạn bè
  getFriends: () => api.get("/friends/list"),

  // Lấy danh sách lời mời đã nhận
  getRequests: () => api.get("/friends/requests"),

  // Chấp nhận lời mời
  acceptRequest: (friendId: string) =>
    api.post("/friends/accept", { friendId }),

  // Từ chối lời mời
  declineRequest: (friendId: string) =>
    api.post("/friends/decline", { friendId }),
};
