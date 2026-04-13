export interface User {
  _id: string
  userName: string
  password: string
  date_of_birth: string
  email: string
  phone: string
  gender?: string
  avatar?: string
  bio?: string
  created_at?: string
  updated_at?: string
  forgot_password_token?: string
  last_active_at?: string
  fcm_token?: string
  isBlocked?: boolean
  isFriend?: boolean
  public_key?: string
}
