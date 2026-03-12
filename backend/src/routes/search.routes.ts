import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchUserController } from '~/controllers/users.controllers'
import { paginationValidator, searchValidator } from '~/middlewares/search.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'
import { wrapRequestHandler } from '~/utils/handlers'

const searchRouter = Router()

searchRouter.get('/search', accessTokenValidator, searchValidator, searchController)

searchRouter.get(
  '/',
  accessTokenValidator,
  searchValidator,
  paginationValidator,
  searchController,
  wrapRequestHandler(searchUserController)
)

export default searchRouter
