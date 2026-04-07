import { NextFunction, Request, Response, Router } from 'express'
import {
  blockUserController,
  changePasswordController,
  getListBlockUserController,
  getMeController,
  getProfileController,
  loginController,
  logoutController,
  registerController,
  searchUserController,
  uploadAvatarController,
  unBlockUserController,
  updateMeController,
  oauthController
} from '~/controllers/users.controllers'
import {
  accessTokenValidator,
  blockUserValidator,
  changePasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  unBlockUserValidator,
  updateMeValidator
} from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import multer from 'multer'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

const usersRouter = Router()

const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const ALLOWED_AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new ErrorWithStatus({
          message: 'Avatar chỉ hỗ trợ định dạng jpg, png hoặc webp',
          status: httpStatus.BAD_REQUEST
        })
      )
    }
    return cb(null, true)
  }
})

const uploadAvatarMiddleware = (req: Request, res: Response, next: NextFunction) => {
  uploadAvatar.single('avatar')(req, res, (err: unknown) => {
    if (!err) return next()

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(
        new ErrorWithStatus({
          message: 'Kích thước avatar tối đa là 5MB',
          status: httpStatus.BAD_REQUEST
        })
      )
    }

    return next(err)
  })
}

/**
 * Get me
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.get('/me', accessTokenValidator, wrapRequestHandler(getMeController))

/**
 * Login account with Google
 */
usersRouter.get('/oauth/google', wrapRequestHandler(oauthController))

/**
 * Update profile
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.patch('/update-profile', accessTokenValidator, updateMeValidator, wrapRequestHandler(updateMeController))

/**
 * Upload avatar image
 * Header: {Authorization: Bearer <access_token>}
 * Body form-data: avatar=<file>
 */
usersRouter.post(
  '/upload-avatar',
  accessTokenValidator,
  uploadAvatarMiddleware,
  wrapRequestHandler(uploadAvatarController)
)

/**
 * Change password
 * Header: {Authorization: Bearer <access_token>}
 * Body: {old_password: string, password: string, confirm_password: string}
 */
usersRouter.put(
  '/change-password',
  accessTokenValidator,
  changePasswordValidator,
  wrapRequestHandler(changePasswordController)
)

/**
 * Block user
 * Header: {Authorization: Bearer <access_token>}
 * Body: {blocked_user_id}
 */
usersRouter.post('/block', accessTokenValidator, blockUserValidator, wrapRequestHandler(blockUserController))

/**
 * Unblock User
 * Header: {Authorization: Bearer <access_token>}
 * Params: {user_id}
 */
usersRouter.delete(
  '/unblock/:user_id',
  accessTokenValidator,
  unBlockUserValidator,
  wrapRequestHandler(unBlockUserController)
)

/**
 * Display a list of blocked user
 * Header: {Authorization: Bearer <access_token>}
 */
usersRouter.get('/block', accessTokenValidator, wrapRequestHandler(getListBlockUserController))

// /**
//  * Register
//  */
// usersRouter.post('/register', registerValidator, wrapRequestHandler(registerController))

// /**
//  * Login
//  */
// usersRouter.post('/login', loginValidator, wrapRequestHandler(loginController))

// /**
//  * Logout
//  */
// usersRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapRequestHandler(logoutController))
// /**
//  * Search user
//  */
usersRouter.get('/search', accessTokenValidator, wrapRequestHandler(searchUserController))
/**
 * Get user profile
 */
usersRouter.get('/:userName', wrapRequestHandler(getProfileController))

export default usersRouter
