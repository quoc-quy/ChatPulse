import { Router } from 'express'
import {
  getMessagesController,
  sendMessageController,
  editMessageController,
  reactMessageController,
  revokeMessageController,
  deleteMessageController,
  summarizeConversationController,
  deleteMessageForMeController
} from '~/controllers/message.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const messageRouter = Router()

/**
 * Description: Get message history with cursor pagination
 * Path: /messages/:convId
 * Method: GET
 * Query: ?cursor=msgId&limit=20
 * Header: { Authorization: Bearer <access_token> }
 */
messageRouter.get('/:convId', accessTokenValidator, wrapRequestHandler(getMessagesController))

/**
 * Description: Send Text/Sticker message
 * Path: /messages/
 * Method: POST
 * Body: { convId: string, type: 'text' | 'sticker', content: string, replyToId?: string }
 */
messageRouter.post('/', accessTokenValidator, wrapRequestHandler(sendMessageController))
/**
 * Description: Chỉnh sửa tin nhắn
 * Path: /messages/:message_id
 */
messageRouter.patch(
  // '/:message_id',
  '/:id',
  accessTokenValidator,
  wrapRequestHandler(editMessageController)
)

/**
 * Description: Thu hồi tin nhắn (Recall)
 * Path: /messages/:message_id
 */
// messageRouter.delete(
//   // '/:message_id',
//   '/:id',
//   accessTokenValidator,
//   wrapRequestHandler(recallMessageController)
// )
// Route cho Reaction tin nhắn
messageRouter.post('/:id/react', accessTokenValidator, wrapRequestHandler(reactMessageController))
// Route cho Thu hồi Reaction
messageRouter.post('/:id/revoke', accessTokenValidator, wrapRequestHandler(revokeMessageController))

// Route xóa tin nhắn phía tôi
messageRouter.delete('/:id', accessTokenValidator, wrapRequestHandler(deleteMessageController))

/**
 * Description: Nhờ AI tóm tắt tin nhắn nhóm
 * Path: /messages/:convId/summary
 */
messageRouter.get('/:convId/summary', accessTokenValidator, wrapRequestHandler(summarizeConversationController))

/**
 * Description: Xóa tin nhắn ở phía tôi
 * Path: /messages/:messageId/delete-for-me
 */
messageRouter.delete('/:messageId/delete-for-me', accessTokenValidator, wrapRequestHandler(deleteMessageForMeController))

export default messageRouter
