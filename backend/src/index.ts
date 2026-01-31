import express from 'express'
import { config } from 'dotenv'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/errors.middlwares'
import friendsRouter from './routes/friends.routes'
import searchRouter from './routes/search.routes'
config()
// Kết nối cơ sở dữ liệu và khởi tạo Index
databaseService.connect().then(()=>{
  // Khởi tạo index cho bảng lời mời kết bạn
  databaseService.indexFriendRequests()
  // Khởi tạo index cho bảng quan hệ bạn bè chính thức
  databaseService.indexFriends()
})
const app = express()
const port = process.env.PORT

app.use(express.json()) //parse JSON to body
app.use('/users', usersRouter)
app.use('/friends', friendsRouter)
app.use('/search', searchRouter)

//default global error
app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
