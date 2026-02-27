import { Router } from 'express'
import {
  createConversationController,
  getConversationController,
  getConversationsController,
  markConversationAsSeenController,
  updateGroupController
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

/**
 * Description: Update group info (Name, Avatar)
 * Path: /conversations/:id
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Body: { name?: string, avatarUrl?: string }
 */
chatRouter.patch('/:id', accessTokenValidator, wrapRequestHandler(updateGroupController))

/**
 * Description: Mark conversation as seen (Read receipt)
 * Path: /conversations/:id/seen
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.patch('/:id/seen', accessTokenValidator, wrapRequestHandler(markConversationAsSeenController))

export default chatRouter
