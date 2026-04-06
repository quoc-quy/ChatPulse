import { AccessToken } from 'livekit-server-sdk'

class LiveKitService {
  async generateToken(roomName: string, participantName: string, participantIdentity: string) {
    const apiKey = process.env.LIVEKIT_API_KEY
    const apiSecret = process.env.LIVEKIT_API_SECRET

    if (!apiKey || !apiSecret) {
      throw new Error('Chưa cấu hình LIVEKIT_API_KEY hoặc LIVEKIT_API_SECRET trong .env')
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName
    })

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true
    })

    return await at.toJwt()
  }
}

export const liveKitService = new LiveKitService()
