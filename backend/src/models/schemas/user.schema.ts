import { ObjectId } from 'mongodb'

interface UserType {
  _id?: ObjectId
  userName: string
  password: string
  date_of_birth: Date
  email: string
  phone: string
  avatar?: string
  bio?: string
  gender?: string
  forgot_password_token?: string
  last_active_at?: Date
  fcm_token?: string
  created_at?: Date
  updated_at?: Date
}

export default class User {
  _id?: ObjectId
  userName: string
  password: string
  date_of_birth: Date
  email: string
  avatar: string
  bio: string
  phone: string
  gender: string
  forgot_password_token: string
  last_active_at: Date
  fcm_token: string
  created_at: Date
  updated_at: Date

  constructor({
    _id,
    userName,
    password,
    date_of_birth,
    email,
    avatar,
    bio,
    phone,
    gender,
    forgot_password_token,
    last_active_at,
    fcm_token,
    created_at,
    updated_at
  }: UserType) {
    const date = new Date()
    this._id = _id
    this.userName = userName
    this.password = password
    this.date_of_birth = date_of_birth || new Date()
    this.email = email
    this.avatar = avatar || ''
    this.bio = bio || ''
    this.phone = phone || ''
    this.gender = gender || ''
    this.forgot_password_token = forgot_password_token || ''
    this.last_active_at = last_active_at || date
    this.fcm_token = fcm_token || ''
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
