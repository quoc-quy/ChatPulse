import { Router } from 'express'
import { getMeController, getProfileController, loginController, logoutController, registerController } from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

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

/**
 * Get me
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

/**
 * Get user profile
 */
usersRouter.get('/:userName', wrapRequestHandler(getProfileController))



export default usersRouter
