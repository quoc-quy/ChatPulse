import { Request, Response, NextFunction } from 'express'
import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import httpStatus from '~/constants/httpStatus'

export const requireGroupAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.params.id as string
    const userId = req.decoded_authorization?.user_id as string

    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'conversationId không hợp lệ' })
    }

    const conversation = await databaseService.conversations.findOne({
      _id: new ObjectId(conversationId as string)
    })

    if (!conversation) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Nhóm không tồn tại' })
    }

    if (conversation.type !== 'group') {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'Đây không phải nhóm' })
    }

    if (!conversation.admin_id || conversation.admin_id.toString() !== userId) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'Chỉ nhóm trưởng mới có quyền thực hiện' })
    }

    next()
  } catch (error) {
    next(error)
  }
}

export const requireGroupMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.params.id as string
    const userId = req.decoded_authorization?.user_id as string

    if (!conversationId || !ObjectId.isValid(conversationId)) {
      return res.status(httpStatus.BAD_REQUEST).json({ message: 'conversationId không hợp lệ' })
    }

    const conversation = await databaseService.conversations.findOne({
      _id: new ObjectId(conversationId as string)
    })

    if (!conversation) {
      return res.status(httpStatus.NOT_FOUND).json({ message: 'Nhóm không tồn tại' })
    }

    const isMember = (conversation.participants || []).some((p: ObjectId) => p.toString() === userId)

    if (!isMember) {
      return res.status(httpStatus.FORBIDDEN).json({ message: 'Bạn không phải thành viên nhóm này' })
    }

    next()
  } catch (error) {
    next(error)
  }
}
