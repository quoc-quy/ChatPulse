import User from '~/models/schemas/user.schema'
import databaseService from './database.services'

class UserService {
  async register(payload: { email: string; password: string; userName: string; date_of_birth: Date; phone: string }) {
    const { email, password, userName, date_of_birth, phone } = payload
    const result = await databaseService.users.insertOne(
      new User({
        email,
        password,
        userName,
        date_of_birth,
        phone
      })
    )
    return result
  }

  async checkExistedEmail(email: string) {
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async checkExistedPhone(phone: string) {
    const user = await databaseService.users.findOne({ phone })
    return Boolean(user)
  }
}

const userService = new UserService()
export default userService
