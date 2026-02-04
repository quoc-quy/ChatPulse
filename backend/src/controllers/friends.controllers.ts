import { Request, Response } from 'express'
import { friendService } from '~/services/friend.services'
import { TokenPayload } from '~/models/requests/users.requests'
import socketService from '~/services/socket.services'
import userService from '~/services/user.services'

export const createFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { receiver_id } = req.body
  const result = await friendService.createFriendRequest(user_id, receiver_id)

  // Bắn socket thông báo cho người nhận
  const senderInfo = await userService.getMe(user_id) // Lấy info sender để gửi kèm payload
  socketService.emitToUser(receiver_id, 'new_friend_request', {
    sender: {
      _id: senderInfo?._id,
      userName: senderInfo?.userName,
      avatar: senderInfo?.avatar
    }
  })
  res.json(result)
}

export const acceptFriendRequestController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload // người nhận lời mời
  const { sender_id } = req.body // người gửi lời mời ban đầu
  const result = await friendService.acceptFriendRequest(user_id, sender_id)

  // Bắn socket thông báo cho người gửi ban đầu
  const acceptorInfo = await userService.getMe(user_id)
  socketService.emitToUser(sender_id, 'friend_request_accepted', {
    friend: {
      _id: acceptorInfo?._id,
      userName: acceptorInfo?.userName,
      avatar: acceptorInfo?.avatar
    }
  })
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
