import { JwtPayload } from 'jsonwebtoken'
import { ParamsDictionary } from 'express-serve-static-core'

export interface RegisterReqBody {
  email: string
  phone: string
  password: string
  confirm_password: string
  userName: string
  date_of_birth: Date
}

export interface getProfileReqBody extends ParamsDictionary {
  userName: string
}

export interface TokenPayload extends JwtPayload {
  user_id: string
}
