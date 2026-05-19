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
  forwardMessageController,
  pinMessageController,
  summarizeMessageController
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
      return cb(new Error('Loại file này không được phép tải lên'))
    }
    cb(null, true)
  }
})

// Các route cơ bản
messageRouter.get('/:convId', accessTokenValidator, wrapRequestHandler(getMessagesController))
messageRouter.get('/:convId/search', accessTokenValidator, wrapRequestHandler(searchMessagesController))
messageRouter.post('/', accessTokenValidator, wrapRequestHandler(sendMessageController))

// Route Upload Ảnh/Video/File
messageRouter.post(
  '/media',
  accessTokenValidator,
  upload.array('files', 10),
  wrapRequestHandler(uploadMediaMessageController)
)

// Các thao tác với tin nhắn
messageRouter.put('/:id', accessTokenValidator, wrapRequestHandler(editMessageController))
messageRouter.post('/:id/react', accessTokenValidator, wrapRequestHandler(reactMessageController))
messageRouter.post('/:id/revoke', accessTokenValidator, wrapRequestHandler(revokeMessageController))
messageRouter.delete('/:id', accessTokenValidator, wrapRequestHandler(deleteMessageController))
messageRouter.get('/:convId/summary', accessTokenValidator, wrapRequestHandler(summarizeConversationController))
messageRouter.delete(
  '/:messageId/delete-for-me',
  accessTokenValidator,
  wrapRequestHandler(deleteMessageForMeController)
)
messageRouter.post('/:id/forward', accessTokenValidator, wrapRequestHandler(forwardMessageController))
messageRouter.post('/:id/pin', accessTokenValidator, wrapRequestHandler(pinMessageController))

// ROUTE DUY NHẤT CHO TÓM TẮT FILE
messageRouter.post('/:id/summarize', accessTokenValidator, wrapRequestHandler(summarizeMessageController))

export default messageRouter
