import { Router } from 'express'
import {
  forgotPasswordController,
  loginController,
  forgotPasswordMobileController,
  logoutController,
  registerController,
  resetPasswordController,
  resetPasswordMobileController,
  verifyForgotPasswordController,
  emailVerifyValidator
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  emailVerifyTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  verifyForgotPasswordValidator
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

/**
 * Forgot Password — Bước 1: Gửi OTP về email
 * POST /auth/forgot-password
 * Body: { email: string }
 */
authRoute.post('/forgot-password', forgotPasswordValidator, wrapRequestHandler(forgotPasswordController))

/**
 * Description: verify link in email to reset password
 * body: {forgot-password-token: string}
 */
authRoute.post(
  '/verify-forgot-password',
  verifyForgotPasswordValidator,
  wrapRequestHandler(verifyForgotPasswordController)
)

/**
 * Description: reset password
 * body: {forgot-password-token: string, password: string, confirm_password: string}
 */
authRoute.post('/reset-password', resetPasswordValidator, wrapRequestHandler(resetPasswordController))

/**
 * Quên mật khẩu Mobile (Bước 1: Gửi OTP)
 * POST /auth/forgot-password-mobile
 */
authRoute.post('/forgot-password-mobile', wrapRequestHandler(forgotPasswordMobileController))

/**
 * Description: verify link in email to verify email
 * body: {email-verify-token: string}
 */
authRoute.post('/verify-email', emailVerifyTokenValidator, wrapRequestHandler(emailVerifyValidator))

export default authRoute
