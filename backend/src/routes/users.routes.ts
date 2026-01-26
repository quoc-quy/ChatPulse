import { Router } from 'express'
import { loginController, registerController } from '~/controllers/users.controllers'
import { loginValidator, registerValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const usersRouter = Router()

usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

/**
 * Register a new user
 * Body: {email: string, password: string, confirm_password: string, userName: string, date_of_birth: ISOString, phone: number}
 */
usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

export default usersRouter
