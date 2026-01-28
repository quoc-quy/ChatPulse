// src/constants/friendStatus.ts
export enum FriendStatus {
  Pending,
  Accepted,
  Declined
}
export interface FriendRequestBody {
  receiver_id: string
}