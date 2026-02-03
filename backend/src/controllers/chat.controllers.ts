import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/chat.services'

export const getConversationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const limit = Number(req.query.limit) || 20
  const page = Number(req.query.page) || 1

  const conversations = await chatService.getConversations(user_id, limit, page)

  return res.status(httpStatus.OK).json({
    message: 'Lấy danh sách hội thoại thành công',
    result: conversations
  })
}
