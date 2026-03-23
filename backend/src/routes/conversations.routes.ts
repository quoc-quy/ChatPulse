import { Router } from 'express'
import {
  askAIController,
  createConversationController,
  getConversationController,
  getConversationsController,
  markConversationAsSeenController,
  updateGroupController
} from '~/controllers/conversations.controllers'
import { summarizeChatController } from '~/controllers/conversations.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'
import {
  addMembersController,
  kickMemberController,
  pinController,
  leaveGroupController,
  promoteAdminController
} from '~/controllers/group.controllers'

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
 * Body: { members: string[] }
 */
chatRouter.post('/:id/members', accessTokenValidator, wrapRequestHandler(addMembersController))

/**
 * Description: Kick member from group
 * Path: /conversations/:id/members
 * Method: DELETE
 * Body: { memberId: string }
 */
chatRouter.delete('/:id/members', accessTokenValidator, wrapRequestHandler(kickMemberController))

/**
 * Description: User tự rời nhóm
 * Path: /conversations/:id/leave
 * Method: DELETE
 */
chatRouter.delete('/:id/leave', accessTokenValidator, wrapRequestHandler(leaveGroupController))

/**
 * Description: Thăng cấp 1 member lên làm Admin
 * Path: /conversations/:id/admin
 * Method: PATCH
 * Body: { memberId: string }
 */
chatRouter.patch('/:id/admin', accessTokenValidator, wrapRequestHandler(promoteAdminController))

/**
 * Description: Pin/Unpin conversation
 * Path: /conversations/:id/pin
 * Method: PATCH
 * Body: { is_pin: boolean }
 */
// ... các route ở trên giữ nguyên ...

chatRouter.patch('/:id/pin', accessTokenValidator, wrapRequestHandler(pinController))

chatRouter.post('/summarize', accessTokenValidator, wrapRequestHandler(summarizeChatController))

chatRouter.post('/ask-ai', accessTokenValidator, wrapRequestHandler(askAIController))

export default chatRouter
