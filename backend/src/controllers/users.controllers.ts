import { NextFunction, Request, Response } from 'express'
export const loginController = (req: Request, res: Response) => {
  console.log(req.body)
  res.json({
    message: 'Login successfully'
  })
}
