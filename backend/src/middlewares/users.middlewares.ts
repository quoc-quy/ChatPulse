import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import databaseService from '~/services/database.services'
import userService from '~/services/user.services'
import { validate } from '~/utils/validation'

export const loginValidator = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({
      message: 'Email and Password is required'
    })
  }
  next()
}

export const registerValidator = validate(
  checkSchema(
    {
      email: {
        notEmpty: {
          errorMessage: 'Email không được để trống'
        },
        isString: true,
        trim: true,
        isEmail: true,
        isLength: {
          options: {
            min: 10,
            max: 100
          },
          errorMessage: 'Email có độ dài từ 10 đến 100 ký tự'
        },
        custom: {
          options: async (value) => {
            const existedEmail = await userService.checkExistedEmail(value)

            if (existedEmail) {
              throw new Error('Email đã tồn tại')
            }
            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: 'Mật khẩu không được để trống'
        },
        isString: true
      },
      confirm_password: {
        notEmpty: {
          errorMessage: 'Mật khẩu nhập lại không được để trống'
        },
        isString: true,
        custom: {
          options: (value, { req }) => {
            if (value !== req.body.password) {
              throw new Error('Mật khẩu nhập lại không khớp với mật khẩu')
            }
            return true
          }
        }
      },
      userName: {
        notEmpty: {
          errorMessage: 'Tên người dùng không được để trống'
        },
        isString: true,
        trim: true,
        isLength: {
          options: {
            min: 5,
            max: 50
          },
          errorMessage: 'Tên người dùng phải từ 5 đến 50 ký tự'
        }
      },
      date_of_birth: {
        isISO8601: {
          options: {
            strict: true,
            strictSeparator: true
          }
        }
      },
      phone: {
        notEmpty: {
          errorMessage: 'Số điện thoại không được để trống'
        },
        isString: true,
        isLength: {
          options: {
            min: 10,
            max: 10
          },
          errorMessage: 'Số điện thoại phải đủ 10 ký tự số'
        },
        custom: {
          options: async (value) => {
            const existedPhone = await userService.checkExistedPhone(value)

            if (existedPhone) {
              throw new Error('Số điện thoại đã tồn tại')
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
