import { Router } from 'express'
import {
  acceptFriendRequestController,
  cancelFriendRequestController,
  createFriendRequestController,
  declineFriendRequestController,
  getFriendListController,
  getReceivedFriendRequestsController,
  unfriendController
} from '~/controllers/friends.controllers'
import { createFriendRequestValidator, unfriendValidator } from '~/middlewares/friends.middlewares'
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

friendsRouter.delete('/unfriend', accessTokenValidator, unfriendValidator, wrapRequestHandler(unfriendController))
friendsRouter.delete('/requests/:id/decline', accessTokenValidator, wrapRequestHandler(declineFriendRequestController))

// Hủy lời mời đã gửi
friendsRouter.delete('/requests/:id/cancel', accessTokenValidator, wrapRequestHandler(cancelFriendRequestController))

export default friendsRouter
