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

export interface UpdateMeReqBody {
  userName?: string
  date_of_birth?: string
  show_date_of_birth?: boolean
  avatar?: string
  bio?: string
  phone?: string
}

export interface ChangePasswordReqBody {
  old_password: string
  password: string
  confirm_password: string
}

export interface BlockUserReqBody {
  blocked_user_id: string
}

export interface UnBlockUserReqBody extends ParamsDictionary{
  user_id: string
}
