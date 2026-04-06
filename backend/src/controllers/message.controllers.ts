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

  // TODO: Tích hợp Socket.io để emit sự kiện 'receive_message' cho các thành viên khác trong nhóm
  // Ví dụ: socketService.io.to(convId).emit('receive_message', message)

  return res.status(httpStatus.OK).json({
    message: 'Gửi tin nhắn thành công',
    result: message
  })
}

export const editMessageController = async (req: any, res: any) => {
  const { id } = req.params // Lấy ID tin nhắn từ link
  const { content } = req.body // Lấy nội dung mới
  const { user_id } = req.decoded_authorization

  // Gọi đến Service để xử lý (mình sẽ viết ở Bước 2)
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
  const { id } = req.params // ID của tin nhắn
  const { emoji } = req.body // Emoji từ client gửi lên
  const { user_id } = req.decoded_authorization as TokenPayload // ID người thả tim

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
  const unreadCount = Number(req.query.unreadCount) || 0 // Nhận unreadCount từ FE

  // Truyền thêm unreadCount vào service
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
  const type = req.body.type // Lấy type do Frontend truyền lên
  const file = req.file

  if (!file) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Không tìm thấy file tải lên' })
  }

  // Upload lên S3 và lấy URL về
  const fileUrl = await uploadFileToS3(file)



  // THÊM ĐOẠN NÀY ĐỂ BACKEND LƯU ĐÚNG TYPE LÀ 'video' hoặc 'image'
  let messageType = req.body.type || 'media';
  if (messageType === 'media') {
    if (file.mimetype.startsWith('video/')) messageType = 'video';
    else if (file.mimetype.startsWith('image/')) messageType = 'image';
  }

  // Lưu tin nhắn vào DB với chuẩn type mới
  const message = await messageService.sendMessage(user_id, convId, messageType, fileUrl, replyToId)

  return res.status(httpStatus.OK).json({
    message: 'Gửi file thành công',
    result: message
  })
}
