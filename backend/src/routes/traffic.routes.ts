import { Router } from 'express'
import { askTrafficController } from '../controllers/traffic.controllers'

const trafficRouter = Router()

// Tạo endpoint POST: /traffic-ai/ask
trafficRouter.post('/ask', askTrafficController)

export default trafficRouter
