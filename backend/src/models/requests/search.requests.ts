import { Query } from 'express-serve-static-core'

export interface Pagination {
  limit: string
  page: string
}

export interface SearchQuery extends Pagination, Query {
  userName: string
  phone: string
}
