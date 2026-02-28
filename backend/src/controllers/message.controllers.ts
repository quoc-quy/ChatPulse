import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import messageService from '~/services/message.services'

export const getMessagesController = async (req: Request, res: Response) => {
  const convId = req.params.convId as string
  const cursor = req.query.cursor as string | undefined
  const limit = Number(req.query.limit) || 20
  const { user_id } = req.decoded_authorization as TokenPayload

  const messages = await messageService.getMessages(convId, user_id, cursor, limit)

  return res.status(httpStatus.OK).json({
    message: 'Lấy lịch sử tin nhắn thành công',
    result: messages
  })
}

export const sendMessageController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { convId, type, content, replyToId } = req.body

  const message = await messageService.sendMessage(user_id, convId, type, content, replyToId)

  // TODO: Tích hợp Socket.io để emit sự kiện 'receive_message' cho các thành viên khác trong nhóm
  // Ví dụ: socketService.io.to(convId).emit('receive_message', message)

  return res.status(httpStatus.OK).json({
    message: 'Gửi tin nhắn thành công',
    result: message
  })
}
