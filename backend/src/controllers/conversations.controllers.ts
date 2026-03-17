import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/conversations.services'
import Groq from 'groq-sdk' // <-- Thêm dòng này

// Khởi tạo SDK với API Key từ file .env
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

export const getConversationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const limit = Number(req.query.limit) || 20
  const page = Number(req.query.page) || 1

  const conversations = await chatService.getConversations(user_id, limit, page)

  return res.status(httpStatus.OK).json({
    message: 'Lấy danh sách hội thoại thành công',
    result: conversations
  })
}

export const createConversationController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { type, members, name } = req.body

  const result = await chatService.createConversation(user_id, type, members, name)

  return res.status(httpStatus.OK).json({
    message: 'Tạo hội thoại thành công',
    result
  })
}

export const getConversationController = async (req: Request, res: Response) => {
  const { id } = req.params as any
  const { user_id } = req.decoded_authorization as TokenPayload

  const conversation = await chatService.getConversationById(id, user_id)

  return res.status(httpStatus.OK).json({
    message: 'Lấy chi tiết hội thoại thành công',
    result: conversation
  })
}

export const updateGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.decoded_authorization as TokenPayload
  const { name, avatarUrl } = req.body

  const updatedGroup = await chatService.updateGroup(id, user_id, { name, avatarUrl })

  // TODO: Tích hợp Socket.io để emit sự kiện 'group_updated'
  // Ví dụ: socketService.io.to(id).emit('group_updated', updatedGroup)

  return res.status(httpStatus.OK).json({
    message: 'Cập nhật thông tin nhóm thành công',
    result: updatedGroup
  })
}

export const markConversationAsSeenController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await chatService.markAsSeen(id, user_id)

  // TODO: Tích hợp Socket.io để emit sự kiện 'message_seen' cho các client khác
  // socketService.io.to(id).emit('message_seen', { conversationId: id, userId: user_id })

  return res.status(httpStatus.OK).json(result)
}

export const summarizeChatController = async (req: Request, res: Response) => {
  // Lấy danh sách tin nhắn từ body do App gửi lên
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Không có dữ liệu tin nhắn để tóm tắt',
      result: null
    })
  }

  try {
    // 1. Chuyển đổi mảng object tin nhắn thành chuỗi văn bản cho AI dễ đọc
    const chatText = messages
      .map((m: any) => `${m.sender?.userName || 'Người dùng'}: ${m.content}`)
      .join('\n')

    // 2. Tạo Prompt (Câu lệnh) ép AI trả lời ngắn gọn
    const prompt = `Bạn là một trợ lý AI thông minh trong ứng dụng nhắn tin ChatPulse. Hãy tóm tắt thật ngắn gọn, súc tích (khoảng 3-4 gạch đầu dòng) nội dung cuộc trò chuyện sau bằng tiếng Việt. Bắt buộc không được giải thích gì thêm, chỉ in ra các gạch đầu dòng:\n\n${chatText}`

    // 3. Gọi Groq API 
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant', // <--- SỬA DÒNG NÀY (Thay cho llama3-8b-8192 cũ)
      temperature: 0.5,
    })

    // 4. Lấy kết quả từ AI
    const summary = chatCompletion.choices[0]?.message?.content || 'Không thể tóm tắt.'

    // 5. Trả về cho React Native
    return res.status(httpStatus.OK).json({
      message: 'Tóm tắt tin nhắn thành công',
      result: summary
    })
  } catch (error) {
    console.error('Lỗi khi gọi Groq API:', error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ khi gọi AI',
      result: null
    })
  }
}

export const askAiController = async (req: Request, res: Response) => {
  const { context, question } = req.body

  if (!question) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Thiếu câu hỏi cho AI',
      result: null
    })
  }

  try {
    // 1. Định dạng lại lịch sử chat để AI đọc hiểu được bối cảnh
    const chatHistory = (context || [])
      .map((m: any) => `${m.sender?.userName || 'Người dùng'}: ${m.content}`)
      .join('\n')

    // 2. Tạo câu lệnh gom cả bối cảnh cũ và câu hỏi mới
    const prompt = `Đây là lịch sử cuộc trò chuyện gần đây của mọi người:\n${chatHistory}\n\nDựa vào lịch sử trên, hãy trả lời câu hỏi sau một cách ngắn gọn, thân thiện bằng tiếng Việt: "${question}"`

    // 3. Gọi Groq API (Nhớ dùng model mới giống lúc nãy nhé)
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant', 
      temperature: 0.7, // Cho AI sáng tạo hơn một chút khi chat
    })

    const answer = chatCompletion.choices[0]?.message?.content || 'Xin lỗi, tôi không thể tìm ra câu trả lời.'

    // 4. Trả kết quả về cho App
    return res.status(httpStatus.OK).json({
      message: 'Trả lời thành công',
      result: answer
    })
  } catch (error: any) {
    console.error('🚨 CHI TIẾT LỖI GROQ CHAT:', error.response ? error.response.data : error.message)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ khi gọi AI',
      result: null
    })
  }
}
