import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId, WithId } from 'mongodb'
import {
  BlockUserReqBody,
  ChangePasswordReqBody,
  ForgotPasswordReqBody,
  getProfileReqBody,
  ResetPasswordReqBody,
  RegisterReqBody,
  TokenPayload,
  UnBlockUserReqBody,
  UpdateMeReqBody
} from '~/models/requests/users.requests'
import User from '~/models/schemas/user.schema'
import userService from '~/services/user.services'
import { uploadAvatarToS3 } from '~/utils/s3'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import { config } from 'dotenv'
import forgotPasswordService from '~/services/forget_password.services' // Đảm bảo đúng tên file .ts của bạn

config()

export const loginController = async (req: Request, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  const result = await userService.login(user_id.toString())

  return res.json({
    message: 'Login successfully',
    result
  })
}

export const oauthController = async (req: Request, res: Response) => {
  const { code } = req.query
  const result = await userService.oauth(code as string)

  const urlRedirect = `${process.env.CLIENT_REDIRECT_CALLBACK}?access_token=${
    result.access_token
  }&refresh_token=${result.refresh_token}&newUser=${result.newUser}`
  return res.redirect(urlRedirect)
}

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  const result = await userService.register(req.body)
  return res.json({
    message: 'Register successfully',
    result
  })
}

export const logoutController = async (req: Request, res: Response) => {
  const { refresh_token } = req.body
  const result = await userService.logout(refresh_token)

  return res.json(result)
}

export const getProfileController = async (req: Request<getProfileReqBody>, res: Response) => {
  const { userName } = req.params
  const user = await userService.getProfile(userName)

  return res.json({
    message: 'Lấy thông tin người dùng thành công',
    result: user
  })
}

export const getMeController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const user = await userService.getMe(user_id)

  return res.json({
    message: 'Lấy thông tin người dùng thành công',
    user
  })
}

export const updateMeController = async (req: Request<ParamsDictionary, any, UpdateMeReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { body } = req

  const user = await userService.updateMe(user_id, body)

  return res.json({
    message: 'Cập nhật thông tin người dùng thành công',
    user
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { body } = req
  await userService.changePassword(user_id, body)

  return res.json({
    message: 'Đổi mật khẩu thành công'
  })
}

export const blockUserController = async (
  req: Request<ParamsDictionary, any, BlockUserReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { blocked_user_id } = req.body
  const result = await userService.blockUser(user_id, blocked_user_id)

  return res.json(result)
}

export const unBlockUserController = async (req: Request<UnBlockUserReqBody>, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { user_id: blocked_user_id } = req.params
  const result = await userService.unBlockUser(user_id, blocked_user_id)

  return res.json(result)
}

export const getListBlockUserController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await userService.getListBlockUser(user_id)

  return res.json(result)
}

export const searchUserController = async (req: Request, res: Response) => {
  const q = (req.query.q as string) || ''
  const { user_id } = req.decoded_authorization as TokenPayload

  // Nếu không có từ khóa
  if (!q.trim()) {
    return res.json({
      message: 'Vui lòng nhập từ khóa tìm kiếm',
      result: { users: [] }
    })
  }

  const result = await userService.searchUser(q, user_id)

  // KIỂM TRA TẠI ĐÂY: Nếu mảng users rỗng (có thể do không khớp hoặc đã bị block)
  if (result.users.length === 0) {
    return res.json({
      message: 'Không tìm thấy người dùng', // Thông báo đúng ý em muốn
      result: { users: [] }
    })
  }
  // Nếu tìm thấy
  return res.json({
    message: 'Tìm kiếm người dùng thành công',
    result
  })
}

export const uploadAvatarController = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ErrorWithStatus({
      message: 'Không tìm thấy file avatar',
      status: httpStatus.BAD_REQUEST
    })
  }

  const { user_id } = req.decoded_authorization as TokenPayload
  const avatarUrl = await uploadAvatarToS3(req.file)
  const user = await userService.updateMe(user_id, { avatar: avatarUrl })

  return res.json({
    message: 'Upload avatar thành công',
    result: {
      avatar: avatarUrl,
      user
    }
  })
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { _id, email } = req.user as User

  const result = await userService.forgotPassword((_id as ObjectId).toString(), email)

  return res.json(result)
}

export const verifyForgotPasswordController = async (req: Request, res: Response) => {
  return res.json({
    message: 'Verify forgot password successfully'
  })
}

export const resetPasswordController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_forgot_password_token as TokenPayload
  const { password } = req.body

  const result = await userService.resetPassword(user_id, password)

  return res.json(result)
}

/**
 * Dành cho Mobile: POST /auth/forgot-password-mobile
 * Sử dụng mã OTP gửi qua email
 */
export const forgotPasswordMobileController = async (
  req: Request<ParamsDictionary, any, ForgotPasswordReqBody>,
  res: Response
) => {
  const { email } = req.body //
  // Gọi trực tiếp service xử lý mã OTP
  const result = await forgotPasswordService.forgotPassword(email)
  return res.json(result)
}

/**
 * Dành cho Mobile: POST /auth/reset-password-mobile
 * Xác thực OTP và đặt mật khẩu mới
 */
export const resetPasswordMobileController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response
) => {
  const { email, otp, password } = req.body //
  // Gọi service xác thực mã số và cập nhật DB
  const result = await forgotPasswordService.resetPassword(email, otp, password)
  return res.json(result)
}
