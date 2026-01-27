import { JwtPayload } from "jsonwebtoken"

export interface RegisterReqBody {
  email: string
  phone: string
  password: string
  confirm_password: string
  userName: string
  date_of_birth: Date
}

export interface TokenPayload extends JwtPayload{
  user_id: string
}