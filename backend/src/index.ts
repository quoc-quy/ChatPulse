import express from 'express'
import { config } from 'dotenv'
import { createServer } from 'http'
import cors from 'cors'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/errors.middlwares'
import friendsRouter from './routes/friends.routes'
import searchRouter from './routes/search.routes'
import chatRouter from './routes/conversations.routes'
import socketService from './services/socket.services'
import messageRouter from './routes/message.routes'
import authRoute from './routes/auth.routes'
import advancedSearchRouter from './routes/advancedSearch.routes'
import groupRouter from './routes/group.routes'
import callRouter from './routes/call.routes'
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

const socket = 4001

// Khởi tạo Socket Service
socketService.init(httpServer)

app.use(
  cors({
    origin: '*',
    credentials: true
  })
)

app.use(express.json()) //parse JSON to body
app.use('/users', usersRouter)
app.use('/friends', friendsRouter)
app.use('/search', searchRouter)
app.use('/conversations', chatRouter)
app.use('/messages', messageRouter)
app.use('/auth', authRoute)
app.use('/advanced-search', advancedSearchRouter)
app.use('/groups', groupRouter)
app.use('/calls', callRouter)

//default global error
app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

httpServer.listen(socket, () => {
  console.log(`Server đang chạy tại http://localhost:${socket}`)
})
