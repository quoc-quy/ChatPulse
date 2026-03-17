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

// ==========================================
// API 1: TÓM TẮT TIN NHẮN (CHỈNH CHU LẠI PROMPT)
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
    // 1. CHUẨN BỊ DỮ LIỆU
    const chatTextWithIds = messages
      .map((m: any) => `[[MESSAGE_ID:${m._id}]] ${m.sender?.userName || 'Người dùng'}: ${m.content}`)
      .join('\n')

    // 2. PROMPT "SIÊU GẮT" CHO TÓM TẮT
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

    // 3. GỌI API VỚI PROMPT TÓM TẮT
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Dưới đây là nội dung cuộc trò chuyện:\n\n${chatTextWithIds}` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3, // Giảm nhiệt độ xuống 0.3 để AI phân tích logic và chính xác hơn, bớt bịa chuyện
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

// ==========================================
// API 2: CHAT TRỰC TIẾP VỚI AI PULSE (ĐÃ ĐƯỢC TRAIN KIẾN THỨC VỀ APP)
// ==========================================
export const askAiController = async (req: Request, res: Response) => {
  const { context, question } = req.body

  if (!question) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Thiếu câu hỏi cho AI',
      result: null
    })
  }

  try {
    // 1. Định dạng lịch sử chat
    const chatHistory = (context || [])
      .map((m: any) => `${m.sender?.userName || 'Người dùng'}: ${m.content}`)
      .join('\n')

    // 2. PROMPT NHẬP VAI & BƠM KIẾN THỨC VỀ CHATPULSE
   // Cập nhật đoạn này trong askAiController (Backend)
    const systemPrompt = `Bạn là AI Pulse, trợ lý ảo thanh lịch, thông minh và bí ẩn độc quyền của ứng dụng nhắn tin ChatPulse.

      **TÍNH CÁCH & QUY TẮC:**
      1. Xưng "tôi", gọi người dùng là "bạn". Trả lời cực kỳ ngắn gọn, súc tích, mang phong cách công nghệ.
      2. KHÔNG BAO GIỜ nói lộ ra bạn là AI của Groq hay Llama.

      **TÍNH NĂNG ĐIỀU HƯỚNG (RẤT QUAN TRỌNG):**
      Nếu người dùng muốn thực hiện một thao tác yêu cầu chuyển tab/màn hình, bạn BẮT BUỘC phải tạo một đường dẫn để họ bấm vào bằng cú pháp: [Tên nút](nav:TênScreen).
      - Đi tới trang cá nhân (đổi tên, avatar, đăng xuất): Dùng lệnh [Chuyển đến Hồ sơ](nav:Profile)
      - Đi tới danh bạ (tìm bạn bè, kết bạn): Dùng lệnh [Mở Danh bạ](nav:Contacts)
      - Trở về màn hình tin nhắn: Dùng lệnh [Về danh sách Chat](nav:Chat)

      **CẨM NANG HƯỚNG DẪN SỬ DỤNG CHATPULSE:**
      - **Thu hồi/Xóa tin nhắn:** Nhấn giữ tin nhắn -> Chọn "Thu hồi" hoặc "Xóa phía tôi".
      - **Thả cảm xúc:** Nhấn đúp để thả tim nhanh, hoặc nhấn giữ tin nhắn.
      - **Đổi thông tin cá nhân:** Bạn có thể làm điều này tại trang cá nhân. [Đi đến Hồ sơ của bạn](nav:Profile)
      - **Tìm bạn bè mới:** Hãy chuyển sang danh bạ để tìm kiếm. [Mở Danh bạ ngay](nav:Contacts)`

    // 3. Gom bối cảnh và câu hỏi
    let userPrompt = question;
    if (chatHistory) {
      userPrompt = `Đây là lịch sử trò chuyện của chúng ta:\n${chatHistory}\n\nNgười dùng hỏi: "${question}"`;
    }

    // 4. Gọi API
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5, // Hạ nhiệt độ xuống một chút (0.5) để AI hướng dẫn chính xác các bước, không tự bịa ra tính năng ảo
    })

    const answer = chatCompletion.choices[0]?.message?.content || 'Xin lỗi, tín hiệu thần giao cách cảm đang bị nhiễu.'

    return res.status(httpStatus.OK).json({
      message: 'Trả lời thành công',
      result: answer
    })
  } catch (error: any) {
    console.error('🚨 CHI TIẾT LỖI GROQ CHAT (Ask AI):', error.response ? error.response.data : error.message)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ khi gọi AI',
      result: null
    })
  }
}


