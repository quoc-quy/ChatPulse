import { Request, Response } from 'express'
import { groupService } from '~/services/group.services'
import httpStatus from '~/constants/httpStatus'

// Thêm thành viên
export const addMembersController = async (req: Request, res: Response) => {
  const id = req.params.id as string // Ép kiểu ở đây
  const { member_ids } = req.body as { member_ids: string[] } // Ép kiểu cho mảng luôn
  
  await groupService.addMembers(id, member_ids)
  return res.status(httpStatus.OK).json({ message: 'Thêm thành viên thành công' })
}

// Rời nhóm
export const leaveGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string

  await groupService.leaveGroup(id, userId)
  return res.status(httpStatus.OK).json({ message: 'Rời nhóm thành công' })
}

// Xóa thành viên (Kick)
export const kickMemberController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { member_id } = req.body as { member_id: string }

  await groupService.kickMember(id, member_id)
  return res.status(httpStatus.OK).json({ message: 'Xóa thành viên thành công' })
}

// Thăng cấp Admin
export const promoteAdminController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.body as { user_id: string }

  await groupService.promoteToAdmin(id, user_id)
  return res.status(httpStatus.OK).json({ message: 'Thăng cấp Admin thành công' })
}

// Ghim hội thoại
export const pinController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { is_pin } = req.body as { is_pin: boolean }
  const userId = req.decoded_authorization?.user_id as string

  await groupService.togglePin(userId, id, is_pin)
  return res
    .status(httpStatus.OK)
    .json({ message: is_pin ? 'Ghim thành công' : 'Bỏ ghim thành công' })
}

// Đánh dấu đã xem
export const readController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { last_message_id } = req.body as { last_message_id: string }
  const userId = req.decoded_authorization?.user_id as string

  await groupService.markAsRead(id, userId, last_message_id)
  return res.status(httpStatus.OK).json({ message: 'Đánh dấu đã xem thành công' })
}