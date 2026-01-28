import { Router } from 'express'
import {
  acceptFriendRequestController,
  createFriendRequestController,
  getFriendListController,
  getReceivedFriendRequestsController
} from '~/controllers/friends.controllers'
import { createFriendRequestValidator } from '~/middlewares/friends.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const friendsRouter = Router()

/**
 * Gửi lời mời kết bạn
 * Path: POST /friends/request
 */
friendsRouter.post(
  '/request',
  accessTokenValidator,
  createFriendRequestValidator,
  wrapRequestHandler(createFriendRequestController)
)

/**
 * Chấp nhận lời mời kết bạn
 * Path: POST /friends/accept
 */
friendsRouter.post('/accept', accessTokenValidator, wrapRequestHandler(acceptFriendRequestController))

/**
 * Lấy danh sách bạn bè
 * Path: GET /friends/list
 */
friendsRouter.get('/list', accessTokenValidator, wrapRequestHandler(getFriendListController))

/**
 * Lấy danh sách lời mời đã nhận
 * Path: GET /friends/requests/received
 */
friendsRouter.get('/requests/received', accessTokenValidator, wrapRequestHandler(getReceivedFriendRequestsController))

export default friendsRouter
