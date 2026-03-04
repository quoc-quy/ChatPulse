import { Server as ServerSocket } from 'socket.io'
import { Server as HttpServer } from 'http'

class SocketService {
  private io: ServerSocket | null = null
  // FIX: Dùng Set để quản lý nhiều socketId trên cùng 1 user (khi mở nhiều tab/component)
  public usersOnline = new Map<string, Set<string>>()

  init(httpServer: HttpServer) {
    this.io = new ServerSocket(httpServer, {
      cors: {
        origin: 'http://localhost:5173',
        credentials: true
      }
    })

    this.io.on('connection', (socket) => {
      const user_id = socket.handshake.auth.user_id as string
      if (user_id) {
        // Nếu user này chưa từng có kết nối nào -> Bắn thông báo Online cho mọi người
        if (!this.usersOnline.has(user_id)) {
          this.usersOnline.set(user_id, new Set())
          this.io?.emit('user_status_change', { userId: user_id, isOnline: true })
        }

        // Thêm socket mới vào danh sách
        this.usersOnline.get(user_id)?.add(socket.id)
        console.log(`User ${user_id} connected with socket ${socket.id}`)
      }

      socket.on('disconnect', () => {
        if (user_id && this.usersOnline.has(user_id)) {
          const userSockets = this.usersOnline.get(user_id)
          userSockets?.delete(socket.id) // Xóa kết nối vừa đứt

          // Nếu user không còn cái tab/kết nối nào -> Thực sự Offline
          if (userSockets?.size === 0) {
            this.usersOnline.delete(user_id)
            console.log(`User ${user_id} disconnected completely`)

            // Bắn thông báo Offline
            this.io?.emit('user_status_change', {
              userId: user_id,
              isOnline: false,
              lastActiveAt: new Date()
            })
          }
        }
      })
    })
  }

  // Hàm helper để gửi event đến một user cụ thể
  emitToUser(user_id: string, event: string, data: any) {
    const userSockets = this.usersOnline.get(user_id)
    if (userSockets && this.io) {
      // Gửi event đến TẤT CẢ các màn hình/tab mà user đó đang mở
      userSockets.forEach((socketId) => {
        this.io!.to(socketId).emit(event, data)
      })
    }
  }
}

const socketService = new SocketService()
export default socketService
