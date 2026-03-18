import { Server, Socket } from 'socket.io'
import http from 'http'
import Call from '~/models/schemas/call.schema'
import Message from '~/models/schemas/message.schema'
import { ObjectId } from 'mongodb'
import databaseService from './database.services'
import messageService from './message.services'

class SocketService {
  public io!: Server
  public usersOnline: Set<string> = new Set()

  // FIX 1: Bộ lưu trữ đếm thời gian chờ cuộc gọi (Timeout 60s)
  private callTimeouts: Map<string, NodeJS.Timeout> = new Map()

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
            type: type,
            status: 'INITIATED',
            participants: [new ObjectId(userId)],
            startedAt: new Date()
          })
          const result = await databaseService.calls.insertOne(newCall)
          const realCallId = result.insertedId.toString()

          // --- BẮT ĐẦU ĐẾM NGƯỢC 60 GIÂY ---
          const timeoutId = setTimeout(async () => {
            const checkCall = await databaseService.calls.findOne({ _id: new ObjectId(realCallId) })
            // Sau 60s nếu vẫn chưa ai nghe máy (vẫn là INITIATED)
            if (checkCall && checkCall.status === 'INITIATED') {
              await databaseService.calls.updateOne(
                { _id: checkCall._id },
                { $set: { status: 'MISSED', endedAt: new Date() } }
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
          }, 60000) // 60.000 ms = 60 giây
          this.callTimeouts.set(realCallId, timeoutId)
          // ---------------------------------

          const caller = await databaseService.users.findOne({ _id: new ObjectId(userId) })
          const callerName = caller?.userName || caller?.fullName || 'Người dùng'
          const callerAvatar = caller?.avatar || ''

          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
          if (conversation && conversation.participants) {
            conversation.participants.forEach((participantId) => {
              if (participantId.toString() !== userId) {
                this.emitToUser(participantId.toString(), 'call:incoming', {
                  callId: realCallId,
                  conversationId,
                  callerId: userId,
                  callerName,
                  callerAvatar,
                  type
                })
              }
            })
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
          const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })

          if (call) {
            // FIX 2: Xác định người join là NGƯỜI GỌI hay NGƯỜI NGHE
            const isCaller = call.callerId.toString() === userId

            // CHỈ KHI NGƯỜI NGHE JOIN VÀO THÌ CUỘC GỌI MỚI CHUYỂN SANG ONGOING (Đang diễn ra)
            if (!isCaller && call.status === 'INITIATED') {
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
                  $set: { status: 'ONGOING', startedAt: new Date() }
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

      // 4. Từ chối cuộc gọi
      socket.on('call:reject', async (data: { callId: string; conversationId: string }) => {
        try {
          // Hủy bỏ đếm ngược 60s
          const timeoutId = this.callTimeouts.get(data.callId)
          if (timeoutId) {
            clearTimeout(timeoutId)
            this.callTimeouts.delete(data.callId)
          }

          const call = await databaseService.calls.findOne({ _id: new ObjectId(data.callId) })
          if (call && !['ENDED', 'REJECTED', 'CANCELLED', 'MISSED'].includes(call.status)) {
            await databaseService.calls.updateOne(
              { _id: new ObjectId(data.callId) },
              { $set: { status: 'REJECTED', endedAt: new Date() } }
            )
            await this.createAndEmitCallMessage(data.callId, 'rejected')
          }

          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(data.conversationId) })
          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) this.emitToUser(pId.toString(), 'call:rejected', { callId: data.callId })
            })
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 5. Rời cuộc gọi / Hủy gọi
      socket.on('call:leave', async (data: { callId: string; conversationId: string }) => {
        try {
          // Hủy bỏ đếm ngược 60s
          const timeoutId = this.callTimeouts.get(data.callId)
          if (timeoutId) {
            clearTimeout(timeoutId)
            this.callTimeouts.delete(data.callId)
          }

          const call = await databaseService.calls.findOne({ _id: new ObjectId(data.callId) })

          if (call && !['ENDED', 'REJECTED', 'CANCELLED', 'MISSED'].includes(call.status)) {
            let newStatus = ''
            let messageType: 'completed' | 'cancelled' | 'missed' = 'completed'

            if (call.status === 'INITIATED') {
              newStatus = 'CANCELLED' // Người gọi tắt trước khi có người nghe
              messageType = 'cancelled'
            } else if (call.status === 'ONGOING') {
              newStatus = 'ENDED'
              messageType = 'completed'
            }

            if (newStatus) {
              await databaseService.calls.updateOne(
                { _id: call._id },
                { $set: { status: newStatus, endedAt: new Date() } }
              )
              await this.createAndEmitCallMessage(data.callId, messageType)
            }
          }

          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(data.conversationId) })
          if (conversation && conversation.participants) {
            const isOneOnOne = conversation.participants.length <= 2
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:user-left', { userId: userId, socketId: socket.id })
                if (isOneOnOne) {
                  this.emitToUser(pId.toString(), 'call:ended', { callId: data.callId })
                }
              }
            })
          }
        } catch (error) {
          console.error(error)
        }
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
