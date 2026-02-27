import { Router } from 'express'
import { getMessagesController } from '~/controllers/message.controllers'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const messageRouter = Router()

/**
 * Description: Get message history with cursor pagination
 * Path: /messages/:convId
 * Method: GET
 * Query: ?cursor=msgId&limit=20
 * Header: { Authorization: Bearer <access_token> }
 */
messageRouter.get('/:convId', accessTokenValidator, wrapRequestHandler(getMessagesController))

export default messageRouter
