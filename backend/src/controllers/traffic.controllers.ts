import { Request, Response } from 'express'
import trafficRagService from '../services/ai/traffic_rag.service'

export const askTrafficController = async (req: Request, res: Response) => {
  try {
    const { question } = req.body

    if (!question) {
      return res.status(400).json({ message: 'Vui lòng cung cấp câu hỏi', data: null })
    }

    // Gọi service RAG để xử lý câu hỏi
    const answer = await trafficRagService.askTrafficQuestion(question)

    // Trả kết quả về cho Frontend
    res.json({ message: 'Success', data: answer })
  } catch (error) {
    console.error('Lỗi khi hỏi Traffic AI:', error)
    res.status(500).json({ message: 'Lỗi Server khi xử lý RAG', error })
  }
}
