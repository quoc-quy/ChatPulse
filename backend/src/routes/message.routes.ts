import { Router } from 'express'
import multer from 'multer'
import {
  getMessagesController,
  sendMessageController,
  editMessageController,
  reactMessageController,
  revokeMessageController,
  deleteMessageController,
  summarizeConversationController,
  deleteMessageForMeController,
  searchMessagesController,
  uploadMediaMessageController,
  forwardMessageController
} from '~/controllers/message.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const messageRouter = Router()

// Danh sách các đuôi file bị cấm (Blacklist)
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'scr', 'vbs', 'sh', 'ps1', 'jar', 'sys', 'dll']

// Cấu hình Multer lưu vào RAM
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Giới hạn 10MB
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase() || ''

    if (BLOCKED_EXTENSIONS.includes(ext)) {
      // Từ chối file và ném ra lỗi (Middleware xử lý lỗi chung của bạn sẽ hứng được cái này)
      return cb(new Error(`Bảo mật: Không được phép tải lên định dạng file .${ext}`))
    }

    // Chấp nhận file
    cb(null, true)
  }
})

/**
 * Description: Send Media/File/Audio message
 * Path: /messages/media
 * Method: POST
 * Form-data: convId, type ('media'), file
 */
messageRouter.post(
  '/media',
  accessTokenValidator,
  upload.array('files', 10),
  wrapRequestHandler(uploadMediaMessageController)
)

/**
 * Description: Get message history with cursor pagination
 * Path: /messages/:convId
 * Method: GET
 * Query: ?cursor=msgId&limit=20
 * Header: { Authorization: Bearer <access_token> }
 */
messageRouter.get('/:convId', accessTokenValidator, wrapRequestHandler(getMessagesController))

/**
 * Description: Tìm kiếm tin nhắn trong hội thoại
 * Path: /messages/:convId/search
 * Method: GET
 * Query: ?q=keyword&page=1&limit=20
 */
messageRouter.get('/:convId/search', accessTokenValidator, wrapRequestHandler(searchMessagesController))

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
messageRouter.delete(
  '/:messageId/delete-for-me',
  accessTokenValidator,
  wrapRequestHandler(deleteMessageForMeController)
)

/**
 * Description: Chuyển tiếp tin nhắn
 * Path: /messages/:id/forward
 * Body: { targetUserIds: string[], targetGroupIds: string[] }
 */
messageRouter.post('/:id/forward', accessTokenValidator, wrapRequestHandler(forwardMessageController))
export default messageRouter
