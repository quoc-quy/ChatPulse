import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { ObjectId, WithId } from 'mongodb'
import { getProfileReqBody, RegisterReqBody, TokenPayload } from '~/models/requests/users.requests'
import User from '~/models/schemas/user.schema'
import userService from '~/services/user.services'
export const loginController = async (req: Request, res: Response) => {
  const user = req.user as User
  const user_id = user._id as ObjectId
  const result = await userService.login(user_id.toString())

  return res.json({
    message: 'Login successfully',
    result
  })
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
