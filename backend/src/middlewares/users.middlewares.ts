import { NextFunction, Request, Response } from 'express'
import { checkSchema, ParamSchema } from 'express-validator'
import { JsonWebTokenError } from 'jsonwebtoken'
import { capitalize } from 'lodash'
import { ObjectId } from 'mongodb'
import httpStatus from '~/constants/httpStatus'
import { ErrorWithStatus } from '~/models/errors'
import { TokenPayload } from '~/models/requests/users.requests'
import databaseService from '~/services/database.services'
import userService from '~/services/user.services'
import { hashPassword } from '~/utils/crypto'
import { verifyToken } from '~/utils/jwt'
import { validate } from '~/utils/validation'

const passwordSchema = {
  notEmpty: {
    errorMessage: 'Mật khẩu không được để trống'
  },
  isString: {
    errorMessage: 'Password phải là chuỗi String'
  }
}

const userIdSchema: ParamSchema = {
  custom: {
    options: async (value, { req }) => {
      if (!ObjectId.isValid(value)) {
        throw new ErrorWithStatus({
          message: 'User is Invalid',
          status: httpStatus.NOT_FOUND
        })
      }

      const user = await databaseService.users.findOne({
        _id: new ObjectId(value)
      })

      if (user == null) {
        throw new ErrorWithStatus({
          message: 'User not found',
          status: httpStatus.NOT_FOUND
        })
      }
    }
  }
}

export const loginValidator = validate(
  checkSchema(
    {
      email: {
        optional: true,
        isString: true,
        trim: true
      },
      identifier: {
        optional: true,
        isString: {
          errorMessage: 'Tài khoản phải là chuỗi'
        },
        trim: true
      },
      password: {
        ...passwordSchema,
        custom: {
          options: async (_, { req }) => {
            const identifier = String(req.body.identifier || req.body.email || '').trim()

            if (!identifier) {
              throw new Error('Email hoặc username không được để trống')
            }

            const loginQuery = identifier.includes('@')
              ? {
                  $or: [{ email: identifier }, { email: identifier.toLowerCase() }]
                }
              : {
                  userName: identifier
                }

            const user = await databaseService.users.findOne({
              ...loginQuery,
              password: hashPassword(req.body.password)
            })

            if (user == null) {
              throw new Error('Email/username hoặc password không đúng')
            }

            req.user = user
            return true
          }
        }
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
      authorization: {
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
  checkSchema(
    {
      userName: {
        optional: true,
        isString: { errorMessage: 'Tên người dùng phải là chuỗi String' },
        trim: true,
        isLength: {
          options: { min: 1, max: 100 },
          errorMessage: 'Tên người dùng phải từ 1 đến 100 ký tự'
        }
      },
      date_of_birth: {
        optional: true,
        isISO8601: {
          errorMessage: 'Ngày sinh phải định dạng ISO8601'
        }
      },
      bio: {
        optional: true,
        isString: { errorMessage: 'Tiểu sử phải là chuỗi String' },
        trim: true,
        isLength: {
          options: { min: 0, max: 200 },
          errorMessage: 'Tiểu sử tối đa 200 ký tự'
        }
      },
      avatar: {
        optional: true,
        isString: { errorMessage: 'Avatar phải là chuỗi URL' },
        trim: true,
        isLength: {
          options: { min: 1, max: 400 },
          errorMessage: 'Độ dài URL không hợp lệ'
        }
      },
      phone: {
        optional: true,
        isString: { errorMessage: 'Số điện thoại phải là chuỗi String' },
        trim: true
      },
      show_date_of_birth: {
        optional: true,
        isBoolean: { errorMessage: 'show_date_of_birth phải là boolean' }
      },
      gender: {
        optional: true,
        isString: { errorMessage: 'Giới tính phải là chuỗi String' },
        trim: true
      },
      // ✅ FIX 1: KHAI BÁO PUBLIC KEY ĐỂ DATABASE KHÔNG BỎ QUA KHI LƯU
      public_key: {
        optional: true,
        isString: {
          errorMessage: 'public_key phải là chuỗi String'
        },
        trim: true
      }
    },
    ['body']
  )
)

export const changePasswordValidator = validate(
  checkSchema({
    old_password: {
      ...passwordSchema,
      custom: {
        options: async (value, { req }) => {
          const { user_id } = req.decoded_authorization as TokenPayload
          const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

          if (!user) {
            throw new ErrorWithStatus({
              message: 'Không tìm thấy User',
              status: httpStatus.NOT_FOUND
            })
          }

          if (!(hashPassword(value) == user.password)) {
            throw new ErrorWithStatus({
              message: 'Mật khẩu cũ không đúng',
              status: httpStatus.UNAUTHORIZED
            })
          }
        }
      }
    },
    password: passwordSchema,
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
    }
  })
)

export const blockUserValidator = validate(
  checkSchema(
    {
      blocked_user_id: userIdSchema
    },
    ['body']
  )
)

export const unBlockUserValidator = validate(
  checkSchema(
    {
      user_id: userIdSchema
    },
    ['params']
  )
)

export const forgotPasswordValidator = validate(
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
            const user = await databaseService.users.findOne({ email: value })

            if (user == null) {
              throw new Error('Ngời dùng không tồn tại')
            }

            req.user = user
            return true
          }
        }
      }
    },
    ['body']
  )
)

export const verifyForgotPasswordValidator = validate(
  checkSchema(
    {
      forgot_password_token: {
        trim: true,
        custom: {
          options: async (value: string, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Forgot password token is required',
                status: httpStatus.UNAUTHORIZED
              })
            }
            try {
              const decoded_forgot_password_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_FOROT_PASSWORD_TOKEN as string
              })

              const { user_id } = decoded_forgot_password_token

              const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

              if (user == null) {
                throw new ErrorWithStatus({
                  message: 'User not found',
                  status: httpStatus.UNAUTHORIZED
                })
              }
              if (user.forgot_password_token != value) {
                throw new ErrorWithStatus({
                  message: 'Invalid forgot password token',
                  status: httpStatus.UNAUTHORIZED
                })
              }
              req.decoded_forgot_password_token = decoded_forgot_password_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize(error.message),
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

export const resetPasswordValidator = validate(
  checkSchema({
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
    forgot_password_token: {
      trim: true,
      custom: {
        options: async (value: string, { req }) => {
          if (!value) {
            throw new ErrorWithStatus({
              message: 'Forgot password token is required',
              status: httpStatus.UNAUTHORIZED
            })
          }
          try {
            const decoded_forgot_password_token = await verifyToken({
              token: value,
              secretOrPublicKey: process.env.JWT_SECRET_FOROT_PASSWORD_TOKEN as string
            })

            const { user_id } = decoded_forgot_password_token

            const user = await databaseService.users.findOne({ _id: new ObjectId(user_id) })

            if (user == null) {
              throw new ErrorWithStatus({
                message: 'User not found',
                status: httpStatus.UNAUTHORIZED
              })
            }
            if (user.forgot_password_token != value) {
              throw new ErrorWithStatus({
                message: 'Invalid forgot password token',
                status: httpStatus.UNAUTHORIZED
              })
            }
            req.decoded_forgot_password_token = decoded_forgot_password_token
          } catch (error) {
            if (error instanceof JsonWebTokenError) {
              throw new ErrorWithStatus({
                message: capitalize(error.message),
                status: httpStatus.UNAUTHORIZED
              })
            }
            throw error
          }

          return true
        }
      }
    }
  })
)

export const emailVerifyTokenValidator = validate(
  checkSchema(
    {
      email_verify_token: {
        trim: true,
        custom: {
          options: async (value, { req }) => {
            if (!value) {
              throw new ErrorWithStatus({
                message: 'Email Verify Token is required',
                status: httpStatus.UNAUTHORIZED
              })
            }

            try {
              const decoded_email_verify_token = await verifyToken({
                token: value,
                secretOrPublicKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string
              })

              ;(req as Request).decoded_email_verify_token = decoded_email_verify_token
            } catch (error) {
              if (error instanceof JsonWebTokenError) {
                throw new ErrorWithStatus({
                  message: capitalize((error as JsonWebTokenError).message),
                  status: httpStatus.UNAUTHORIZED
                })
              }
            }

            return true
          }
        }
      }
    },
    ['body']
  )
)
