import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import messageService from '~/services/message.services'
import { uploadFileToS3 } from '~/utils/s3'

export const getMessagesController = async (req: Request, res: Response) => {
  const convId = req.params.convId as string
  const cursor = req.query.cursor as string | undefined
  const { user_id } = req.decoded_authorization as TokenPayload

  const limit = Number(req.query.limit) || 50

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

  return res.status(httpStatus.OK).json({
    message: 'Gửi tin nhắn thành công',
    result: message
  })
}

export const editMessageController = async (req: any, res: any) => {
  const { id } = req.params
  const { content } = req.body
  const { user_id } = req.decoded_authorization

  const result = await messageService.editMessage(id, user_id, content)

  return res.json({
    message: 'Sửa tin nhắn thành công',
    result
  })
}

export const deleteMessageController = async (req: Request, res: Response) => {
  const { id } = req.params
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await messageService.deleteMessage(id as any, user_id)

  return res.json({
    message: 'Xóa tin nhắn ở phía bạn thành công',
    result
  })
}

export const reactMessageController = async (req: Request, res: Response) => {
  const { id } = req.params
  const { emoji } = req.body
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await messageService.reactMessage(id as any, user_id, emoji)

  return res.json({
    message: 'Thả cảm xúc thành công',
    result
  })
}

export const revokeMessageController = async (req: Request, res: Response) => {
  const { id } = req.params
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await messageService.revokeMessage(id as any, user_id)

  return res.json({
    message: 'Thu hồi tin nhắn thành công',
    result
  })
}

export const summarizeConversationController = async (req: Request, res: Response) => {
  const convId = req.params.convId as string
  const { user_id } = req.decoded_authorization as TokenPayload

  const limit = Number(req.query.limit) || 30
  const unreadCount = Number(req.query.unreadCount) || 0

  const summary = await messageService.summarizeConversation(convId, user_id, limit, unreadCount)

  return res.status(httpStatus.OK).json({
    message: 'Tóm tắt thành công',
    result: summary
  })
}

export const deleteMessageForMeController = async (req: Request, res: Response) => {
  const messageId = req.params.messageId as string
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await messageService.deleteMessageForMe(messageId, user_id)

  return res.status(httpStatus.OK).json({
    message: 'Xóa tin nhắn ở phía tôi thành công',
    result
  })
}

export const searchMessagesController = async (req: Request, res: Response) => {
  const convId = req.params.convId as string
  const { user_id } = req.decoded_authorization as TokenPayload
  const keyword = ((req.query.q as string) || '').trim()
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 20

  if (!keyword) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Vui lòng nhập từ khóa tìm kiếm',
      result: null
    })
  }

  const result = await messageService.searchMessages(convId, user_id, keyword, page, limit)

  return res.status(httpStatus.OK).json({
    message: 'Tìm kiếm thành công',
    result
  })
}

export const uploadMediaMessageController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { convId, replyToId } = req.body

  const files = req.files as Express.Multer.File[]

  if (!files || files.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Không tìm thấy file tải lên' })
  }

  const uploadPromises = files.map((file) => uploadFileToS3(file))
  const fileUrls = await Promise.all(uploadPromises)

  const messageType: 'text' | 'media' | 'sticker' | 'system' = 'media'

  // Media không dùng E2E (file/ảnh lưu trên S3, chỉ mã hóa text)
  const content = fileUrls[0]

  const message = await messageService.sendMessage(user_id, convId, messageType, content, replyToId)

  return res.status(httpStatus.OK).json({
    message: 'Gửi đa phương tiện thành công',
    result: message
  })
}
