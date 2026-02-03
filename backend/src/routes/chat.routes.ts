import { Router } from 'express'
import { getConversationsController } from '~/controllers/chat.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const chatRouter = Router()

/**
 * Description: Get list of conversations
 * Path: /conversations
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.get('/conversations', accessTokenValidator, wrapRequestHandler(getConversationsController))

export default chatRouter
