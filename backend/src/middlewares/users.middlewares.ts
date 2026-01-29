import { NextFunction, Request, Response } from 'express'
import { checkSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import databaseService from '~/services/database.services'
import userService from '~/services/user.services'
import { hashPassword } from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

export const loginValidator = validate(
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
          options: async (value, { req }) => {
            const user = await databaseService.users.findOne({
              email: value,
              password: hashPassword(req.body.password)
            })

            if (user == null) {
              throw new Error('Email hoặc password không đúng')
            }
            req.user = user

            return true
          }
        }
      },
      password: {
        notEmpty: {
          errorMessage: 'Mật khẩu không được để trống'
        },
        isString: true
      }
    },
    ['body']
  )
)

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

export const accessTokenValidator = validate(
  checkSchema(
    {
      Authorization: {
        notEmpty: {
          errorMessage: 'Access Token is required'
        },
        custom: {
          options: async (value: string, { req }) => {
            const access_token = value.split(' ')[1]
            if (!access_token) {
              throw new ErrorWithStatus({
                message: 'Access Token is invalid',
                status: httpStatus.UNAUTHORIZED
              })
            }
            const decoded_authorization = await verifyToken({ token: access_token })
            ;(req as Request).decoded_authorization = decoded_authorization
            return true
          }
        }
      }
    },
    ['headers']
  )
)

export const refreshTokenValidator = validate(
  checkSchema(
    {
      refresh_token: {
        notEmpty: {
          errorMessage: 'Refresh Token is required'
        },
        custom: {
          options: async (value, { req }) => {
            try {
              const [refresh_token, decoded_refresh_token] = await Promise.all([
                databaseService.refreshTokens.findOne({ token: value }),
                verifyToken({ token: value })
              ])

              if (refresh_token == null) {
                throw new ErrorWithStatus({
                  message: 'Refresh Token is used or does not exist',
                  status: httpStatus.UNAUTHORIZED
                })
              }
              ;(req as Request).decoded_refresh_token = decoded_refresh_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: 'Refresh Token is invalid',
                  status: httpStatus.UNAUTHORIZED
                })
              }
              throw error
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const updateMeValidator = validate(
  checkSchema({
    userName: {
      optional: true,
      isString: {
        errorMessage: 'Username phải là chuỗi string'
      },
      custom: {
        options: async (value, { req }) => {
          const userName = await databaseService.users.findOne({ userName: value })

          if (userName != null) {
            throw new Error('Username đã tồn tại trong hệ thống')
          }
        }
      }
    },
    avatar: {
      optional: true,
      isString: {
        errorMessage: 'Avatar phải là chuỗi String'
      },
      trim: true,
      isLength: {
        options: {
          min: 1,
          max: 500
        },
        errorMessage: 'Avatar phải từ 1 đến 500 kí tự'
      }
    },
    bio: {
      optional: true,
      isString: {
        errorMessage: 'Bio phải là chuỗi String'
      },
      isLength: {
        options: {
          min: 1,
          max: 200
        },
        errorMessage: 'Bio phải từ 1 đến 200 kí tự'
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
    },
    date_of_birth: {
      isISO8601: {
        options: {
          strict: true,
          strictSeparator: true
        },
        errorMessage: 'Date_of_birth phải là ISO8601'
      }
    }
  })
)
