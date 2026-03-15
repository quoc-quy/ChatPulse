import { Router } from 'express'
import * as groupController from '~/controllers/group.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'

const groupRouter = Router()

groupRouter.use(accessTokenValidator)

// Thêm nhiều thành viên
groupRouter.post('/:id/members', groupController.addMembersController)

// =========================================================================
// FIX LỖI: User hiện tại rời nhóm (PHẢI ĐẶT TRƯỚC route có param :memberId)
// =========================================================================
groupRouter.delete('/:id/members/me', groupController.leaveGroupController)

// Xóa 1 thành viên cụ thể (Route động phải đặt sau)
groupRouter.delete('/:id/members/:memberId', groupController.kickMemberController)

// Thăng quyền cho 1 member cụ thể
groupRouter.patch('/:id/members/:memberId/admin', groupController.promoteAdminController)

// Ghim hội thoại (state của user)
groupRouter.patch('/:id/pin', groupController.pinController)

// Đánh dấu đã đọc
groupRouter.patch('/:id/read', groupController.readController)

export default groupRouter
