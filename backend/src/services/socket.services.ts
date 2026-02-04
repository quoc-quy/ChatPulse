// src/services/socket.services.ts
import { Server as ServerSocket } from 'socket.io'
import { Server as HttpServer } from 'http'

class SocketService {
  private io: ServerSocket | null = null
  // Map để lưu trữ: key là user_id, value là socket_id
  public usersOnline = new Map<string, string>()

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
        this.usersOnline.set(user_id, socket.id)
        console.log(`User ${user_id} connected with socket ${socket.id}`)
      }

      socket.on('disconnect', () => {
        this.usersOnline.delete(user_id)
        console.log(`User ${user_id} disconnected`)
      })
    })
  }

  // Hàm helper để gửi event đến một user cụ thể
  emitToUser(user_id: string, event: string, data: any) {
    const socketId = this.usersOnline.get(user_id)
    if (socketId && this.io) {
      this.io.to(socketId).emit(event, data)
    }
  }
}

const socketService = new SocketService()
export default socketService
