import { checkSchema } from 'express-validator'
import { validate } from '~/utils/validation'

export const searchValidator = validate(
  checkSchema({
    userName: {
      optional: true,
      isString: {
        errorMessage: 'Username phải là chuỗi String'
      }
    },
    phone: {
      optional: true,
      isString: true,
      isLength: {
        options: {
          min: 10,
          max: 10
        },
        errorMessage: 'Số điện thoại phải đủ 10 ký tự số'
      }
    }
  })
)

export const paginationValidator = validate(
  checkSchema({
    limit: {
      isNumeric: true,
      custom: {
        options: async (value, { req }) => {
          const number = Number(value)
          if (number < 0 || number > 50) {
            throw new Error('Limit phải lớn hơn 0 hoặc nhỏ hơn 50')
          }
          return true
        }
      }
    },
    page: {
      isNumeric: true,
      custom: {
        options: async (value, { req }) => {
          const number = Number(value)
          if (number < 0) {
            throw new Error('Page phải lớn hơn 0')
          }
          return true
        }
      }
    }
  })
)
