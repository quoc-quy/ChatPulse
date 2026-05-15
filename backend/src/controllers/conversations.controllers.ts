import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/conversations.services'
import Groq from 'groq-sdk'

// 🌟 TUYỆT CHIÊU: Tạo một hàm lấy Groq Client. 
// Hàm này chỉ chạy khi có request tới, lúc này file .env CHẮC CHẮN ĐÃ ĐƯỢC ĐỌC.
const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    console.error("🚨 CRITICAL: Không tìm thấy GROQ_API_KEY trong file .env!");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export const getConversationsController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const limit = Number(req.query.limit) || 20
  const page = Number(req.query.page) || 1

  const conversations = await chatService.getConversations(user_id, limit, page)
  return res.status(httpStatus.OK).json({ message: 'Lấy danh sách hội thoại thành công', result: conversations })
}

export const createConversationController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { type, members, name } = req.body
  const result = await chatService.createConversation(user_id, type, members, name)
  return res.status(httpStatus.OK).json({ message: 'Tạo hội thoại thành công', result })
}

export const getConversationController = async (req: Request, res: Response) => {
  const { id } = req.params as any
  const { user_id } = req.decoded_authorization as TokenPayload
  const conversation = await chatService.getConversationById(id, user_id)
  return res.status(httpStatus.OK).json({ message: 'Lấy chi tiết hội thoại thành công', result: conversation })
}

export const updateGroupController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.decoded_authorization as TokenPayload
  const { name, avatarUrl } = req.body
  const updatedGroup = await chatService.updateGroup(id, user_id, { name, avatarUrl })
  return res.status(httpStatus.OK).json({ message: 'Cập nhật thông tin nhóm thành công', result: updatedGroup })
}

export const markConversationAsSeenController = async (req: Request, res: Response) => {
  const id = req.params.id as string
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await chatService.markAsSeen(id, user_id)
  return res.status(httpStatus.OK).json(result)
}

// ==========================================
// API 1: TÓM TẮT TIN NHẮN (Dùng Groq + .env)
// ==========================================
export const summarizeChatController = async (req: Request, res: Response) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Không có dữ liệu tin nhắn để tóm tắt', result: null })
  }

  try {
    const cleanMessages = messages.filter((m: any) => m.content && typeof m.content === 'string')
    if (cleanMessages.length === 0) {
      return res.status(httpStatus.OK).json({ message: 'Thành công', result: 'Đoạn chat này chủ yếu là hình ảnh hoặc tệp tin, không có văn bản để tóm tắt.' })
    }

    const chatTextWithIds = cleanMessages
      .map((m: any) => `[[ID:${m._id}]] ${m.sender?.userName || 'User'}: ${m.content}`)
      .join('\n')

    const systemInstruction = `Bạn là chuyên gia phân tích dữ liệu. Nhiệm vụ của bạn là tóm tắt hội thoại theo phong cách "Huyền bí & Thông minh".
    QUY TẮC:
    1. Tìm ra các LUỒNG SỰ KIỆN chính.
    2. Chỉ ra các quyết định, mâu thuẫn đã giải quyết, hoặc đầu việc cần làm.
    3. Mỗi dòng tóm tắt BẮT BUỘC kèm theo mã [[ID:...] của tin nhắn quan trọng nhất.
    4. Sử dụng dấu gạch đầu dòng (✦), in đậm từ khóa quan trọng bằng **.`

    // 🌟 Gọi hàm để lấy client an toàn từ .env
    const groq = getGroqClient();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Nội dung cuộc trò chuyện:\n\n${chatTextWithIds}` }
      ],
      model: 'llama-3.1-8b-instant', 
      temperature: 0.3
    })

    const summary = chatCompletion.choices[0]?.message?.content || 'Không thể trích xuất thông tin.'
    return res.status(httpStatus.OK).json({ message: 'Tóm tắt thành công', result: summary })
  } catch (error: any) {
    console.error('🚨 LỖI GROQ API (Summarize):', error.message)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi máy chủ khi gọi AI (Groq)', result: null })
  }
}

export const askAIController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { context, question } = req.body
  const answer = await chatService.askChatPulseAI(user_id, context, question)
  return res.status(httpStatus.OK).json({ message: 'AI trả lời thành công', result: answer })
}

// ==========================================
// API 3: AI GỢI Ý TRẢ LỜI (Dùng Groq + .env)
// ==========================================
export const suggestReplyController = async (req: Request, res: Response) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(httpStatus.BAD_REQUEST).json({ message: 'Thiếu dữ liệu', result: null })
  }

  try {
    const chatLog = messages
      .filter((m: any) => typeof m.content === 'string')
      .slice(-5)
      .map((m: any) => `${m.sender?.userName || 'Người kia'}: ${m.content}`)
      .join('\n')

    const systemInstruction = `Bạn là người dùng. Viết giúp tôi MỘT CÂU TRẢ LỜI ngắn gọn cho tin nhắn cuối. 
    YÊU CẦU: Văn phong chat tự nhiên, dùng icon. CHỈ TRẢ VỀ NỘI DUNG TIN NHẮN.`

    // 🌟 Gọi hàm để lấy client an toàn từ .env
    const groq = getGroqClient();

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Lịch sử chat:\n${chatLog}\n\nHãy viết tiếp tin nhắn trả lời:` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7
    })

    const suggestion = chatCompletion.choices[0]?.message?.content || ''
    return res.status(httpStatus.OK).json({ message: 'Gợi ý thành công', result: suggestion.trim().replace(/^"|"$/g, '') })
  } catch (error: any) {
    console.error('🚨 LỖI GROQ API (Suggest):', error.message)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Lỗi máy chủ', result: null })
  }
}

export const deleteConversationController = async (req: Request, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { id } = req.params as { id: string }
  const result = await chatService.deleteConversation(user_id, id)
  return res.status(httpStatus.OK).json({ message: 'Xóa lịch sử trò chuyện thành công', result })
}