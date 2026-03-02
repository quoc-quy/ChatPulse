import { Router } from 'express'
import {
  changePasswordController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  registerController,
  updateMeController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
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
 * Get user profile
 */
usersRouter.get('/:userName', wrapRequestHandler(getProfileController))

export default usersRouter
