import { Request, Response } from 'express'
import { friendService } from '~/services/friend.services'
import { TokenPayload } from '~/models/requests/users.requests'

export const createFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { receiver_id } = req.body
  const result = await friendService.createFriendRequest(user_id, receiver_id)
  res.json(result)
}

export const acceptFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload // người nhận lời mời
  const { sender_id } = req.body // người gửi lời mời ban đầu
  const result = await friendService.acceptFriendRequest(user_id, sender_id)
  res.json(result)
}

export const getFriendListController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await friendService.getFriendList(user_id)
  res.json({ message: 'Lấy danh sách bạn bè thành công', result })
}

export const getReceivedFriendRequestsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await friendService.getReceivedFriendRequests(user_id)
  res.json({
    message: 'Lấy danh sách lời mời đã nhận thành công',
    result
  })
}
export const unfriendController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { friend_id } = req.body
  const result = await friendService.unfriend(user_id, friend_id)
  res.json(result)
}
export const declineFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { id } = req.params as { id: string } // Lấy request_id từ đường dẫn /:id
  const result = await friendService.declineFriendRequest(user_id, id)
  res.json(result)
}

export const cancelFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { id } = req.params as { id: string }
  const result = await friendService.cancelFriendRequest(user_id, id)
  res.json(result)
}
