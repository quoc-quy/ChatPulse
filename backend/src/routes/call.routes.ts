import { Router } from 'express'
import { getLiveKitTokenController } from '~/controllers/call.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'

const callRouter = Router()
// Sử dụng accessTokenValidator để bảo mật, chỉ user đăng nhập mới được call
callRouter.get('/token', accessTokenValidator, getLiveKitTokenController)

export default callRouter
