import { ObjectId } from 'mongodb'

interface OtpType {
  _id?: ObjectId
  email: string
  otp: string
  created_at?: Date
  expires_at: Date
}

export class Otp {
  _id?: ObjectId
  email: string
  otp: string
  created_at: Date
  expires_at: Date

  constructor({ email, otp, expires_at, created_at }: OtpType) {
    this._id = new ObjectId()
    this.email = email
    this.otp = otp
    this.created_at = created_at || new Date()
    this.expires_at = expires_at
  }
}
