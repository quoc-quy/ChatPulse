import { ObjectId } from 'mongodb'
import { UserVerifyStatus } from '~/constants/enum'

interface UserType {
  _id?: ObjectId
  userName: string
  password: string
  date_of_birth: Date
  email: string
  phone: string
  avatar?: string
  bio?: string
  show_date_of_birth?: boolean
  gender?: string
  forgot_password_token?: string
  email_verify_token?: string
  verify?: UserVerifyStatus
  last_active_at?: Date
  fcm_token?: string
  created_at?: Date
  updated_at?: Date
  public_key?: string // PUBLIC KEY CHO E2E
}

export default class User {
  _id?: ObjectId
  userName: string
  password: string
  date_of_birth: Date
  email: string
  avatar: string
  bio: string
  show_date_of_birth: boolean
  phone: string
  gender: string
  forgot_password_token: string
  email_verify_token: string
  verify: UserVerifyStatus
  last_active_at: Date
  fcm_token: string
  created_at: Date
  updated_at: Date
  public_key: string

  constructor({
    _id,
    userName,
    password,
    date_of_birth,
    email,
    avatar,
    bio,
    show_date_of_birth,
    phone,
    gender,
    forgot_password_token,
    email_verify_token,
    verify,
    last_active_at,
    fcm_token,
    created_at,
    updated_at,
    public_key
  }: UserType) {
    const date = new Date()
    this._id = _id
    this.userName = userName
    this.password = password
    this.date_of_birth = date_of_birth || new Date()
    this.email = email
    this.avatar = avatar || ''
    this.bio = bio || ''
    this.show_date_of_birth = show_date_of_birth ?? true
    this.phone = phone || ''
    this.gender = gender || ''
    this.forgot_password_token = forgot_password_token || ''
    this.email_verify_token = email_verify_token || ''
    this.verify = verify || UserVerifyStatus.Unverified
    this.last_active_at = last_active_at || date
    this.fcm_token = fcm_token || ''
    this.created_at = created_at || date
    this.updated_at = updated_at || date
    this.public_key = public_key || ''
  }
}
