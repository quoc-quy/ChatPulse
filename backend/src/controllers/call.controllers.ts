import { Request, Response } from 'express'
import { liveKitService } from '~/services/livekit.services'

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
