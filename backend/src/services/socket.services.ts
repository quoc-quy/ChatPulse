import { Server, Socket } from 'socket.io'
import http from 'http'
import Call from '~/models/schemas/call.schema'
import Message from '~/models/schemas/message.schema'
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import messageService from './message.services'
import { CallStatus } from '~/constants/callStataus'

class SocketService {
  public io!: Server
  public usersOnline: Set<string> = new Set()

  // FIX 1: Bộ lưu trữ đếm thời gian chờ cuộc gọi (Timeout 60s)
  private callTimeouts: Map<string, NodeJS.Timeout> = new Map()
  public activeCallParticipants: Map<string, Set<string>> = new Map()
  public socketCalls: Map<string, { callId: string; conversationId: string }> = new Map()
  public ringingInvitees: Map<string, Set<string>> = new Map()

  public isCallIdActive(callId: string, status: string): boolean {
    const statusLower = status.toLowerCase()
    if (statusLower === 'initiated') {
      return this.callTimeouts.has(callId)
    }
    if (statusLower === 'ongoing') {
      const activeSet = this.activeCallParticipants.get(callId)
      return activeSet !== undefined && activeSet.size > 0
    }
    return false
  }

  init(httpServer: http.Server) {
    this.io = new Server(httpServer, {
      cors: { origin: '*' }
    })

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.handshake.auth.user_id as string
      if (!userId) {
        socket.disconnect()
        return
      }

      socket.join(userId)
      this.usersOnline.add(userId)
      socket.broadcast.emit('user_status_change', { userId, isOnline: true })

      // 1. Khởi tạo cuộc gọi
      socket.on('call:initiate', async (data: { conversationId: string; type: string }, callback: Function) => {
        try {
          const { conversationId, type } = data
          const newCall = new Call({
            conversationId: new ObjectId(conversationId),
            callerId: new ObjectId(userId),
            type: type as any,
            status: CallStatus.INITIATED,
            participants: [new ObjectId(userId)],
            startedAt: new Date()
          })
          const result = await databaseService.calls.insertOne(newCall)
          const realCallId = result.insertedId.toString()

          // --- BẮT ĐẦU ĐẾM NGƯỢC 60 GIÂY ---
          const timeoutId = setTimeout(async () => {
            const checkCall = await databaseService.calls.findOne({ _id: new ObjectId(realCallId) })
            // Sau 60s nếu vẫn chưa ai nghe máy (vẫn là INITIATED)
            if (checkCall && checkCall.status.toLowerCase() === 'initiated') {
              await databaseService.calls.updateOne(
                { _id: checkCall._id },
                { $set: { status: CallStatus.MISSED, endedAt: new Date() } }
              )
              // Bắn tin nhắn bị nhỡ
              await this.createAndEmitCallMessage(realCallId, 'missed')

              // Báo cho UI tắt popup cuộc gọi
              const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
              if (conversation && conversation.participants) {
                conversation.participants.forEach((pId) => {
                  this.emitToUser(pId.toString(), 'call:missed', { callId: realCallId })
                })
              }
            }
            this.callTimeouts.delete(realCallId)
            this.ringingInvitees.delete(realCallId)
          }, 60000) // 60.000 ms = 60 giây
          this.callTimeouts.set(realCallId, timeoutId)
          // ---------------------------------

          const caller = await databaseService.users.findOne({ _id: new ObjectId(userId) })
          const callerName = caller?.userName || 'Người dùng'
          const callerAvatar = caller?.avatar || ''

          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
          if (conversation && conversation.participants) {
            const ringingSet = new Set<string>()
            conversation.participants.forEach((participantId) => {
              const pIdStr = participantId.toString()
              if (pIdStr !== userId) {
                if (this.usersOnline.has(pIdStr)) {
                  ringingSet.add(pIdStr)
                }
                this.emitToUser(pIdStr, 'call:incoming', {
                  callId: realCallId,
                  conversationId,
                  callerId: userId,
                  callerName,
                  callerAvatar,
                  type
                })
              }
            })
            this.ringingInvitees.set(realCallId, ringingSet)
          }
          if (typeof callback === 'function') callback({ callId: realCallId })
        } catch (error) {
          console.error('Lỗi khởi tạo cuộc gọi:', error)
        }
      })

      // 2. Chấp nhận và Tham gia cuộc gọi
      socket.on('call:join', async (data: { callId: string; conversationId: string }) => {
        try {
          const { callId, conversationId } = data

          // Đăng ký socket đàm thoại
          this.socketCalls.set(socket.id, { callId, conversationId })
          let activeSet = this.activeCallParticipants.get(callId)
          if (!activeSet) {
            activeSet = new Set<string>()
            this.activeCallParticipants.set(callId, activeSet)
          }
          activeSet.add(userId)
          console.log(`[Socket] User ${userId} joined call ${callId}. Active participants: ${activeSet.size}`)

          const ringingSet = this.ringingInvitees.get(callId)
          if (ringingSet) {
            ringingSet.delete(userId)
          }

          const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })

          if (call) {
            // FIX 2: Xác định người join là NGƯỜI GỌI hay NGƯỜI NGHE
            const isCaller = call.callerId.toString() === userId

            // CHỈ KHI NGƯỜI NGHE JOIN VÀO THÌ CUỘC GỌI MỚI CHUYỂN SANG ONGOING (Đang diễn ra)
            if (!isCaller && call.status.toLowerCase() === 'initiated') {
              // Hủy bỏ đếm ngược 60s vì đã có người bắt máy
              const timeoutId = this.callTimeouts.get(callId)
              if (timeoutId) {
                clearTimeout(timeoutId)
                this.callTimeouts.delete(callId)
              }

              await databaseService.calls.updateOne(
                { _id: new ObjectId(callId) },
                {
                  $addToSet: { participants: new ObjectId(userId) },
                  $set: { status: CallStatus.ONGOING, startedAt: new Date() }
                }
              )
            } else {
              // Người gọi tự join vào phòng lúc vừa phát yêu cầu, chỉ add id chứ không đổi status
              await databaseService.calls.updateOne(
                { _id: new ObjectId(callId) },
                { $addToSet: { participants: new ObjectId(userId) } }
              )
            }
          }

          const user = await databaseService.users.findOne({ _id: new ObjectId(userId) })
          const userName = user?.userName || 'Người dùng'

          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:user-joined', {
                  userId: userId,
                  socketId: socket.id,
                  userName
                })
              }
            })
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 3. Truyền nhận tín hiệu WebRTC
      socket.on('call:signal', async (data: { targetSocketId?: string; targetUserId?: string; signal: any }) => {
        try {
          let userName = undefined
          if (data.signal && (data.signal.type === 'offer' || data.signal.type === 'answer')) {
            const user = await databaseService.users.findOne({ _id: new ObjectId(userId) })
            userName = user?.userName || 'Người dùng'
          }
          if (data.targetSocketId) {
            this.io
              .to(data.targetSocketId)
              .emit('call:signal', { callerId: userId, callerSocketId: socket.id, userName, signal: data.signal })
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 3b. Callee chấp nhận cuộc gọi (mobile emit event này sau khi nhấn "Nghe máy")
      // Backend relay lại cho caller (web) biết để cả hai bên cùng sẵn sàng vào LiveKit Room
      socket.on('call:accepted', async (data: { callId: string; conversationId: string }) => {
        try {
          const { callId, conversationId } = data
          console.log(`[Socket] call:accepted received on backend. Caller/Callee socket userId: ${userId}, callId: ${callId}, conversationId: ${conversationId}`)

          // Hủy đếm ngược 60s vì đã có người bắt máy
          const timeoutId = this.callTimeouts.get(callId)
          if (timeoutId) {
            console.log(`[Socket] Cleared timeout for call: ${callId}`)
            clearTimeout(timeoutId)
            this.callTimeouts.delete(callId)
          }

          // Cập nhật status sang ONGOING nếu chưa
          const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })
          if (call && call.status.toLowerCase() === 'initiated') {
            console.log(`[Socket] Updating call ${callId} status from INITIATED to ONGOING`)
            await databaseService.calls.updateOne(
              { _id: new ObjectId(callId) },
              {
                $addToSet: { participants: new ObjectId(userId) },
                $set: { status: CallStatus.ONGOING, startedAt: new Date() }
              }
            )
          }

          // Relay sự kiện call:accepted tới tất cả participant còn lại (caller/web)
          // để web biết mobile đã chấp nhận và cả hai bên cùng join LiveKit Room
          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
          if (conversation && conversation.participants) {
            console.log(`[Socket] Found conversation with participants: ${conversation.participants.map(p => p.toString()).join(', ')}`)
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                console.log(`[Socket] Relaying call:accepted to participant: ${pId.toString()}`)
                this.emitToUser(pId.toString(), 'call:accepted', {
                  callId,
                  conversationId,
                  acceptedBy: userId
                })
              }
            })
          } else {
            console.log(`[Socket] Conversation or participants not found for conversationId: ${conversationId}`)
          }
        } catch (error) {
          console.error('Lỗi xử lý call:accepted:', error)
        }
      })


      // 4. Từ chối cuộc gọi
      socket.on('call:reject', async (data: { callId: string; conversationId: string }) => {
        try {
          const { callId, conversationId } = data
          const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })
          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })

          if (!call || !conversation) return

          const isGroup = conversation.type === 'group'

          // Xóa khỏi danh sách đang đổ chuông khi bấm từ chối
          const ringingSet = this.ringingInvitees.get(callId)
          if (ringingSet) {
            ringingSet.delete(userId)
          }

          if (isGroup) {
            // Gửi sự kiện user-left cho các thành viên khác biết thành viên này đã từ chối
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:user-left', { userId, socketId: socket.id })
              }
            })

            // Chỉ kết thúc cuộc gọi nhóm khi không còn ai đang tham gia VÀ không còn ai đang đổ chuông
            const activeParticipants = this.activeCallParticipants.get(callId)
            const activeSize = activeParticipants ? activeParticipants.size : 0
            const ringingSize = ringingSet ? ringingSet.size : 0

            if (activeSize === 0 && ringingSize === 0) {
              const timeoutId = this.callTimeouts.get(callId)
              if (timeoutId) {
                clearTimeout(timeoutId)
                this.callTimeouts.delete(callId)
              }

              if (!['ended', 'rejected', 'cancelled', 'missed'].includes(call.status.toLowerCase())) {
                await databaseService.calls.updateOne(
                  { _id: new ObjectId(callId) },
                  { $set: { status: CallStatus.REJECTED, endedAt: new Date() } }
                )
                await this.createAndEmitCallMessage(callId, 'rejected')
              }

              this.emitToUser(call.callerId.toString(), 'call:rejected', { callId })
              this.ringingInvitees.delete(callId)
            }
          } else {
            // Cuộc gọi 1-1: Kết thúc cuộc gọi ngay lập tức
            const timeoutId = this.callTimeouts.get(callId)
            if (timeoutId) {
              clearTimeout(timeoutId)
              this.callTimeouts.delete(callId)
            }

            if (!['ended', 'rejected', 'cancelled', 'missed'].includes(call.status.toLowerCase())) {
              await databaseService.calls.updateOne(
                { _id: new ObjectId(callId) },
                { $set: { status: CallStatus.REJECTED, endedAt: new Date() } }
              )
              await this.createAndEmitCallMessage(callId, 'rejected')
            }

            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:rejected', { callId })
              }
            })
            this.ringingInvitees.delete(callId)
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 5. Rời cuộc gọi / Hủy gọi
      socket.on('call:leave', async (data: { callId: string; conversationId: string }) => {
        this.socketCalls.delete(socket.id)
        await this.handleCallLeave(userId, socket.id, data.callId, data.conversationId)
      })

      socket.on('call:toggle-media', async (data) => {
        try {
          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(data.conversationId) })
          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:media-toggled', {
                  userId,
                  socketId: socket.id,
                  isMicOn: data.isMicOn,
                  isCameraOn: data.isCameraOn
                })
              }
            })
          }
        } catch (error) {
          console.error(error)
        }
      })

      socket.on('disconnect', async () => {
        // Tự động rời cuộc gọi nếu ngắt kết nối đột ngột
        const callInfo = this.socketCalls.get(socket.id)
        if (callInfo) {
          this.socketCalls.delete(socket.id)
          await this.handleCallLeave(userId, socket.id, callInfo.callId, callInfo.conversationId)
        }

        const sockets = await this.io.in(userId).fetchSockets()
        if (sockets.length === 0) {
          this.usersOnline.delete(userId)
          this.io.emit('user_status_change', { userId, isOnline: false, lastActiveAt: new Date().toISOString() })
        }
      })

      socket.on('message_delivered', async (data: { messageId: string; conversationId: string }) => {
        try {
          await messageService.markMessageDelivered(data.messageId, userId) // <-- không cần dynamic import nữa

          const conversation = await databaseService.conversations.findOne({
            _id: new ObjectId(data.conversationId)
          })

          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'message_status_update', {
                  messageId: data.messageId,
                  status: 'DELIVERED',
                  userId: userId
                })
              }
            })
          }
        } catch (error) {
          console.error('Lỗi mark delivered:', error)
        }
      })

      socket.on('message_seen', async (data: { messageId: string; conversationId: string }) => {
        try {
          await messageService.markMessageSeen(data.messageId, userId) // <-- tương tự

          const conversation = await databaseService.conversations.findOne({
            _id: new ObjectId(data.conversationId)
          })

          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'message_status_update', {
                  messageId: data.messageId,
                  status: 'SEEN',
                  userId: userId
                })
              }
            })
          }
        } catch (error) {
          console.error('Lỗi mark seen:', error)
        }
      })
    })
  }

  public async handleCallLeave(userId: string, socketId: string, callId: string, conversationId: string) {
    try {
      console.log(`[Socket] handleCallLeave called. User: ${userId}, Socket: ${socketId}, Call: ${callId}`)
      
      const timeoutId = this.callTimeouts.get(callId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.callTimeouts.delete(callId)
      }

      const activeSet = this.activeCallParticipants.get(callId)
      if (activeSet) {
        activeSet.delete(userId)
        console.log(`[Socket] Active participants remaining for call ${callId}: ${activeSet.size}`)
      }

      // Lấy cuộc hội thoại để check 1-1 hay nhóm trước
      const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
      const isOneOnOne = conversation ? conversation.type === 'direct' : false

      const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })

      if (call && !['ended', 'rejected', 'cancelled', 'missed'].includes(call.status.toLowerCase())) {
        let newStatus = ''
        let messageType: 'completed' | 'cancelled' | 'missed' = 'completed'

        if (call.status.toLowerCase() === 'initiated') {
          newStatus = 'cancelled'
          messageType = 'cancelled'
        } else if (call.status.toLowerCase() === 'ongoing') {
          const activeCount = activeSet ? activeSet.size : 0
          if (isOneOnOne || activeCount === 0) {
            newStatus = CallStatus.ENDED
            messageType = 'completed'
          }
        }

        if (newStatus) {
          await databaseService.calls.updateOne(
            { _id: call._id },
            { $set: { status: newStatus, endedAt: new Date() } }
          )
          await this.createAndEmitCallMessage(callId, messageType)
        }
      }

      if (conversation && conversation.participants) {
        conversation.participants.forEach((pId) => {
          if (pId.toString() !== userId) {
            this.emitToUser(pId.toString(), 'call:user-left', { userId, socketId })
          }
          
          const activeCount = activeSet ? activeSet.size : 0
          if (isOneOnOne || activeCount === 0) {
            this.emitToUser(pId.toString(), 'call:ended', { callId })
          }
        })
      }

      if (isOneOnOne || (activeSet && activeSet.size === 0)) {
        this.activeCallParticipants.delete(callId)
        this.ringingInvitees.delete(callId)
      }
    } catch (error) {
      console.error('[Socket] Lỗi xử lý rời phòng:', error)
    }
  }

  private async createAndEmitCallMessage(
    callIdStr: string,
    callStatus: 'completed' | 'missed' | 'rejected' | 'cancelled'
  ) {
    try {
      const call = await databaseService.calls.findOne({ _id: new ObjectId(callIdStr) })
      if (!call) return

      let duration = 0
      if (callStatus === 'completed' && call.startedAt) {
        duration = Math.floor((new Date().getTime() - call.startedAt.getTime()) / 1000)
      }

      const newMessage = new Message({
        conversationId: call.conversationId,
        senderId: call.callerId,
        type: 'call',
        content: 'Cuộc gọi ' + (call.type === 'video' ? 'Video' : 'Thoại'),
        callInfo: { status: callStatus, duration: duration, type: call.type }
      })

      const insertResult = await databaseService.messages.insertOne(newMessage)

      await databaseService.conversations.updateOne(
        { _id: call.conversationId },
        { $set: { last_message_id: insertResult.insertedId, updated_at: new Date() } }
      )

      const messages = await databaseService.messages
        .aggregate([
          { $match: { _id: insertResult.insertedId } },
          { $lookup: { from: 'users', localField: 'senderId', foreignField: '_id', as: 'senderInfo' } },
          { $unwind: '$senderInfo' },
          {
            $project: {
              _id: 1,
              conversationId: 1,
              type: 1,
              content: 1,
              callInfo: 1,
              createdAt: 1,
              sender: { _id: '$senderInfo._id', userName: '$senderInfo.userName', avatar: '$senderInfo.avatar' }
            }
          }
        ])
        .toArray()

      const populatedMessage = messages[0]

      const conversation = await databaseService.conversations.findOne({ _id: call.conversationId })
      if (conversation && conversation.participants) {
        conversation.participants.forEach((pId) => {
          this.emitToUser(pId.toString(), 'receive_message', populatedMessage)
        })
      }
    } catch (error) {
      console.error('Lỗi khi tạo tin nhắn cuộc gọi:', error)
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    this.io.to(userId).emit(event, data)
  }
}

const socketService = new SocketService()
export default socketService
