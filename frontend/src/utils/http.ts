import config from '@/constants/config'
import axios, { type AxiosInstance } from 'axios'

class Http {
  instance: AxiosInstance

  constructor() {
    this.instance = axios.create({
      baseURL: config.baseUrl,
      timeout: 1000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

const http = new Http().instance

export default http
