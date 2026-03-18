import { Router } from 'express'
import {
  acceptFriendRequestController,
  cancelFriendRequestController,
  createFriendRequestController,
  declineFriendRequestController,
  getFriendListController,
  getReceivedFriendRequestsController,
  unfriendController,
  getSentFriendRequestsController,
  blockUserController,
  unblockUserController,
  getBlockedUsersController
} from '~/controllers/friends.controllers'
import { createFriendRequestValidator, unfriendValidator } from '~/middlewares/friends.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const friendsRouter = Router()

friendsRouter.post(
  '/request',
  accessTokenValidator,
  createFriendRequestValidator,
  wrapRequestHandler(createFriendRequestController)
)
friendsRouter.patch('/requests/:id/accept', accessTokenValidator, wrapRequestHandler(acceptFriendRequestController))
friendsRouter.get('/list', accessTokenValidator, wrapRequestHandler(getFriendListController))
friendsRouter.delete('/unfriend', accessTokenValidator, unfriendValidator, wrapRequestHandler(unfriendController))
friendsRouter.get('/requests/pending', accessTokenValidator, wrapRequestHandler(getSentFriendRequestsController))
friendsRouter.get('/requests/received', accessTokenValidator, wrapRequestHandler(getReceivedFriendRequestsController))
friendsRouter.delete('/requests/:id/decline', accessTokenValidator, wrapRequestHandler(declineFriendRequestController))
friendsRouter.delete('/requests/:id/cancel', accessTokenValidator, wrapRequestHandler(cancelFriendRequestController))

// ── Block / Unblock ──────────────────────────────────────────────────────────
friendsRouter.post('/block/:userId', accessTokenValidator, wrapRequestHandler(blockUserController))
friendsRouter.delete('/block/:userId', accessTokenValidator, wrapRequestHandler(unblockUserController))
friendsRouter.get('/blocked', accessTokenValidator, wrapRequestHandler(getBlockedUsersController))

export default friendsRouter
