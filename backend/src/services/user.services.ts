import User from '~/models/schemas/user.schema'
import databaseService from './database.services'
import { ChangePasswordReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/users.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enum'
import { RefreshToken } from '~/models/schemas/refreshToken_schema'
import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import { sendEmailNotification, sendForgotPasswordEmail } from '~/utils/email'
import UserBlocks from '~/models/schemas/userBlocks.schema'
import axios from 'axios'

class UserService {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.AccessToken
      },
      options: {
        expiresIn: '1h'
      }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.RefreshToken
      },
      options: {
        expiresIn: '100d'
      }
    })
  }

  private signForgotPasswordToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.ForgotPasswordToken
      },
      privateKey: process.env.JWT_SECRET_FOROT_PASSWORD_TOKEN as string,
      options: {
        expiresIn: '7d'
      }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: {
        user_id,
        token_type: TokenType.EmailVerifyToken
      },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: {
        expiresIn: '7d'
      }
    })
  }

  private signAccessAndRefreshToken(user_id: string) {
    return Promise.all([this.signAccessToken(user_id), this.signRefreshToken(user_id)])
  }

  async register(payload: RegisterReqBody) {
    const user_id = new ObjectId()
    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    await databaseService.users.insertOne(
      new User({
        ...payload,
        _id: user_id,
        date_of_birth: new Date(payload.date_of_birth),
        email_verify_token,
        password: hashPassword(payload.password)
      })
    )
    const user = await databaseService.users.findOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        projection: {
          password: 0,
          created_at: 0,
          updated_at: 0
        }
      }
    )
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user_id.toString())
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ token: refresh_token, user_id: new ObjectId(user_id) })
    )

    // await sendEmailNotification(payload.email)
    console.log('email_verify_token:', email_verify_token)
    return { access_token, refresh_token, user }
  }

  async login(user_id: string) {
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user_id)
    const user = await databaseService.users.findOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        projection: {
          password: 0,
          created_at: 0,
          updated_at: 0
        }
      }
    )

    if(user?.verify == UserVerifyStatus.Unverified) {
      throw new ErrorWithStatus({
        message: "Người dùng chưa xác thực email",
        status: httpStatus.UNAUTHORIZED
      })
    }

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ token: refresh_token, user_id: new ObjectId(user_id) })
    )
    return {
      access_token,
      refresh_token,
      user
    }
  }

  private async getOauthGoogleToken(code: string) {
    const body = {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    }
    const { data } = await axios.post('https://oauth2.googleapis.com/token', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    return data as {
      access_token: string
      id_token: string
    }
  }

  private async getGoogleUserInfo(access_token: string, id_token: string) {
    const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      params: {
        access_token,
        alt: 'json'
      },
      headers: {
        Authorization: `Bearer ${id_token}`
      }
    })

    return data
  }
  async oauth(code: string) {
    const { id_token, access_token } = await this.getOauthGoogleToken(code)
    const userInfo = await this.getGoogleUserInfo(access_token, id_token)

    const user = await databaseService.users.findOne({ email: userInfo.email })
    //Tồn tại thì login
    if (user) {
      const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user._id.toString())

      await databaseService.refreshTokens.insertOne(
        new RefreshToken({ token: refresh_token, user_id: new ObjectId(user._id) })
      )
      return {
        access_token,
        refresh_token,
        user,
        newUser: false
      }
      //Không tồn tại tạo mới
    } else {
      const password = Math.random().toString(36).substring(2, 7)
      const data = await this.register({
        email: userInfo.email,
        userName: userInfo.name,
        date_of_birth: new Date(),
        password,
        confirm_password: password,
        phone: `temp_${new ObjectId().toString()}`
      })
      return {
        ...data,
        newUser: true
      }
    }
  }

  async logout(refresh_token: string) {
    await databaseService.refreshTokens.deleteOne({ token: refresh_token })
    return {
      message: 'Logout successfully'
    }
  }

  async checkExistedEmail(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async checkExistedPhone(phone: string) {
    const user = await databaseService.users.findOne({ phone })
    return Boolean(user)
  }

  async getProfile(userName: string) {
    const user = await databaseService.users.findOne(
      {
        userName: userName
      },
      {
        projection: {
          password: 0,
          created_at: 0,
          updated_at: 0
        }
      }
    )

    return user
  }

  async getMe(user_id: string) {
    const user = await databaseService.users.findOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        projection: {
          password: 0
        }
      }
    )
    return user
  }

  async updateMe(user_id: string, payload: UpdateMeReqBody) {
    const _payload = payload.date_of_birth ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } : payload
    const user = await databaseService.users.findOneAndUpdate(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          ...(_payload as UpdateMeReqBody & { date_of_birth: Date }),
          updated_at: new Date()
        }
      },
      {
        returnDocument: 'after',
        projection: {
          password: 0
        }
      }
    )

    return user
  }

  async changePassword(user_id: string, payload: ChangePasswordReqBody) {
    const user = await databaseService.users.findOneAndUpdate(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          password: hashPassword(payload.password),
          updated_at: new Date()
        }
      }
    )

    if (!user) {
      throw new ErrorWithStatus({
        message: 'User không tồn tại trong hệ thống',
        status: httpStatus.UNAUTHORIZED
      })
    }

    return user
  }

  async blockUser(user_id: string, blocked_user_id: string) {
    const user = await databaseService.user_blocks.findOne({
      user_id: new ObjectId(user_id),
      blocked_user_id: new ObjectId(blocked_user_id)
    })

    if (user === null) {
      await databaseService.user_blocks.insertOne(
        new UserBlocks({
          user_id: new ObjectId(user_id),
          blocked_user_id: new ObjectId(blocked_user_id)
        })
      )
      return {
        message: 'Chặn người dùng thành công'
      }
    }
    return {
      message: 'Bạn đã chặn người dùng này rồi'
    }
  }
  async checkUserBlock(user_id: string, blocked_user_id: string) {
    const block = await databaseService.user_blocks.findOne({
      $or: [
        {
          user_id: new ObjectId(user_id),
          blocked_user_id: new ObjectId(blocked_user_id)
        },
        {
          user_id: new ObjectId(blocked_user_id),
          blocked_user_id: new ObjectId(user_id)
        }
      ]
    })

    return !!block
  }
  async getListBlockUser(user_id: string) {
    const result = await databaseService.user_blocks
      .aggregate([
        {
          $match: {
            user_id: new ObjectId(user_id)
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'blocked_user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: {
            path: '$user'
          }
        },
        {
          $project: {
            user: {
              password: 0,
              created_at: 0,
              updated_at: 0
            }
          }
        }
      ])
      .toArray()

    return {
      message: 'Lấy danh sách chặn thành công',
      result
    }
  }

  async unBlockUser(user_id: string, blocked_user_id: string) {
    const user = await databaseService.user_blocks.findOne({
      user_id: new ObjectId(user_id),
      blocked_user_id: new ObjectId(blocked_user_id)
    })

    if (user != null) {
      await databaseService.user_blocks.deleteOne({
        user_id: new ObjectId(user_id),
        blocked_user_id: new ObjectId(blocked_user_id)
      })

      return {
        message: 'Bỏ chặn người dùng thành công'
      }
    }

    return {
      message: 'Bỏ chặn người dùng thất bại'
    }
  }
  // searchUser: Tìm kiếm người dùng theo userName hoặc displayName, loại bỏ những người đã bị block bởi currentUser hoặc đã block currentUser
  async searchUser(keyword: string, currentUserId: string) {
    if (!keyword || keyword.trim() === '') return { users: [] }

    const blockedRecords = await databaseService.user_blocks
      .find({
        $or: [{ user_id: new ObjectId(currentUserId) }, { blocked_user_id: new ObjectId(currentUserId) }]
      })
      .toArray()

    const blockedIds = blockedRecords.map((r) =>
      r.user_id.toString() === currentUserId ? r.blocked_user_id : r.user_id
    )

    const users = await databaseService.users
      .find({
        $and: [
          {
            $or: [{ userName: { $regex: keyword, $options: 'i' } }, { phone: { $regex: keyword, $options: 'i' } }]
          },
          { _id: { $ne: new ObjectId(currentUserId) } },
          { _id: { $nin: blockedIds } }
        ]
      })
      .project({ password: 0, email: 0, verify_token: 0 })
      .limit(10)
      .toArray()
    return { users }
  }

  async forgotPassword(user_id: string, email: string) {
    const forgot_password_token = await this.signForgotPasswordToken(user_id)

    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          forgot_password_token,
          updated_at: new Date()
        }
      }
    )
    await sendForgotPasswordEmail(email, forgot_password_token)
    return {
      message: 'Kiểm tra hộp thư email để thiết lập lại mật khẩu'
    }
  }

  async resetPassword(user_id: string, password: string) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      },
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: '',
          updated_at: new Date()
        }
      }
    )

    return {
      message: 'Thay đổi mật khẩu thành công'
    }
  }

  async verifyEmail(user_id: string) {
    const [token] = await Promise.all([
      this.signAccessAndRefreshToken(user_id),
      databaseService.users.updateOne(
        {
          _id: new ObjectId(user_id)
        },
        {
          $set: {
            email_verify_token: '',
            verify: UserVerifyStatus.Verified,
            updated_at: new Date()
          }
        }
      )
    ])
    const [access_token, refresh_token] = token
    return {
      access_token,
      refresh_token
    }
  }
}

const userService = new UserService()
export default userService
