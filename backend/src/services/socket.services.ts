import { Server, Socket } from 'socket.io'
import http from 'http'

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

      // 1. Gắn user vào một "Room" mang tên chính ID của họ (Giải quyết vụ 1 user dùng nhiều Tab/Điện thoại)
      socket.join(userId)
      this.usersOnline.add(userId)

      // 2. Báo cho TẤT CẢ mọi người biết user này vừa online
      socket.broadcast.emit('user_status_change', { userId, isOnline: true })

      // 3. Xử lý ngắt kết nối (Offline)
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
