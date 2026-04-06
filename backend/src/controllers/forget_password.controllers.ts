import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import forgotPasswordService from '../services/forget_password.services'

interface ForgotPasswordReqBody {
  email: string
}

interface ResetPasswordReqBody {
  email: string
  otp: string
  password: string
  confirm_password: string
}

/**
 * POST /auth/forgot-password
 * Body: { email }
 */
export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { email } = req.body
  const result = await forgotPasswordService.forgotPassword(email)
  return res.json(result)
}

/**
 * POST /auth/reset-password
 * Body: { email, otp, password, confirm_password }
 */
export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { email, otp, password } = req.body
  const result = await forgotPasswordService.resetPassword(email, otp, password)
  return res.json(result)
}
