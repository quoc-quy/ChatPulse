import { Router } from 'express'
import {
  createConversationController,
  getConversationController,
  getConversationsController
} from '~/controllers/conversations.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const chatRouter = Router()

/**
 * Description: Get list of conversations
 * Path: /conversations
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.get('/', accessTokenValidator, wrapRequestHandler(getConversationsController))

/**
 * Description: Create a new conversation (Direct or Group)
 * Path: /conversations
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { type: 'direct' | 'group', members: string[], name?: string }
 */
chatRouter.post('/', accessTokenValidator, wrapRequestHandler(createConversationController))

/**
 * Description: Get conversation details and members
 * Path: /conversations/:id
 * Method: GET
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.get('/:id', accessTokenValidator, wrapRequestHandler(getConversationController))

export default chatRouter
