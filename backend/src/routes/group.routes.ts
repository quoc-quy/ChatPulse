import { Router } from 'express'
import * as groupController from '~/controllers/group.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { /* ... */ joinGroupController } from '~/controllers/group.controllers'
import { wrapRequestHandler } from '~/utils/handlers'
import multer from 'multer'

const groupRouter = Router()
const upload = multer({ storage: multer.memoryStorage() })
groupRouter.use(accessTokenValidator)

// Thêm nhiều thành viên
groupRouter.post('/:id/members', groupController.addMembersController)

// =========================================================================
// FIX LỖI: User hiện tại rời nhóm (PHẢI ĐẶT TRƯỚC route có param :memberId)
// =========================================================================
groupRouter.delete('/:id/members/me', groupController.leaveGroupController)

// Xóa 1 thành viên cụ thể (Route động phải đặt sau)
groupRouter.delete('/:id/members/:memberId', groupController.kickMemberController)

groupRouter.patch('/:id/name', groupController.renameGroupController)

// Thăng quyền cho 1 member cụ thể
groupRouter.patch('/:id/members/:memberId/admin', groupController.promoteAdminController)

// Ghim hội thoại (state của user)
groupRouter.patch('/:id/pin', groupController.pinController)

// Đánh dấu đã đọc
groupRouter.patch('/:id/read', groupController.readController)

/**
 * Tắt/bật thông báo cho hội thoại
 * PATCH /groups/:id/mute
 * Body: { mute: boolean }
 */
groupRouter.patch('/:id/mute', groupController.muteNotificationController)

/**
 * Lấy ảnh, video, file đã gửi trong nhóm
 * GET /groups/:id/media?page=1&limit=20
 */
groupRouter.get('/:id/media', groupController.getMediaFilesController)

/**
 * Lấy danh sách link đã chia sẻ trong nhóm
 * GET /groups/:id/links?page=1&limit=20
 */
groupRouter.get('/:id/links', groupController.getSharedLinksController)

groupRouter.post('/join', accessTokenValidator, wrapRequestHandler(joinGroupController))

groupRouter.post('/:id/avatar/upload', upload.single('file'), groupController.uploadGroupAvatarController)

export default groupRouter
