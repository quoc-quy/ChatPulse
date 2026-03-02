import { Router } from 'express'
import { loginController, logoutController, registerController } from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const authRoute = Router()

/**
 * Login account
 * Body: {email: string, password: string}
 */
authRoute.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Register a new user
 * Body: {email: string, password: string, confirm_password: string, userName: string, date_of_birth: ISOString, phone: number}
 */
authRoute.post('/register', registerValidator, wrapRequestHandler(registerController))

/**
 * Logout
 * Header: {Authorization: Bearer <access_token>}
 * body: {refresh_token: string}
 */
authRoute.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))

export default authRoute
