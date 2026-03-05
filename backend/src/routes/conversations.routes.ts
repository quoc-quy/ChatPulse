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
import { addMembersController, kickMemberController, pinController, leaveGroupController, promoteAdminController } from '~/controllers/group.controllers'


// Sửa lại dòng này

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

/**
 * Description: Add members to group
 * Path: /conversations/:id/members 
 * Method: POST
 * Header: { Authorization: Bearer <access_token> }
 * Body: { members: string[] }
 */
chatRouter.post('/:id/members', accessTokenValidator, wrapRequestHandler(addMembersController))

/**
 * Description: User tự rời nhóm
 * Path: /conversations/:id/members/me
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.delete('/:id/members/me', accessTokenValidator, wrapRequestHandler(leaveGroupController))

/**
 * Description: Kick member from group
 * Path: /conversations/:id/members/:memberId
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.delete(
  '/:id/members/:memberId', 
  accessTokenValidator, 
  wrapRequestHandler(kickMemberController)
)

/**
 * Description: Pin/Unpin conversation
 * Path: /conversations/:id/pin
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 * Body: { is_pin: boolean }
 */
chatRouter.patch('/:id/pin', accessTokenValidator, wrapRequestHandler(pinController))

/**
 * Description: User tự rời nhóm
 * Path: /conversations/:id/members/me
 * Method: DELETE
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.delete('/:id/members/me', accessTokenValidator, wrapRequestHandler(leaveGroupController))

/**
 * Description: Thăng cấp 1 member lên làm Admin
 * Path: /conversations/:id/members/:memberId/admin
 * Method: PATCH
 * Header: { Authorization: Bearer <access_token> }
 */
chatRouter.patch(
  '/:id/members/:memberId/admin', 
  accessTokenValidator, 
  wrapRequestHandler(promoteAdminController)
)





export default chatRouter
