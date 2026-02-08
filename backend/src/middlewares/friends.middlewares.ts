// src/middlewares/friends.middlewares.ts
import { checkSchema } from 'express-validator'
import { ObjectId } from 'mongodb'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import databaseService from '~/services/database.services'
import { validate } from '~/utils/validation'

export const createFriendRequestValidator = validate(
  checkSchema(
    {
      receiver_id: {
        notEmpty: { errorMessage: 'receiver_id không được để trống' },
        custom: {
          options: async (value, { req }) => {
            // 1. Kiểm tra định dạng ObjectId
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'receiver_id không hợp lệ',
                status: httpStatus.UNPROCESSABLE_ENTITY
              })
            }
            // 2. Không được tự kết bạn với chính mình
            const { user_id } = req.decoded_authorization
            if (value === user_id) {
              throw new ErrorWithStatus({
                message: 'Bạn không thể gửi lời mời kết bạn cho chính mình',
                status: httpStatus.UNPROCESSABLE_ENTITY
              })
            }
            // 3. Kiểm tra user nhận có tồn tại không
            const receiver = await databaseService.users.findOne({ _id: new ObjectId(value) })
            if (!receiver) {
              throw new ErrorWithStatus({
                message: 'Người dùng không tồn tại',
                status: httpStatus.NOT_FOUND //404
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const unfriendValidator = validate(
  checkSchema(
    {
      friend_id: {
        notEmpty: { errorMessage: 'friend_id không được để trống' },
        custom: {
          options: async (value, { req }) => {
            // 1. Kiểm tra định dạng ObjectId
            if (!ObjectId.isValid(value)) {
              throw new ErrorWithStatus({
                message: 'friend_id không hợp lệ',
                status: httpStatus.UNPROCESSABLE_ENTITY
              })
            }
            // 2. Không được tự hủy kết bạn với chính mình
            const { user_id } = req.decoded_authorization
            if (value === user_id) {
              throw new ErrorWithStatus({
                message: 'Bạn không thể hủy kết bạn với chính mình',
                status: httpStatus.UNPROCESSABLE_ENTITY
              })
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
