import http from '@/utils/http'

const searchApi = {
  advancedSearch(params: { userName?: string; phone?: string }) {
    return http.get('/advanced-search', {
      params
    })
  }
}

export default searchApi
