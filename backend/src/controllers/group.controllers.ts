import { Request, Response } from 'express'
import { groupService } from '~/services/group.services'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'; // Đảm bảo đường dẫn này đúng với dự án của bạn

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
  const memberId = (req.body.memberId as string) || ''

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
  const { user_id } = req.decoded_authorization as TokenPayload;
  const { conversationId } = req.body;

  if (!conversationId) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Thiếu conversationId' });
  }

  const result = await groupService.joinGroupViaLink(conversationId, user_id);

  if (!result) {
    return res.status(httpStatus.NOT_FOUND).json({ message: 'Nhóm không tồn tại hoặc bạn đã ở trong nhóm này' });
  }

  return res.status(httpStatus.OK).json({
    message: 'Tham gia nhóm thành công',
    result
  });
};
