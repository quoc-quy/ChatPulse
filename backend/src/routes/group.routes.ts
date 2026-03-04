import { Router } from 'express'
import * as groupController from '~/controllers/group.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'

const groupRouter = Router()

groupRouter.use(accessTokenValidator)

// Thêm nhiều thành viên
groupRouter.post('/:id/members', groupController.addMembersController)

// Xóa 1 thành viên cụ thể
groupRouter.delete('/:id/members/:memberId', groupController.kickMemberController)

// User hiện tại rời nhóm
groupRouter.delete('/:id/members/me', groupController.leaveGroupController)

// Thăng quyền cho 1 member cụ thể
groupRouter.patch('/:id/members/:memberId/admin', groupController.promoteAdminController)

// Ghim hội thoại (state của user)
groupRouter.patch('/:id/pin', groupController.pinController)

// Đánh dấu đã đọc
groupRouter.patch('/:id/read', groupController.readController)

export default groupRouter