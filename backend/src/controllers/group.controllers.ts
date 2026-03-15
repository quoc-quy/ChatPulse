import { Request, Response } from 'express'
import { groupService } from '~/services/group.services'
import httpStatus from '~/constants/httpStatus'

// Thêm thành viên
export const addMembersController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  // Hứng member_ids an toàn
  const member_ids = (req.body.member_ids as string[]) || []

  if (!member_ids || member_ids.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Danh sách thành viên không được để trống'
    })
  }

  // 1. Hứng kết quả trả về từ service
  const updatedGroup = await groupService.addMembers(id, member_ids)

  // 2. Trả kèm updatedGroup (hoặc bạn có thể đặt tên key là data/result tùy ý)
  return res.status(httpStatus.OK).json({
    message: 'Thêm thành viên thành công',
    result: updatedGroup
  })
}

// Rời nhóm
export const leaveGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string

  // Hứng data trả về
  const updatedGroup = await groupService.leaveGroup(id, userId)

  return res.status(httpStatus.OK).json({
    message: 'Rời nhóm thành công',
    result: updatedGroup // Trả data ra Postman
  })
}

// Xóa thành viên (Kick)
export const kickMemberController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  // Lấy memberId từ req.params thay vì req.body để khớp với route /:id/members/:memberId
  const memberId = req.params.memberId as string

  const updatedGroup = await groupService.kickMember(id, memberId)

  return res.status(httpStatus.OK).json({
    message: 'Xóa thành viên thành công',
    result: updatedGroup
  })
}

// Thăng cấp Admin
export const promoteAdminController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  // Lấy memberId từ Body thay vì params
  const { memberId } = req.body

  const updatedGroup = await groupService.promoteToAdmin(id, memberId)

  return res.status(httpStatus.OK).json({
    message: 'Chuyển giao quyền Admin thành công',
    result: updatedGroup
  })
}

// Ghim hội thoại
export const pinController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { is_pin } = req.body as { is_pin: boolean }
  const userId = req.decoded_authorization?.user_id as string

  // Hứng kết quả từ service
  const updatedGroup = await groupService.togglePin(userId, id, is_pin)

  return res.status(httpStatus.OK).json({
    message: is_pin ? 'Ghim thành công' : 'Bỏ ghim thành công',
    result: updatedGroup // Trả thêm data nếu Frontend cần
  })
}

// Đánh dấu đã xem
export const readController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { last_message_id } = req.body as { last_message_id: string }
  const userId = req.decoded_authorization?.user_id as string

  await groupService.markAsRead(id, userId, last_message_id)
  return res.status(httpStatus.OK).json({ message: 'Đánh dấu đã xem thành công' })
}
