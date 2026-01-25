import { NextFunction, Request, Response } from 'express'
import User from '~/models/schemas/user.schema'
import databaseService from '~/services/database.services'
import userService from '~/services/user.services'
export const loginController = (req: Request, res: Response) => {
  res.json({
    message: 'Login successfully'
  })
}

export const registerController = async (req: Request, res: Response) => {
  const { email, password, userName, date_of_birth, phone } = req.body
  try {
    const result = await userService.register({ email, date_of_birth, password, phone, userName })
    res.json({
      message: 'Register successfully',
      result
    })
  } catch (error) {
    res.status(400).json({
      message: 'Register failed'
    })
  }
}
