import { Request, Response } from 'express'
import { groupService } from '~/services/group.services'
import httpStatus from '~/constants/httpStatus'

export const addMembersController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { member_ids } = req.body

  try {
    if (!Array.isArray(member_ids) || member_ids.length === 0) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: 'member_ids phải là một mảng và không được rỗng'
      })
    }

    const result = await groupService.addMembers(id, member_ids)

    if (result.matchedCount === 0) {
      return res.status(httpStatus.NOT_FOUND).json({
        message: 'Không tìm thấy cuộc hội thoại'
      })
    }

    if (result.modifiedCount === 0) {
      return res.status(httpStatus.OK).json({
        message: 'Không có thành viên mới nào được thêm'
      })
    }

    return res.status(httpStatus.OK).json({
      message: 'Thêm thành viên thành công'
    })
  } catch (error) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: 'Có lỗi xảy ra khi thêm thành viên',
      error
    })
  }
}   