import { ObjectId } from 'mongodb'

interface UserType {
  _id?: ObjectId
  userName: string
  password: string
  date_of_birth: Date
  email: string
  avatar?: string
  bio?: string
  phone: string
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
  created_at: Date
  updated_at: Date

  constructor({ _id, userName, password, date_of_birth, email, avatar, bio, phone, created_at, updated_at }: UserType) {
    const date = new Date()
    this._id = _id
    this.userName = userName
    this.password = password
    this.date_of_birth = date_of_birth || new Date()
    this.email = email
    this.avatar = avatar || ''
    this.bio = bio || ''
    this.phone = phone || ''
    this.created_at = created_at || date
    this.updated_at = updated_at || date
  }
}
