import User from '~/models/schemas/user.schema'
import databaseService from './database.services'
import { ChangePasswordReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/users.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType } from '~/constants/enum'
import { RefreshToken } from '~/models/schemas/refreshToken_schema'
import { ObjectId } from 'mongodb'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import { sendEmailNotification } from '~/utils/email'
import UserBlocks from '~/models/schemas/userBlocks.schema'

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

  private signAccessAndRefreshToken(user_id: string) {
    return Promise.all([this.signAccessToken(user_id), this.signRefreshToken(user_id)])
  }

  async register(payload: RegisterReqBody) {
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        date_of_birth: new Date(payload.date_of_birth),
        password: hashPassword(payload.password)
      })
    )
    const user_id = result.insertedId.toString()
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
    const [access_token, refresh_token] = await this.signAccessAndRefreshToken(user_id)
    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ token: refresh_token, user_id: new ObjectId(user_id) })
    )

    // await sendEmailNotification(payload.email)

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

    await databaseService.refreshTokens.insertOne(
      new RefreshToken({ token: refresh_token, user_id: new ObjectId(user_id) })
    )
    return {
      access_token,
      refresh_token,
      user
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
}

const userService = new UserService()
export default userService
