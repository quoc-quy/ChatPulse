import { Request, Response } from 'express'
import httpStatus from '~/constants/httpStatus'
import { TokenPayload } from '~/models/requests/users.requests'
import chatService from '~/services/conversations.services'
import Groq from 'groq-sdk' // <-- Thêm dòng này
import databaseService from '~/services/database.services' // Trỏ đúng đường dẫn tới file database.services của bạn
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
// API 2: CHAT TRỰC TIẾP VỚI AI PULSE (THÔNG MINH ĐỈNH CAO)
// ==========================================
export const askAiController = async (req: Request, res: Response) => {
  const { context, question } = req.body
  const { user_id } = req.decoded_authorization as TokenPayload

  if (!question) {
    return res.status(httpStatus.BAD_REQUEST || 400).json({
      message: 'Thiếu câu hỏi cho AI',
      result: null
    })
  }

  try {
    const userObjectId = new ObjectId(user_id)

    // ----------------------------------------------------
    // A. LẤY DANH SÁCH TÊN BẠN BÈ (Chuẩn theo FriendService)
    // ----------------------------------------------------
    const friends = await databaseService.friends.aggregate([
      { $match: { user_id: userObjectId } },
      { $lookup: { from: 'users', localField: 'friend_id', foreignField: '_id', as: 'friend_info' } },
      { $unwind: '$friend_info' }
    ]).toArray();

    const friendCount = friends.length;
    // Lấy ra danh sách tên để bơm cho AI
    const friendNames = friends.map(f => f.friend_info?.userName || f.friend_info?.fullName || 'Ẩn danh').join(', ');

    let dbContextString = `Thông tin tài khoản: Bạn hiện có ${friendCount} người bạn. Danh sách bạn bè gồm có: ${friendNames || 'Chưa có ai'}.\n\nLịch sử các cuộc trò chuyện gần đây:\n`

    // ----------------------------------------------------
    // B. LẤY CUỘC TRÒ CHUYỆN GẦN ĐÂY
    // ----------------------------------------------------
    const recentConvos = await databaseService.conversations
      .find({ participants: userObjectId }) 
      .sort({ updated_at: -1 })
      .limit(3)
      .toArray()

    // ----------------------------------------------------
    // C. GOM DỮ LIỆU TIN NHẮN & DỊCH TÊN
    // ----------------------------------------------------
    for (const conv of recentConvos) {
      let chatName = conv.name;
      
      // Xử lý tên chat 1-1
      if (!chatName && conv.type === 'direct' && conv.participants) {
        const partnerId = conv.participants.find((id) => id.toString() !== user_id);
        if (partnerId) {
          const partner = await databaseService.users.findOne({ _id: partnerId });
          if (partner) chatName = partner.userName;
        }
      }
      chatName = chatName || 'Chat cá nhân';

      // Lấy 3 tin nhắn cuối
      const recentMessages = await databaseService.messages
        .aggregate([
          { $match: { conversationId: conv._id } },
          { $sort: { createdAt: -1 } },
          { $limit: 3 },
          {
            $lookup: {
              from: 'users',
              localField: 'senderId',
              foreignField: '_id',
              as: 'senderInfo'
            }
          },
          { $unwind: { path: '$senderInfo', preserveNullAndEmptyArrays: true } }
        ])
        .toArray()

      recentMessages.reverse()

      // Lắp ghép lịch sử
      const msgLog = recentMessages.map(m => {
        const isMe = m.senderId.toString() === user_id;
        const realName = m.senderInfo?.userName || m.senderInfo?.fullName || 'Người dùng';
        return `- ${isMe ? 'Tôi' : realName}: ${m.content}`
      }).join('\n')

      dbContextString += `[Đang chat với: ${chatName}]\n${msgLog}\n\n`
    }

    // ----------------------------------------------------
    // D. CHUẨN BỊ PROMPT & GỌI GROQ
    // ----------------------------------------------------
    const chatHistory = (context || [])
      .map((m: any) => `${m.sender?.userName || 'Tôi'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `Bạn là AI Pulse, trợ lý ảo thông minh và bí ẩn của ChatPulse.

    **TÍNH NĂNG ĐIỀU HƯỚNG (RẤT QUAN TRỌNG):**
      Nếu người dùng muốn thực hiện một thao tác yêu cầu chuyển tab/màn hình, bạn BẮT BUỘC phải tạo một đường dẫn để họ bấm vào bằng cú pháp: [Tên nút](nav:TênScreen).
      - Đi tới trang cá nhân (đổi tên, avatar, đăng xuất): Dùng lệnh [Chuyển đến Hồ sơ](nav:Profile)
      - Đi tới danh bạ (tìm bạn bè, kết bạn): Dùng lệnh [Mở Danh bạ](nav:Contacts)
      - Trở về màn hình tin nhắn: Dùng lệnh [Về danh sách Chat](nav:Chat)

    **QUY TẮC CỐT LÕI:**
    1. Trả lời dựa trên SỰ THẬT từ dữ liệu bên dưới. Tuyệt đối KHÔNG BỊA CHUYỆN.
    2. Nếu người dùng hỏi các câu cơ bản (Xin chào, Bạn là ai), hãy trả lời lịch sự, ngắn gọn, không lôi dữ liệu bạn bè ra khoe.
    3. Trả lời cực kỳ tự nhiên, như một người bạn.

    **DỮ LIỆU THỰC TẾ CỦA NGƯỜI DÙNG NÀY:**
    ---
    ${dbContextString}
    ---`

    let userPrompt = question;
    if (chatHistory) {
      userPrompt = `Bối cảnh trò chuyện:\n${chatHistory}\n\nNgười dùng vừa hỏi: "${question}"`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
    })

    const answer = chatCompletion.choices[0]?.message?.content || 'Đường truyền đang gặp sự cố.'

    return res.status(httpStatus.OK).json({
      message: 'Trả lời thành công',
      result: answer
    })
  } catch (error: any) {
    console.error('🚨 LỖI GROQ CHAT:', error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR || 500).json({
      message: 'Lỗi máy chủ',
      result: null
    })
  }
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
    // 1. Format lịch sử 5 tin nhắn gần nhất
    const chatLog = messages
      .map((m: any) => `${m.sender?.userName || 'Người kia'}: ${m.content}`)
      .join('\n')

    // 2. Prompt "ép" AI chỉ nhả ra text trả lời
    const systemInstruction = `Bạn là trợ lý AI thông minh đang giúp người dùng nhắn tin. 
    Dựa vào lịch sử đoạn chat ngắn dưới đây, hãy soạn MỘT câu trả lời tiếp theo thật tự nhiên, thân thiện và đúng ngữ cảnh (có thể dùng emoji).
    YÊU CẦU TỐI THƯỢNG: 
    - CHỈ TRẢ VỀ NỘI DUNG TIN NHẮN.
    - TUYỆT ĐỐI KHÔNG giải thích, KHÔNG bọc trong ngoặc kép, KHÔNG nói "Dưới đây là câu trả lời".`

    // 3. Gọi Groq LLaMA 3
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Lịch sử chat:\n${chatLog}\n\nHãy viết tin nhắn trả lời:` }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
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
