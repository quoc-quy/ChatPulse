import { Router } from 'express'
import {
  blockUserController,
  changePasswordController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  registerController,
  searchUserController,
  unBlockUserController,
  updateMeController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  blockUserValidator,
  changePasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  updateMeValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

/**
 * Get me
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

/**
 * Update profile
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.patch('/update-profile', accessTokenValidator, updateMeValidator, wrapRequestHandler(updateMeController))

/**
 * Change password
 * Header: {Authorization: Bearer <access_token>}
 * Body: {old_password: string, password: string, confirm_password: string}
 */
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
)

/**
 * Block user
 * Header: {Authorization: Bearer <access_token>}
 * Body: {blocked_user_id}
 */
usersRouter.post('/block', accessTokenValidator, blockUserValidator, wrapRequestHandler(blockUserController))

/**
 * Unblock User
 * Header: {Authorization: Bearer <access_token>}
 * Params: {user_id}
 */
usersRouter.delete(
  '/unblock/:user_id',
  accessTokenValidator,
  unBlockUserController,
  wrapRequestHandler(unBlockUserController)
)


/**
 * Register
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Login
 */
usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Logout
 */
usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))
/**
 * Search user 
 */
usersRouter.get(
  '/search',
  accessTokenValidator,
  wrapRequestHandler(searchUserController)
)
/**
 * Get user profile
 */
usersRouter.get('/:userName', wrapRequestHandler(getProfileController))

export default usersRouter
