// src/apis/friends.api.ts
import { api } from "./api";

export const friendApi = {
  getFriends: () => api.get("/friends/list"),

  // Cập nhật lại cho đúng với endpoint bạn đang gọi ở Screen
  getRequests: () => api.get("/friends/requests/received"),

  // Cập nhật theo Postman: PATCH http://localhost:4000/friends/requests/:id/accept
  acceptRequest: (requestId: string) =>
    api.patch(`/friends/requests/${requestId}/accept`),

  // Cập nhật theo Postman: DELETE http://localhost:4000/friends/requests/:id/decline
  declineRequest: (requestId: string) =>
    api.delete(`/friends/requests/${requestId}/decline`),
};
