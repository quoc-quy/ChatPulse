import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/conversations.services'

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

export const createConversationController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { type, members, name } = req.body

  const result = await chatService.createConversation(user_id, type, members, name)

  return res.status(httpStatus.OK).json({
    message: 'Tạo hội thoại thành công',
    result
  })
}

export const getConversationController = async (req: Request, res: Response) => {
  const { id } = req.params as any
  const { user_id } = req.decoded_authorization as TokenPayload

  const conversation = await chatService.getConversationById(id, user_id)

  return res.status(httpStatus.OK).json({
    message: 'Lấy chi tiết hội thoại thành công',
    result: conversation
  })
}
