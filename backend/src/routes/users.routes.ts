import { Router } from 'express'
import { loginController, logoutController, registerController } from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import {
  acceptFriendRequestController,
  createFriendRequestController,
  getFriendListController,
  getReceivedFriendRequestsController
} from '~/controllers/friends.controllers'
const usersRouter = Router()

/**
 * Login account
 * Body: {email: string, password: string}
 */
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Register a new user
 * Body: {email: string, password: string, confirm_password: string, userName: string, date_of_birth: ISOString, phone: number}
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Logout
 * Header: {Authorization: Bearer <access_token>}
 * body: {refresh_token: string}
 */
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

usersRouter.post('/friends/request', accessTokenValidator, wrapRequestHandler(createFriendRequestController))
usersRouter.post('/friends/accept', accessTokenValidator, wrapRequestHandler(acceptFriendRequestController))
usersRouter.get('/friends/list', accessTokenValidator, wrapRequestHandler(getFriendListController))
usersRouter.get('/friends/requests/received', accessTokenValidator, wrapRequestHandler(getReceivedFriendRequestsController))
export default usersRouter
