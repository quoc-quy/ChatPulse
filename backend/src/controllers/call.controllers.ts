import { Request, Response } from 'express'
import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import { liveKitService } from '~/services/livekit.services'
import socketService from '~/services/socket.services'



export const getLiveKitTokenController = async (req: Request, res: Response) => {
  try {
    const { roomName, userName } = req.query as { roomName: string; userName: string }
    const userId = req.decoded_authorization?.user_id || `user_${Date.now()}`

    if (!roomName) {
      return res.status(400).json({ message: 'Thiếu tham số roomName' })
    }


    const token = await liveKitService.generateToken(roomName, userName || 'User', userId)

    return res.json({
      message: 'Lấy LiveKit token thành công',
      result: { token }
    })
  } catch (error) {
    console.error('Lỗi khi tạo token:', error)
    return res.status(500).json({ message: 'Lỗi server khi tạo token' })
  }
}

export const getActiveCallController = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params as { conversationId: string }
    if (!conversationId) {
      return res.status(400).json({ message: 'Thiếu tham số conversationId' })
    }

    const call = await databaseService.calls.findOne({
      conversationId: new ObjectId(conversationId),
      status: { $in: ['initiated', 'ongoing'] }
    })

    let actualCall = null
    if (call) {
      const isActive = socketService.isCallIdActive(call._id.toString(), call.status)
      if (isActive) {
        actualCall = {
          callId: call._id.toString(),
          conversationId: call.conversationId.toString(),
          type: call.type,
          status: call.status,
          callerId: call.callerId.toString(),
          startedAt: call.startedAt
        }
      } else {
        // Dọn dẹp DB: chuyển sang status thích hợp
        const newStatus = call.status.toLowerCase() === 'initiated' ? 'missed' : 'ended'
        await databaseService.calls.updateOne(
          { _id: call._id },
          { $set: { status: newStatus, endedAt: new Date() } }
        )
      }
    }

    return res.json({
      message: 'Lấy trạng thái cuộc gọi thành công',
      result: actualCall
    })
  } catch (error) {
    console.error('Lỗi khi lấy thông tin cuộc gọi hoạt động:', error)
    return res.status(500).json({ message: 'Lỗi server' })
  }
}
