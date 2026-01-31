import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { paginationValidator, searchValidator } from '~/middlewares/search.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'

const searchRouter = Router()

searchRouter.get('/', accessTokenValidator, searchValidator, paginationValidator, searchController)

export default searchRouter
