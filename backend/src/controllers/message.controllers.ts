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
