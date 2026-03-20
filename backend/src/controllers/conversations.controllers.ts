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
      temperature: 0.3, 
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
// API 2: CHAT TRỰC TIẾP VỚI AI PULSE (TỰ HÀNH + THẤU CẢM)
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

    // A. LẤY BỐI CẢNH BẠN BÈ
    const friends = await databaseService.friends.aggregate([
      { $match: { user_id: userObjectId } },
      { $lookup: { from: 'users', localField: 'friend_id', foreignField: '_id', as: 'friend_info' } },
      { $unwind: '$friend_info' }
    ]).toArray();

    const friendCount = friends.length;
    const friendNames = friends.map(f => f.friend_info?.userName || f.friend_info?.fullName || 'Ẩn danh').join(', ');

    let dbContextString = `Thông tin tài khoản: Bạn hiện có ${friendCount} người bạn. Danh sách bạn bè gồm có: ${friendNames || 'Chưa có ai'}.\n\nLịch sử các cuộc trò chuyện gần đây:\n`

    // B. LẤY CUỘC TRÒ CHUYỆN GẦN ĐÂY
    const recentConvos = await databaseService.conversations
      .find({ participants: userObjectId }) 
      .sort({ updated_at: -1 })
      .limit(3)
      .toArray()

    // C. GOM DỮ LIỆU TIN NHẮN
    for (const conv of recentConvos) {
      let chatName = conv.name;
      
      if (!chatName && conv.type === 'direct' && conv.participants) {
        const partnerId = conv.participants.find((id) => id.toString() !== user_id);
        if (partnerId) {
          const partner = await databaseService.users.findOne({ _id: partnerId });
          if (partner) chatName = partner.userName;
        }
      }
      chatName = chatName || 'Chat cá nhân';

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

      const msgLog = recentMessages.map(m => {
        const isMe = m.senderId.toString() === user_id;
        const realName = m.senderInfo?.userName || m.senderInfo?.fullName || 'Người dùng';
        return `- ${isMe ? 'Tôi' : realName}: ${m.content}`
      }).join('\n')

      dbContextString += `[Đang chat với: ${chatName}]\n${msgLog}\n\n`
    }

    // D. CHUẨN BỊ PROMPT "GỘP CHUNG"
    const chatHistory = (context || [])
      .map((m: any) => `${m.sender?.userName || 'Tôi'}: ${m.content}`)
      .join('\n')

    const systemPrompt = `Bạn là AI Pulse, trợ lý ảo tự hành thông minh và tinh tế của ChatPulse.

    **1. TÍNH NĂNG TỰ ĐỘNG GỬI TIN NHẮN (QUAN TRỌNG NHẤT):**
    Nếu người dùng ra lệnh cho bạn nhắn tin/chúc mừng/thông báo cho một ai đó (ví dụ: "chúc mừng sinh nhật quytran", "nhắn cho nam bảo tôi đến trễ").
    Bạn PHẢI tự động soạn nội dung thật hay và trả về CHÍNH XÁC cú pháp sau (Không thêm bất kỳ chữ nào khác):
    [EXECUTE_SEND]
    Target: <tên_người_nhận_viết_liền_không_dấu>
    Message: <Nội_dung_tin_nhắn_bạn_vừa_soạn>
    [/EXECUTE_SEND]

    **2. TÍNH NĂNG ĐIỀU HƯỚNG:**
    Nếu người dùng muốn thực hiện thao tác chuyển trang, bạn BẮT BUỘC tạo đường dẫn bằng cú pháp: [Tên nút](nav:TênScreen).
    - Đổi tên, avatar, đăng xuất: [Chuyển đến Hồ sơ](nav:Profile)
    - Tìm bạn bè, kết bạn: [Mở Danh bạ](nav:Contacts)
    - Về trang chủ tin nhắn: [Về danh sách Chat](nav:Chat)

    **3. QUY TẮC CỐT LÕI KHI TRÒ CHUYỆN BÌNH THƯỜNG:**
    - Nếu người dùng KHÔNG yêu cầu gửi tin nhắn hay chuyển trang, hãy đóng vai một người bạn đồng hành.
    - Đọc kỹ "Lịch sử trò chuyện gần đây" bên dưới để hiểu rõ bối cảnh và ý đồ của người đang chat cùng (đối phương).
    - Đưa ra lời khuyên hoặc phản hồi dựa trên sự đồng cảm với ngữ cảnh đó. Trả lời dựa trên SỰ THẬT từ dữ liệu. Tuyệt đối KHÔNG BỊA CHUYỆN những thứ nằm ngoài dữ liệu được cung cấp.

    **DỮ LIỆU THỰC TẾ VỀ BẠN BÈ VÀ CÁC CUỘC TRÒ CHUYỆN GẦN ĐÂY CỦA TÔI:**
    ---
    ${dbContextString}
    ---`

    let userPrompt = question;
    if (chatHistory) {
      userPrompt = `Bối cảnh cuộc trò chuyện hiện tại của chúng ta:\n${chatHistory}\n\nNgười dùng yêu cầu: "${question}"`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.6,
    })

    const answer = chatCompletion.choices[0]?.message?.content || 'Đường truyền đang gặp sự cố.'

    // ========================================================
    // E. BẮT MẬT MÃ VÀ THỰC THI LỆNH GỬI TIN NHẮN (NẾU CÓ)
    // ========================================================
    const sendRegex = /\[EXECUTE_SEND\][\s\S]*?Target:\s*([^\n\r]+)[\s\S]*?Message:\s*([\s\S]*?)\[\/EXECUTE_SEND\]/i;
    const match = answer.match(sendRegex);

    if (match) {
      const targetUsername = match[1].trim().replace('@', '');
      const generatedMessage = match[2].trim();

      const targetUser = await databaseService.users.findOne({ userName: targetUsername });
      
      if (!targetUser) {
        return res.status(httpStatus.OK).json({ 
          message: 'Trả lời thành công', 
          result: `Xin lỗi, tôi không tìm thấy ai có tên người dùng là "${targetUsername}" trong danh sách của bạn để gửi tin nhắn.` 
        })
      }

      let conversation = await databaseService.conversations.findOne({
        type: 'direct',
        participants: { $all: [userObjectId, targetUser._id] }
      });

      if (!conversation) {
        conversation = await chatService.createConversation(user_id, 'direct', [targetUser._id.toString()], '');
      }

      const newMessage = {
        _id: new ObjectId(),
        conversationId: conversation._id,
        senderId: userObjectId, 
        type: 'text',
        content: generatedMessage,
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await databaseService.messages.insertOne(newMessage);

      await databaseService.conversations.updateOne(
        { _id: conversation._id },
        { 
          $set: { 
            lastMessage: newMessage, 
            updated_at: new Date() 
          },
          $inc: { unread_count: 1 } 
        }
      );

      return res.status(httpStatus.OK).json({ 
        message: 'Trả lời thành công', 
        result: `✅ **Đã gửi thành công!**\n\nTôi đã nhắn cho **${targetUsername}** nội dung sau:\n\n*"${generatedMessage}"*` 
      })
    }

    // Nếu không có mật mã gửi tin, trả lời bình thường
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
    const chatLog = messages
      .map((m: any) => `${m.sender?.userName || 'Người kia'}: ${m.content}`)
      .join('\n')

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