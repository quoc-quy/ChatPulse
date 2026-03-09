import { Server, Socket } from 'socket.io'
import http from 'http'
import Call from '~/models/schemas/call.schema'
import Message from '~/models/schemas/message.schema' // Bổ sung import Message
import { ObjectId } from 'mongodb'
import { CallStatus, CallType } from '~/constants/callStataus'
import databaseService from './database.services'

class SocketService {
  public io!: Server
  public usersOnline: Set<string> = new Set()

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

          // Tính thời gian từ lúc bắt đầu trò chuyện thật sự
          const call = await databaseService.calls.findOne({ _id: new ObjectId(callId) })
          if (call && call.status === 'INITIATED') {
            await databaseService.calls.updateOne(
              { _id: new ObjectId(callId) },
              { $addToSet: { participants: new ObjectId(userId) }, $set: { status: 'ONGOING', startedAt: new Date() } }
            )
          } else {
            await databaseService.calls.updateOne(
              { _id: new ObjectId(callId) },
              { $addToSet: { participants: new ObjectId(userId) } }
            )
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
            this.io.to(data.targetSocketId).emit('call:signal', {
              callerId: userId,
              callerSocketId: socket.id,
              userName,
              signal: data.signal
            })
          }
        } catch (error) {
          console.error(error)
        }
      })

      // 4. Từ chối cuộc gọi
      socket.on('call:reject', async (data: { callId: string; conversationId: string }) => {
        try {
          const call = await databaseService.calls.findOne({ _id: new ObjectId(data.callId) })
          if (call && !['ENDED', 'REJECTED', 'CANCELLED'].includes(call.status)) {
            await databaseService.calls.updateOne(
              { _id: new ObjectId(data.callId) },
              { $set: { status: 'REJECTED', endedAt: new Date() } }
            )

            // TẠO TIN NHẮN TỪ CHỐI
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
          const call = await databaseService.calls.findOne({ _id: new ObjectId(data.callId) })

          if (call && !['ENDED', 'REJECTED', 'CANCELLED'].includes(call.status)) {
            let newStatus = ''
            if (call.status === 'INITIATED')
              newStatus = 'CANCELLED' // Người gọi tắt khi chưa ai nghe
            else if (call.status === 'ONGOING') newStatus = 'ENDED' // Kết thúc cuộc gọi bình thường

            if (newStatus) {
              await databaseService.calls.updateOne(
                { _id: call._id },
                { $set: { status: newStatus, endedAt: new Date() } }
              )

              // TẠO TIN NHẮN KẾT THÚC HOẶC HỦY
              await this.createAndEmitCallMessage(data.callId, newStatus === 'ENDED' ? 'completed' : 'cancelled')
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

      // 6. Cập nhật Media
      socket.on(
        'call:toggle-media',
        async (data: { callId: string; conversationId: string; isMicOn: boolean; isCameraOn: boolean }) => {
          try {
            const conversation = await databaseService.conversations.findOne({ _id: new ObjectId(data.conversationId) })
            if (conversation && conversation.participants) {
              conversation.participants.forEach((pId) => {
                if (pId.toString() !== userId) {
                  this.emitToUser(pId.toString(), 'call:media-toggled', {
                    userId: userId,
                    socketId: socket.id,
                    isMicOn: data.isMicOn,
                    isCameraOn: data.isCameraOn
                  })
                }
              })
            }
          } catch (error) {
            console.error('Lỗi khi đồng bộ trạng thái media:', error)
          }
        }
      )

      socket.on('disconnect', async () => {
        const sockets = await this.io.in(userId).fetchSockets()
        if (sockets.length === 0) {
          this.usersOnline.delete(userId)
          this.io.emit('user_status_change', { userId, isOnline: false, lastActiveAt: new Date().toISOString() })
        }
      })
    })
  }

  // --- HÀM TẠO VÀ PHÁT TIN NHẮN CUỘC GỌI ---
  private async createAndEmitCallMessage(
    callIdStr: string,
    callStatus: 'completed' | 'missed' | 'rejected' | 'cancelled'
  ) {
    try {
      const call = await databaseService.calls.findOne({ _id: new ObjectId(callIdStr) })
      if (!call) return

      // Tính thời lượng bằng giây
      let duration = 0
      if (callStatus === 'completed' && call.startedAt) {
        duration = Math.floor((new Date().getTime() - call.startedAt.getTime()) / 1000)
      }

      // Tạo tin nhắn System Call
      const newMessage = new Message({
        conversationId: call.conversationId,
        senderId: call.callerId, // Người gọi là người gửi tin nhắn này
        type: 'call',
        content: 'Cuộc gọi ' + (call.type === 'video' ? 'Video' : 'Thoại'),
        callInfo: {
          status: callStatus,
          duration: duration,
          type: call.type
        }
      })

      const insertResult = await databaseService.messages.insertOne(newMessage)

      // Cập nhật cuộc hội thoại lên trên cùng
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

      // Bắn qua Socket cho tất cả thành viên
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
