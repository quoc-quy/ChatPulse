import { NextFunction, Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'

export const defaultErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('=== LỖI HỆ THỐNG BACKEND ===')
  console.error(err) // Log lỗi gốc ra terminal để xem bị lỗi gì ở hàm gửi mail
  console.error('============================')

  // Trả về mã lỗi có status cụ thể hoặc mặc định là 500
  const status = err.status || httpStatus.INTERNAL_SERVER_ERROR

  return res.status(status).json({
    message: err.message || 'Internal Server Error',
    errorInfo: process.env.NODE_ENV === 'development' ? err : undefined
  })
}
