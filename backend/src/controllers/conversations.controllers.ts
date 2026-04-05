import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/conversations.services'
import Groq from 'groq-sdk'
import databaseService from '~/services/database.services'
import { ObjectId } from 'mongodb'

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

  return res.status(httpStatus.OK).json({
    message: 'Cập nhật thông tin nhóm thành công',
    result: updatedGroup
  })
}

export const markConversationAsSeenController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.decoded_authorization as TokenPayload

  const result = await chatService.markAsSeen(id, user_id)

  return res.status(httpStatus.OK).json(result)
}

// ==========================================
// API 1: TÓM TẮT TIN NHẮN
// ==========================================
export const summarizeChatController = async (req: Request, res: Response) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Không có dữ liệu tin nhắn để tóm tắt',
      result: null
    })
  }

  try {
    const chatTextWithIds = messages
      .map((m: any) => `[[MESSAGE_ID:${m._id}]] ${m.sender?.userName || 'Người dùng'}: ${m.content}`)
      .join('\n')

    const systemInstruction = `Bạn là chuyên gia phân tích dữ liệu của ChatPulse. Nhiệm vụ của bạn là giải mã và tóm tắt hội thoại theo phong cách "Huyền bí & Thông minh".

QUY TẮC TƯ DUY:
1. GOM NHÓM (CHỦ CHỐT): Tuyệt đối không liệt kê "Ai nói gì". Hãy tìm ra các LUỒNG SỰ KIỆN. 
   - Ví dụ: Thay vì "A bảo đi ăn, B đồng ý", hãy viết "Mọi người đã chốt địa điểm ăn trưa tại [Nội dung] sau khi cân nhắc các lựa chọn [xem:ID]".
2. TRÍCH XUẤT GIÁ TRỊ: Chỉ ra các quyết định, mâu thuẫn đã giải quyết, hoặc các đầu việc cần làm.
3. LIÊN KẾT NGUỒN: Mỗi dòng tóm tắt BẮT BUỘC phải kèm theo 1 mã [xem:ID] của tin nhắn quan trọng nhất (tin nhắn chứa kết luận hoặc bằng chứng thép).
4. PHONG CÁCH: 
   - Sử dụng dấu gạch đầu dòng (✦) cho mỗi chủ đề.
   - In đậm các từ khóa quan trọng và tên người thực hiện bằng **.
   - Ngôn ngữ sắc sảo, ngắn gọn, tập trung vào kết quả.`

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Dưới đây là nội dung cuộc trò chuyện:\n\n${chatTextWithIds}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3
    })

    const summary = chatCompletion.choices[0]?.message?.content || 'Không thể trích xuất thông tin.'

    return res.status(httpStatus.OK).json({
      message: 'Tóm tắt thành công',
      result: summary
    })
  } catch (error) {
    console.error('Lỗi khi gọi Groq API (Summarize):', error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ khi gọi AI',
      result: null
    })
  }
}

export const askAIController = async (req: Request, res: Response) => {
  // Lấy ID của user đang gửi yêu cầu từ Token bảo mật
  const { user_id } = req.decoded_authorization as TokenPayload
  const { context, question } = req.body

  // Truyền user_id xuống để Backend lấy đúng data của user đó
  const answer = await chatService.askChatPulseAI(user_id, context, question)

  return res.status(httpStatus.OK).json({
    message: 'AI trả lời thành công',
    result: answer
  })
}

// ==========================================
// API 3: AI SOẠN TIN NHẮN TRẢ LỜI GIÚP NGƯỜI DÙNG
// ==========================================
export const suggestReplyController = async (req: Request, res: Response) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Không có dữ liệu tin nhắn để gợi ý',
      result: null
    })
  }

  try {
    const chatLog = messages.map((m: any) => `${m.sender?.userName || 'Người kia'}: ${m.content}`).join('\n')

    const systemInstruction = `Bạn là chính tôi (người dùng). Nhiệm vụ của bạn là đọc tin nhắn cuối cùng của người đang chat với tôi, và viết giúp tôi MỘT CÂU TRẢ LỜI ngắn gọn, phản xạ tự nhiên.
    
    YÊU CẦU:
    - Bắt chước văn phong chat hàng ngày (có thể dùng icon, tiếng lóng nhẹ nhàng nếu phù hợp bối cảnh).
    - Phải logic và tiếp nối đúng ý người kia vừa nói (Đồng ý, hỏi lại, đùa giỡn...).
    - CHỈ TRẢ VỀ NỘI DUNG TIN NHẮN ĐỂ GỬI ĐI. TUYỆT ĐỐI không giải thích, không dùng ngoặc kép, không xưng hô "Tôi đề xuất:".`

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Lịch sử đoạn chat hiện tại:\n${chatLog}\n\nHãy viết tiếp tin nhắn tôi nên trả lời:` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7
    })

    const suggestion = chatCompletion.choices[0]?.message?.content || ''

    return res.status(httpStatus.OK).json({
      message: 'Gợi ý thành công',
      result: suggestion.trim()
    })
  } catch (error) {
    console.error('🚨 LỖI GROQ API (Suggest Reply):', error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ',
      result: null
    })
  }
}
