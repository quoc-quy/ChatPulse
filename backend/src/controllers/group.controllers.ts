import { Request, Response } from 'express'
import { groupService } from '~/services/group.services'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests' // Đảm bảo đường dẫn này đúng với dự án của bạn
import { uploadAvatarToS3 } from '../utils/s3'
// Thêm thành viên
export const addMembersController = async (req: Request, res: Response) => {
  const id = req.params.id as string

  // THÊM DÒNG NÀY: Lấy ID của user đang thực hiện thêm thành viên
  const userId = req.decoded_authorization?.user_id as string

  // Hứng member_ids an toàn
  const member_ids = (req.body.member_ids as string[]) || []

  if (!member_ids || member_ids.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({
      message: 'Danh sách thành viên không được để trống'
    })
  }

  // SỬA DÒNG NÀY: Truyền thêm userId vào hàm addMembers
  const updatedGroup = await groupService.addMembers(id, member_ids, userId)

  return res.status(httpStatus.OK).json({
    message: 'Thêm thành viên thành công',
    result: updatedGroup
  })
}

// Rời nhóm
export const leaveGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string

  const result = await groupService.leaveGroup(id, userId)

  // Nếu người này là thành viên cuối cùng -> nhóm đã bị xóa hoàn toàn
  if (result && (result as any).deleted === true) {
    return res.status(httpStatus.OK).json({
      message: 'Rời nhóm thành công. Nhóm đã được xóa vì không còn thành viên nào.',
      result: { deleted: true, conversationId: id }
    })
  }

  return res.status(httpStatus.OK).json({
    message: 'Rời nhóm thành công',
    result
  })
}

// Xóa thành viên (Kick)
export const kickMemberController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  // Lấy memberId từ req.params thay vì req.body để khớp với route /:id/members/:memberId
  const memberId = (req.body.memberId as string) || ''

  const updatedGroup = await groupService.kickMember(id, memberId)

  return res.status(httpStatus.OK).json({
    message: 'Xóa thành viên thành công',
    result: updatedGroup
  })
}

// Thăng cấp Admin
export const promoteAdminController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  // Ưu tiên lấy từ URL param (khi gọi qua PATCH /:id/members/:memberId/admin)
  // Fallback về req.body.memberId để tương thích nếu có nơi nào gọi qua body
  const memberId = (req.params.memberId as string) || (req.body.memberId as string) || ''

  if (!memberId) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Thiếu memberId' })
  }

  const updatedGroup = await groupService.promoteToAdmin(id, memberId)
  return res.status(httpStatus.OK).json({ message: 'Chuyển giao quyền Admin thành công', result: updatedGroup })
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
export const muteNotificationController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string
  const { mute } = req.body as { mute: boolean }

  const result = await groupService.muteNotification(id, userId, mute)
  return res.status(httpStatus.OK).json({
    message: mute ? 'Đã tắt thông báo' : 'Đã bật thông báo',
    result
  })
}

export const getMediaFilesController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 20

  const result = await groupService.getMediaFiles(id, userId, page, limit)
  return res.status(httpStatus.OK).json({
    message: 'Lấy ảnh/video/file thành công',
    result
  })
}

export const getSharedLinksController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 20

  const result = await groupService.getSharedLinks(id, userId, page, limit)
  return res.status(httpStatus.OK).json({
    message: 'Lấy danh sách link thành công',
    result
  })
}
export const renameGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { name } = req.body
  const userId = req.decoded_authorization?.user_id as string

  if (!name || name.trim() === '') {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Tên nhóm không được để trống' })
  }

  const updatedGroup = await groupService.renameGroup(id, userId, name.trim())
  return res.status(httpStatus.OK).json({ message: 'Đổi tên nhóm thành công', result: updatedGroup })
}

export const joinGroupController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { conversationId } = req.body

  if (!conversationId) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Thiếu conversationId' })
  }

  const result = await groupService.joinGroupViaLink(conversationId, user_id)

  if (!result) {
    return res.status(httpStatus.NOT_FOUND).json({ message: 'Nhóm không tồn tại hoặc bạn đã ở trong nhóm này' })
  }

  return res.status(httpStatus.OK).json({
    message: 'Tham gia nhóm thành công',
    result
  })
}
// ── Cập nhật avatar nhóm (tất cả thành viên đều được phép) ──────────────────
export const uploadGroupAvatarController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string

  if (!req.file) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Không có file được gửi lên' })
  }

  const isMember = await groupService.isGroupMember(id, userId)
  if (!isMember) {
    return res.status(httpStatus.FORBIDDEN).json({ message: 'Bạn không phải thành viên nhóm này' })
  }

  const avatarUrl = await uploadAvatarToS3(req.file)
  const updatedGroup = await groupService.updateGroupAvatar(id, userId, avatarUrl)

  return res.status(httpStatus.OK).json({
    message: 'Cập nhật ảnh nhóm thành công',
    result: updatedGroup
  })
}

export const createGroupController = async (req: Request, res: Response) => {
  const userId = req.decoded_authorization?.user_id as string
  const { name, member_ids, avatarUrl } = req.body as {
    name: string
    member_ids: string[]
    avatarUrl?: string
  }

  if (!name || name.trim() === '') {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Tên nhóm không được để trống' })
  }

  if (!member_ids || member_ids.length < 2) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Nhóm phải có ít nhất 3 thành viên' })
  }

  const newGroup = await groupService.createGroup(userId, member_ids, name, avatarUrl)

  return res.status(httpStatus.CREATED).json({
    message: 'Tạo nhóm thành công',
    result: newGroup
  })
}
export const disbandGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const userId = req.decoded_authorization?.user_id as string

  try {
    const result = await groupService.disbandGroup(id, userId)

    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Nhóm không tồn tại' })
    }

    return res.status(httpStatus.OK).json({
      message: 'Giải tán nhóm thành công',
      result
    })
  } catch (err: any) {
    if (err.message === 'FORBIDDEN') {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'Chỉ nhóm trưởng mới có thể giải tán nhóm' })
    }
    throw err
  }
}
