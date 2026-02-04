import express from 'express'
import { config } from 'dotenv'
import { createServer } from 'http'
import cors from 'cors'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/errors.middlwares'
import friendsRouter from './routes/friends.routes'
import searchRouter from './routes/search.routes'
import chatRouter from './routes/chat.routes'
import socketService from './services/socket.services'
config()
// Kết nối cơ sở dữ liệu và khởi tạo Index
databaseService.connect().then(async () => {
  // Khởi tạo index cho bảng lời mời kết bạn
  await databaseService.indexFriendRequests()
  // Khởi tạo index cho bảng quan hệ bạn bè chính thức
  await databaseService.indexFriends()
  await databaseService.indexUser()
  await databaseService.cleanupDuplicateFriends()
  await databaseService.indexConversations()
})
const app = express()
const httpServer = createServer(app)
const port = process.env.PORT

// Khởi tạo Socket Service
socketService.init(httpServer)

app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)

app.use(express.json()) //parse JSON to body
app.use('/users', usersRouter)
app.use('/friends', friendsRouter)
app.use('/search', searchRouter)
app.use('/chat', chatRouter)

//default global error
app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

httpServer.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`)
})
