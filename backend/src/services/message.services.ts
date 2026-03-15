import { ObjectId } from 'mongodb'
import databaseService from '~/services/database.services'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import Message from '~/models/schemas/message.schema'
import socketService from './socket.services'
import { GoogleGenerativeAI } from '@google/generative-ai'

class MessageService {
  async getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 20) {
    const convObjectId = new ObjectId(conversationId)
    const userObjectId = new ObjectId(userId)

    // 1. Kiểm tra tồn tại và quyền truy cập
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    // TÌM KIẾM TRONG MẢNG MEMBERS (Thêm dấu ? sau userId phòng trường hợp field bị sai tên)
    let userMember = conversation.members?.find(
      (member: any) => member.userId?.toString() === userId || member.user_id?.toString() === userId
    )

    // FIX LỖI: FALLBACK TƯƠNG THÍCH NGƯỢC VỚI DỮ LIỆU CŨ
    // Nếu mảng members không có, nhưng user vẫn nằm trong participants cũ
    if (!userMember && conversation.participants) {
      const isOldParticipant = conversation.participants.some((p: ObjectId) => p.toString() === userId)

      if (isOldParticipant) {
        // Tạo một object member "ảo" để code đi tiếp xuống dưới mà không bị crash
        userMember = {
          userId: new ObjectId(userId),
          role: 'member'
        }
      }
    }

    // Nếu qua cả 2 vòng check trên mà vẫn không có thì mới văng lỗi 403
    if (!userMember) {
      throw new ErrorWithStatus({
        message: 'Bạn không có quyền xem tin nhắn của hội thoại này',
        status: httpStatus.FORBIDDEN
      })
    }

    // 2. Xây dựng điều kiện truy vấn ($match)
    const matchCondition: any = {
      conversationId: convObjectId,
      // Tính năng Soft Delete: Bỏ qua tin nhắn user đã xóa (hỗ trợ cả 2 schema cũ/mới)
      $and: [{ deletedByUsers: { $ne: userObjectId } }, { deleted_by_users: { $ne: userObjectId } }]
    }

    // Tính năng Clear History: Chỉ lấy tin nhắn sau thời điểm dọn lịch sử
    if (userMember.clearedHistoryAt) {
      matchCondition.createdAt = { $gt: userMember.clearedHistoryAt }
    }

    // Phân trang bằng Cursor: Chỉ lấy tin nhắn cũ hơn cursor hiện tại
    if (cursor) {
      matchCondition._id = { $lt: new ObjectId(cursor) }
    }

    // 3. Thực thi truy vấn
    const messages = await databaseService.messages
      .aggregate([
        { $match: matchCondition },
        { $sort: { createdAt: -1 } }, // Sắp xếp giảm dần (mới nhất lên đầu)
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderInfo'
          }
        },
        { $unwind: '$senderInfo' },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            type: 1,
            content: 1,
            isEdited: 1,
            isDeleted: 1,
            replyToId: 1,
            reactions: 1,
            callInfo: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              _id: '$senderInfo._id',
              userName: '$senderInfo.userName',
              avatar: '$senderInfo.avatar'
            }
          }
        }
      ])
      .toArray()

    return messages
  }

  async sendMessage(
    userId: string,
    convId: string,
    type: 'text' | 'sticker' | 'system',
    content: string,
    replyToId?: string
  ) {
    const userObjectId = new ObjectId(userId)
    const convObjectId = new ObjectId(convId)

    // 1. Kiểm tra hội thoại và quyền thành viên
    const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
    if (!conversation) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy cuộc hội thoại',
        status: httpStatus.NOT_FOUND
      })
    }

    const isMember =
      conversation.members?.some((m: any) => m.userId?.toString() === userId || m.user_id?.toString() === userId) ||
      conversation.participants?.some((p: ObjectId) => p.toString() === userId)

    if (!isMember) {
      throw new ErrorWithStatus({
        message: 'Bạn không có quyền gửi tin nhắn vào hội thoại này',
        status: httpStatus.FORBIDDEN
      })
    }

    // 2. Khởi tạo đối tượng Message mới
    const newMessage = new Message({
      conversationId: convObjectId,
      senderId: userObjectId,
      type,
      content,
      replyToId: replyToId ? new ObjectId(replyToId) : undefined
    })

    // Lưu vào database
    const insertResult = await databaseService.messages.insertOne(newMessage)
    const messageId = insertResult.insertedId

    // 3. Cập nhật bảng Conversation (last_message_id, updated_at và lastViewedMessageId của người gửi)
    await databaseService.conversations.updateOne(
      { _id: convObjectId },
      {
        $set: {
          last_message_id: messageId,
          updated_at: new Date()
        }
      }
    )

    // Update High Water Mark cho người gửi (xem như họ đã đọc tin nhắn mới nhất này)
    await databaseService.conversations.updateOne(
      { _id: convObjectId, 'members.userId': userObjectId },
      {
        $set: {
          'members.$.lastViewedMessageId': messageId
        }
      }
    )

    // 4. Lấy thông tin chi tiết của tin nhắn vừa gửi (kèm user gửi)
    const messages = await databaseService.messages
      .aggregate([
        { $match: { _id: messageId } },
        {
          $lookup: {
            from: 'users',
            localField: 'senderId',
            foreignField: '_id',
            as: 'senderInfo'
          }
        },
        { $unwind: '$senderInfo' },
        {
          $project: {
            _id: 1,
            conversationId: 1,
            type: 1,
            content: 1,
            replyToId: 1,
            reactions: 1,
            createdAt: 1,
            updatedAt: 1,
            sender: {
              _id: '$senderInfo._id',
              userName: '$senderInfo.userName', // FIX: Đã đổi thành userName (N hoa)
              avatar: '$senderInfo.avatar'
            }
          }
        }
      ])
      .toArray()

    const populatedMessage = messages[0]

    // ==========================================
    // 5. EMIT SOCKET: Gom ID từ cả participants và members để bắn Realtime
    // ==========================================
    const targetUserIds = new Set<string>()

    // Lấy ID từ mảng participants
    if (conversation.participants) {
      conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
    }

    // Lấy ID từ mảng members
    if (conversation.members) {
      conversation.members.forEach((m: any) => {
        const mId = m.userId?.toString() || m.user_id?.toString()
        if (mId) targetUserIds.add(mId)
      })
    }

    // Lặp qua Set (đã loại bỏ ID trùng lặp) và phát sự kiện socket
    targetUserIds.forEach((id) => {
      socketService.emitToUser(id, 'receive_message', populatedMessage)
    })
    // ==========================================

    return populatedMessage
  }
  // ==========================================================
  // 1. Hàm Chỉnh sửa tin nhắn
  async editMessage(messageId: string, userId: string, newContent: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: new ObjectId(messageId),
        senderId: new ObjectId(userId) // Bảo mật: Chỉ người gửi mới được sửa
      },
      {
        $set: {
          content: newContent,
          isEdited: true, // Đánh dấu đã sửa để FE hiển thị nhãn
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  }

  // 2. Hàm Thu hồi tin nhắn (Recall)
  async recallMessage(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: new ObjectId(messageId),
        senderId: new ObjectId(userId) // Bảo mật: Chỉ người gửi mới được thu hồi
      },
      {
        $set: {
          isDeleted: true, // Đánh dấu đã xóa/thu hồi
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )
    return result
  }
  async reactMessage(messageId: string, userId: string, emoji: string) {
    const messageObjId = new ObjectId(messageId)
    const userObjId = new ObjectId(userId)

    // 1. Lấy tin nhắn và thông tin người đang thả cảm xúc
    const [message, user] = await Promise.all([
      databaseService.messages.findOne({ _id: messageObjId }),
      databaseService.users.findOne({ _id: userObjId })
    ])

    if (!message) throw new ErrorWithStatus({ message: 'Tin nhắn không tồn tại', status: 404 })
    if (!user) throw new ErrorWithStatus({ message: 'User không tồn tại', status: 404 })

    let updateQuery: any = {}

    // 2. Logic Xóa tất cả cảm xúc của user này (Khi bấm nút X)
    if (emoji === 'REMOVE_ALL') {
      updateQuery = {
        $pull: {
          reactions: {
            $or: [{ user_id: userObjId }, { userId: userObjId }]
          }
        }
      }
    } else {
      // 3. Logic Toggle: Kiểm tra xem user đã thả emoji NÀY chưa?
      const hasReactedThisEmoji = message.reactions?.find((r: any) => {
        const reactionUserId = r?.user_id || r?.userId
        return reactionUserId?.toString?.() === userId && r?.emoji === emoji
      })

      if (hasReactedThisEmoji) {
        // Đã thả -> Hủy (Pull)
        updateQuery = {
          $pull: {
            reactions: {
              emoji: emoji,
              $or: [{ user_id: userObjId }, { userId: userObjId }]
            }
          }
        }
      } else {
        // Chưa thả -> Thêm mới (Push) kèm theo thông tin User (Denormalization để FE hiện Modal)
        updateQuery = {
          $push: {
            reactions: {
              user_id: userObjId, // Đổi userId -> user_id cho khớp với FE
              emoji: emoji,
              user: {
                _id: user._id,
                userName: user.userName,
                avatar: user.avatar
              },
              createdAt: new Date()
            }
          }
        }
      }
    }

    const result = await databaseService.messages.findOneAndUpdate({ _id: messageObjId }, updateQuery, {
      returnDocument: 'after'
    })

    // 4. EMIT SOCKET: Thông báo cho mọi người trong nhóm biết
    const conversation = await databaseService.conversations.findOne({ _id: message.conversationId })
    if (conversation) {
      const targetUserIds = new Set<string>()

      if (conversation.participants) {
        conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
      }
      if (conversation.members) {
        conversation.members.forEach((m: any) => {
          const mId = m.userId?.toString() || m.user_id?.toString()
          if (mId) targetUserIds.add(mId)
        })
      }

      const updatedReactions = result?.reactions || result?.value?.reactions || []

      targetUserIds.forEach((id) => {
        socketService.emitToUser(id, 'message_reacted', {
          messageId: messageId,
          reactions: updatedReactions
        })
      })
    }

    return result
  }
  // 4. Hàm Thu hồi Reaction
  async revokeMessage(messageId: string, userId: string) {
    const messageObjId = new ObjectId(messageId)

    // 1. Cập nhật tin nhắn thành trạng thái thu hồi
    const result = await databaseService.messages.findOneAndUpdate(
      {
        _id: messageObjId,
        senderId: new ObjectId(userId) // Bảo mật: Chỉ chủ nhân mới được thu hồi
      },
      {
        $set: {
          content: '',
          type: 'revoked', // Đổi type để giao diện biết tin đã bị thu hồi
          reactions: [], // Thu hồi cũng sẽ xóa hết reaction đi
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ErrorWithStatus({ message: 'Không thể thu hồi tin nhắn này', status: 403 })
    }

    // Tùy version MongoDB, lấy document ra
    const updatedMessage = result.value || result

    // 2. EMIT SOCKET: Thông báo cho mọi người trong nhóm
    const conversation = await databaseService.conversations.findOne({ _id: updatedMessage.conversationId })
    if (conversation) {
      const targetUserIds = new Set<string>()
      if (conversation.participants) {
        conversation.participants.forEach((p: ObjectId) => targetUserIds.add(p.toString()))
      }
      if (conversation.members) {
        conversation.members.forEach((m: any) => {
          const mId = m.userId?.toString() || m.user_id?.toString()
          if (mId) targetUserIds.add(mId)
        })
      }

      targetUserIds.forEach((id) => {
        socketService.emitToUser(id, 'message_revoked', {
          messageId: messageId,
          conversationId: updatedMessage.conversationId.toString() // THÊM DÒNG NÀY
        })
      })
    }

    return result
  }
  // 5 . Hàm Xóa tin nhắn (Soft Delete - chỉ ẩn với user đó)
  async deleteMessage(messageId: string, userId: string) {
    const result = await databaseService.messages.findOneAndUpdate(
      { _id: new ObjectId(messageId) },
      {
        // Thêm ID của mình vào danh sách những người đã xóa tin này
        $addToSet: {
          deleted_by_users: new ObjectId(userId)
        }
      },
      { returnDocument: 'after' }
    )
    if (!result) throw new Error('Không tìm thấy tin nhắn')
    return result
  }

  async deleteMessageForMe(messageId: string, userId: string) {
    const messageObjId = new ObjectId(messageId)
    const userObjId = new ObjectId(userId)

    // Cập nhật tin nhắn: Push userId vào mảng deletedByUsers
    const result = await databaseService.messages.findOneAndUpdate(
      { _id: messageObjId },
      {
        $addToSet: {
          deletedByUsers: userObjId,
          deleted_by_users: userObjId
        }
      }, // Dùng $addToSet để không bị trùng lặp
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new ErrorWithStatus({ message: 'Không tìm thấy tin nhắn', status: 404 })
    }

    return result
  }

  async summarizeConversation(convId: string, userId: string, limit: number = 30, unreadCount: number = 0) {
    try {
      // 1. Bảo vệ ở Backend: Nếu không có tin mới thì trả về rỗng ngay
      if (unreadCount === 0 || limit === 0) {
        return {
          topic: 'Không có tin nhắn mới nào cần tóm tắt',
          decisions: [],
          openQuestions: [],
          actionItems: []
        }
      }

      const convObjectId = new ObjectId(convId)
      const userObjectId = new ObjectId(userId)

      const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
      if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: 404 })

      const matchCondition: any = {
        conversationId: convObjectId,
        deletedByUsers: { $ne: userObjectId }
      }

      // 2. CHỈ LẤY ĐÚNG SỐ LƯỢNG TIN NHẮN CHƯA ĐỌC (limit = unreadCount)
      const recentMessages = await databaseService.messages
        .aggregate([
          { $match: matchCondition },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'senderId',
              foreignField: '_id',
              as: 'senderInfo'
            }
          },
          { $unwind: '$senderInfo' }
        ])
        .toArray()

      if (recentMessages.length === 0) {
        return { topic: 'Không có tin nhắn mới nào cần tóm tắt', decisions: [], openQuestions: [], actionItems: [] }
      }

      // Đảo ngược mảng (cũ -> mới)
      recentMessages.reverse()

      // 3. Toàn bộ lúc này đều là tin nhắn mới, không cần dán nhãn nữa
      const chatLog = recentMessages
        .map((msg) => {
          return `[ID: ${msg._id}] ${msg.senderInfo?.userName || 'Unknown'}: ${msg.content}`
        })
        .join('\n')

      if (!process.env.GEMINI_API_KEY) throw new Error('Thiếu API Key')

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      })

      // 4. Cập nhật lại Prompt
      const prompt = `
      Bạn là một trợ lý AI quản lý nhóm chat. Dưới đây là các TIN NHẮN MỚI CHƯA ĐỌC của nhóm.
      
      YÊU CẦU TÓM TẮT:
      1. Tóm tắt ngắn gọn chủ đề chính của đoạn chat này.
      2. Liệt kê các quyết định quan trọng (nếu có).
      3. Liệt kê các hành động, công việc cần làm và người được giao (nếu có).
      
      Trả về định dạng JSON chính xác với cấu trúc sau:
      {
        "topic": "Chủ đề chính",
        "decisions": ["Quyết định 1"],
        "openQuestions": ["Câu hỏi còn bỏ ngỏ 1"],
        "actionItems": [
          { "task": "Nhiệm vụ", "assignee": "Tên người", "messageId": "ID tin nhắn gốc" }
        ]
      }
      
      Dữ liệu chat:
      ${chatLog}
      `

      const result = await model.generateContent(prompt)
      return JSON.parse(result.response.text())
    } catch (error) {
      console.error('Lỗi khi tóm tắt AI:', error)
      throw new ErrorWithStatus({
        message: 'Lỗi server khi phân tích nội dung bằng AI',
        status: httpStatus.INTERNAL_SERVER_ERROR
      })
    }
  }

  // async summarizeConversation(convId: string, userId: string, limit: number = 100) {
  //   try {
  //     // 1. Kiểm tra quyền truy cập
  //     const convObjectId = new ObjectId(convId)
  //     const conversation = await databaseService.conversations.findOne({ _id: convObjectId })
  //     if (!conversation) throw new ErrorWithStatus({ message: 'Không tìm thấy', status: 404 })

  //     // 2. Lấy 100 tin nhắn gần nhất
  //     const messages = await this.getMessages(convId, userId, undefined, limit)
  //     if (messages.length === 0) return null

  //     const chronologicalMessages = messages.reverse()

  //     // 3. Format dữ liệu cho AI hiểu
  //     const chatLog = chronologicalMessages
  //       .map((msg) => {
  //         return `[ID: ${msg._id}] ${msg.sender?.userName || 'Unknown'}: ${msg.content}`
  //       })
  //       .join('\n')

  //     // 4. Khởi tạo Model NGAY TẠI ĐÂY để đảm bảo process.env đã được load
  //     if (!process.env.GEMINI_API_KEY) {
  //       throw new Error('Thiếu API Key của Gemini trong file .env')
  //     }

  //     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
  //     const model = genAI.getGenerativeModel({
  //       model: 'gemini-2.5-flash',
  //       generationConfig: { responseMimeType: 'application/json' }
  //     })

  //     const prompt = `
  //     Bạn là một trợ lý AI quản lý nhóm chat. Hãy đọc đoạn chat sau và tóm tắt lại.
  //     Yêu cầu trả về định dạng JSON chính xác với cấu trúc sau:
  //     {
  //       "topic": "Chủ đề chính của cuộc trò chuyện",
  //       "decisions": ["Quyết định 1", "Quyết định 2"],
  //       "openQuestions": ["Câu hỏi còn bỏ ngỏ 1"],
  //       "actionItems": [
  //         { "task": "Nhiệm vụ cần làm", "assignee": "Tên người được giao", "messageId": "ID của tin nhắn gốc nếu có" }
  //       ]
  //     }

  //     Dữ liệu chat:
  //     ${chatLog}
  //     `

  //     // 5. Gọi AI và parse kết quả
  //     const result = await model.generateContent(prompt)
  //     const responseText = result.response.text()

  //     return JSON.parse(responseText)
  //   } catch (error) {
  //     console.error('Lỗi khi tóm tắt hội thoại bằng AI:', error)
  //     throw new ErrorWithStatus({
  //       message: 'Lỗi server khi phân tích nội dung bằng AI',
  //       status: httpStatus.INTERNAL_SERVER_ERROR
  //     })
  //   }
  // }
}

const messageService = new MessageService()
export default messageService
