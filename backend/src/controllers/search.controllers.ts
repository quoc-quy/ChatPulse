import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { SearchQuery } from '~/models/requests/search.requests'
import { TokenPayload } from '~/models/requests/users.requests'
import searchService from '~/services/search.services'

export const searchController = async (
  req: Request<ParamsDictionary, any, any, SearchQuery>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await searchService.search({
    user_id,
    userName: req.query.userName,
    phone: req.query.phone
  })

  return res.json({
    message: 'Tìm kiếm người dùng thành công',
    result: {
      users: result.users
    }
  })
}
