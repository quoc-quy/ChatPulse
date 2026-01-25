import User from '~/models/schemas/user.schema'
import databaseService from './database.services'
import { RegisterReqBody } from '~/models/requests/users.requests'

class UserService {
  async register(payload: RegisterReqBody) {
    const { email, password, userName, date_of_birth, phone } = payload
    const result = await databaseService.users.insertOne(
      new User({
        ...payload,
        date_of_birth: new Date(date_of_birth)
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
