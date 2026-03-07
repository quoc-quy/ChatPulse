import { ObjectId } from 'mongodb'
import { CallStatus, CallType } from '~/constants/callStataus'

interface CallTypeParams {
  _id?: ObjectId
  conversationId: ObjectId
  callerId: ObjectId
  participants?: ObjectId[]
  type: CallType
  status?: CallStatus
  startedAt?: Date
  endedAt?: Date
  duration?: number
  createdAt?: Date
  updatedAt?: Date
}

export default class Call {
  _id?: ObjectId
  conversationId: ObjectId
  callerId: ObjectId
  participants: ObjectId[]
  type: string
  status: string
  startedAt?: Date
  endedAt?: Date
  duration: number
  createdAt: Date
  updatedAt: Date

  constructor(call: CallTypeParams) {
    const now = new Date()
    this._id = call._id || new ObjectId()
    this.conversationId = call.conversationId
    this.callerId = call.callerId
    this.participants = call.participants || []
    this.type = call.type
    this.status = call.status || CallStatus.INITIATED
    this.startedAt = call.startedAt
    this.endedAt = call.endedAt
    this.duration = call.duration || 0
    this.createdAt = call.createdAt || now
    this.updatedAt = call.updatedAt || now
  }
}
