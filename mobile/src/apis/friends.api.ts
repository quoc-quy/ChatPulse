// src/apis/friends.api.ts
import { api } from "./api";

export const friendApi = {
  getFriends: () => api.get("/friends/list"),

  // Cập nhật lại cho đúng với endpoint bạn đang gọi ở Screen
  getRequests: () => api.get("/friends/requests/received"),

  acceptRequest: (friendId: string) =>
    api.post("/friends/accept", { friendId }),

  declineRequest: (friendId: string) =>
    api.post("/friends/decline", { friendId }),
};
