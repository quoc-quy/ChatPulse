import { Router } from 'express'
import { forgotPasswordController, loginController, logoutController, registerController } from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import { forgotPasswordController, resetPasswordController } from '../controllers/forget_password.controllers'
import { validate } from '../utils/validation'
import { checkSchema } from 'express-validator'
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
authRoute.post(
  '/forgot-password',
  validate(
    checkSchema(
      {
        email: {
          notEmpty: { errorMessage: 'Email không được để trống' },
          isEmail: { errorMessage: 'Email không hợp lệ' },
          normalizeEmail: true
        }
      },
      ['body']
    )
  ),
  wrapRequestHandler(forgotPasswordController)
)
/**
 * Reset Password — Bước 2: Xác thực OTP + đặt mật khẩu mới
 * POST /auth/reset-password
 * Body: { email: string, otp: string, password: string, confirm_password: string }
 */
authRoute.post(
  '/reset-password',
  validate(
    checkSchema(
      {
        email: {
          notEmpty: { errorMessage: 'Email không được để trống' },
          isEmail: { errorMessage: 'Email không hợp lệ' }
        },
        otp: {
          notEmpty: { errorMessage: 'OTP không được để trống' },
          isLength: { options: { min: 6, max: 6 }, errorMessage: 'OTP phải là 6 chữ số' },
          isNumeric: { errorMessage: 'OTP chỉ gồm chữ số' }
        },
        password: {
          notEmpty: { errorMessage: 'Mật khẩu không được để trống' },
          isLength: { options: { min: 6 }, errorMessage: 'Mật khẩu phải ít nhất 6 ký tự' }
        },
        confirm_password: {
          notEmpty: { errorMessage: 'Xác nhận mật khẩu không được để trống' },
          custom: {
            options: (value, { req }) => {
              if (value !== req.body.password) throw new Error('Mật khẩu xác nhận không khớp')
              return true
            }
          }
        }
      },
      ['body']
    )
  ),
  wrapRequestHandler(resetPasswordController)
)
export default authRoute
