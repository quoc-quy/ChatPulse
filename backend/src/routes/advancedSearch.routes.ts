import { Router } from 'express'
import { searchController } from '~/controllers/search.controllers'
import { searchValidator } from '~/middlewares/search.middlewares'
import { accessTokenValidator } from '~/middlewares/users.middlewares'

const advancedSearchRouter = Router()

advancedSearchRouter.get('/', accessTokenValidator, searchValidator, searchController)

export default advancedSearchRouter
