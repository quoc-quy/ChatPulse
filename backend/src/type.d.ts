import { Request } from 'express'
import User from './models/schemas/user.schema'

declare module 'express' {
  interface Request {
    user?: User
  }
}
