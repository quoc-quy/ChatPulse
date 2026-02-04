import config from '@/constants/config'
import axios, { type AxiosInstance } from 'axios'
import {
  clearLS,
  getAccessTokenFromLS,
  getRefreshTokenFromLS,
  setAccessTokenToLS,
  setProfileFromLS,
  setRefreshTokenToLS
} from './auth'

class Http {
  instance: AxiosInstance
  private access_token: string
  private refresh_token: string

  constructor() {
    this.access_token = getAccessTokenFromLS()
    this.refresh_token = getRefreshTokenFromLS()

    this.instance = axios.create({
      baseURL: config.baseUrl,
      timeout: 1000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    this.instance.interceptors.request.use(
      (config) => {
        if (this.access_token && config.headers) {
          config.headers.Authorization = this.access_token
          return config
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    this.instance.interceptors.response.use((response) => {
      const { url } = response.config
      if (url == '/users/login' || url == '/users/register') {
        const data = response.data
        this.access_token = data.result.access_token
        this.refresh_token = data.result.refresh_token
        setAccessTokenToLS(this.access_token)
        setRefreshTokenToLS(this.refresh_token)
        setProfileFromLS(data.result.user)
      } else {
        if (url == '/users/logout') {
          this.access_token = ''
          this.refresh_token = ''
          clearLS()
        }
      }
      return response
    })
  }
}

const http = new Http().instance

export default http
