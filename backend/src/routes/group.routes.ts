import { Router } from 'express'
import * as groupController from '~/controllers/group.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { joinGroupController } from '~/controllers/group.controllers'
import { wrapRequestHandler } from '~/utils/handlers'
import { requireGroupAdmin, requireGroupMember } from '~/middlewares/conversations.middlewares'
import multer from 'multer'

const groupRouter = Router()
const upload = multer({ storage: multer.memoryStorage() })

groupRouter.use(accessTokenValidator)

// ── Tạo nhóm ────────────────────────────────────────────────────────────────
groupRouter.post('/', wrapRequestHandler(groupController.createGroupController))

// ── Tham gia nhóm qua link ───────────────────────────────────────────────────
groupRouter.post('/join', wrapRequestHandler(joinGroupController))

// ── Thêm thành viên (phải là thành viên nhóm) ────────────────────────────────
groupRouter.post('/:id/members', requireGroupMember, wrapRequestHandler(groupController.addMembersController))

// ── Rời nhóm (PHẢI ĐẶT TRƯỚC /:id/members/:memberId) ────────────────────────
groupRouter.delete('/:id/members/me', requireGroupMember, wrapRequestHandler(groupController.leaveGroupController))

// ── Kick thành viên (chỉ admin) ──────────────────────────────────────────────
groupRouter.delete(
  '/:id/members/:memberId',
  requireGroupAdmin,
  wrapRequestHandler(groupController.kickMemberController)
)

// ── Giải tán nhóm (chỉ admin) ───────────────────────────────────────────────
groupRouter.delete('/:id/disband', requireGroupAdmin, wrapRequestHandler(groupController.disbandGroupController))

// ── Đổi tên nhóm (phải là thành viên) ───────────────────────────────────────
groupRouter.patch('/:id/name', requireGroupMember, wrapRequestHandler(groupController.renameGroupController))

// ── Thăng quyền admin (chỉ admin) ───────────────────────────────────────────
groupRouter.patch(
  '/:id/members/:memberId/admin',
  requireGroupAdmin,
  wrapRequestHandler(groupController.promoteAdminController)
)

// ── Ghim hội thoại (phải là thành viên) ─────────────────────────────────────
groupRouter.patch('/:id/pin', requireGroupMember, wrapRequestHandler(groupController.pinController))

// ── Đánh dấu đã đọc (phải là thành viên) ────────────────────────────────────
groupRouter.patch('/:id/read', requireGroupMember, wrapRequestHandler(groupController.readController))

// ── Tắt/bật thông báo (phải là thành viên) ──────────────────────────────────
groupRouter.patch('/:id/mute', requireGroupMember, wrapRequestHandler(groupController.muteNotificationController))

// ── Upload avatar nhóm (phải là thành viên) ─────────────────────────────────
groupRouter.post(
  '/:id/avatar/upload',
  requireGroupMember,
  upload.single('file'),
  wrapRequestHandler(groupController.uploadGroupAvatarController)
)

// ── Lấy ảnh/video/file (phải là thành viên) ─────────────────────────────────
groupRouter.get('/:id/media', requireGroupMember, wrapRequestHandler(groupController.getMediaFilesController))

// ── Lấy danh sách link (phải là thành viên) ─────────────────────────────────
groupRouter.get('/:id/links', requireGroupMember, wrapRequestHandler(groupController.getSharedLinksController))

export default groupRouter
