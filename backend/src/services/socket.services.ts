import { Server, Socket } from 'socket.io'
import http from 'http'
import Call from '~/models/schemas/call.schema'
import { ObjectId } from 'mongodb'
import { CallStatus, CallType } from '~/constants/callStataus'
import databaseService from './database.services'

class SocketService {
  public io!: Server
  public usersOnline: Set<string> = new Set() // Dùng Set để lưu danh sách online dễ dàng

  init(httpServer: http.Server) {
    this.io = new Server(httpServer, {
      cors: { origin: '*' } // Cho phép frontend kết nối
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

      // Cập nhật thêm try-catch cho call:join để chống sập nếu gửi sai ID
      socket.on('call:join', async (data: { callId: string; conversationId: string }) => {
        try {
          const { callId, conversationId } = data
          await databaseService.calls.updateOne(
            { _id: new ObjectId(callId) },
            { $addToSet: { participants: new ObjectId(userId) }, $set: { status: 'ONGOING' } }
          )
          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
          if (conversation && conversation.participants) {
            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:user-joined', { userId: userId, socketId: socket.id })
              }
            })
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 2. Chấp nhận và Tham gia cuộc gọi
      socket.on('call:join', async (data: { callId: string; conversationId: string }) => {
        const { callId, conversationId } = data

        await databaseService.calls.updateOne(
          { _id: new ObjectId(callId) },
          {
            $addToSet: { participants: new ObjectId(userId) },
            $set: { status: CallStatus.ONGOING }
          }
        )

        const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(conversationId) })
        if (conversation && conversation.participants) {
          conversation.participants.forEach((pId) => {
            if (pId.toString() !== userId) {
              this.emitToUser(pId.toString(), 'call:user-joined', {
                userId: userId,
                socketId: socket.id
              })
            }
          })
        }
      })

      // 3. Truyền nhận tín hiệu WebRTC (Offer, Answer, ICE)
      socket.on('call:signal', (data: { targetSocketId?: string; targetUserId?: string; signal: any }) => {
        if (data.targetSocketId) {
          this.io
            .to(data.targetSocketId)
            .emit('call:signal', { callerId: userId, callerSocketId: socket.id, signal: data.signal })
        }
      })

      socket.on('call:reject', async (data: { callId: string; conversationId: string }) => {
        try {
          await databaseService.calls.updateOne({ _id: new ObjectId(data.callId) }, { $set: { status: 'REJECTED' } })
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

      socket.on('call:leave', async (data: { callId: string; conversationId: string }) => {
        try {
          const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(data.conversationId) })
          if (conversation && conversation.participants) {
            // Cực kỳ quan trọng: Nếu đây là gọi 1-1, khi 1 người thoát thì buộc người kia cũng phải kết thúc
            const isOneOnOne = conversation.participants.length <= 2

            conversation.participants.forEach((pId) => {
              if (pId.toString() !== userId) {
                this.emitToUser(pId.toString(), 'call:user-left', { userId: userId, socketId: socket.id })
                // Phát sự kiện 'call:ended' để đóng modal/tắt phòng của người còn lại (Fix bug 2 & 3)
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

      socket.on('disconnect', async () => {
        // Kiểm tra xem user này còn tab/thiết bị nào khác đang kết nối không?
        const sockets = await this.io.in(userId).fetchSockets()

        if (sockets.length === 0) {
          // Nếu không còn tab nào -> Chắc chắn đã Offline
          this.usersOnline.delete(userId)

          // Phát sự kiện offline cho TẤT CẢ mọi người kèm thời gian lastActive
          this.io.emit('user_status_change', {
            userId,
            isOnline: false,
            lastActiveAt: new Date().toISOString()
          })
        }
      })
    })
  }

  // Hàm bắn tin nhắn chuẩn xác vào Room của User
  emitToUser(userId: string, event: string, data: any) {
    this.io.to(userId).emit(event, data)
  }
}

const socketService = new SocketService()
export default socketService
