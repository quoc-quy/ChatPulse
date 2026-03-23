export class ContextManager {
  static formatChatLog(messages: any[]): string {
    if (!messages || messages.length === 0) return ''
    const chronologicalMessages = [...messages].reverse()
    return chronologicalMessages
      .map((msg) => {
        const userName = msg.sender?.userName || msg.senderInfo?.userName || 'Unknown'
        // FIX: Xóa [ID: ${msg._id}] đi để AI không bị lộ ID tin nhắn
        return `[${userName}]: ${msg.content}`
      })
      .join('\n')
  }

  static formatGlobalChatLog(globalData: any[]): string {
    if (!globalData || globalData.length === 0) {
      return 'Hiện tại người dùng chưa có cuộc trò chuyện nào.'
    }
    let result = 'LỊCH SỬ TIN NHẮN GẦN ĐÂY CỦA NGƯỜI DÙNG TỪ CÁC NHÓM/CHATS:\n'
    for (const conv of globalData) {
      // FIX: Xóa (ID hội thoại: ${conv.conversationId}) để tránh lộ ID database
      const groupName = conv.conversationName || 'Nhóm chưa đặt tên'
      result += `\n[Đoạn chat / Nhóm: ${groupName}]\n`

      for (const msg of conv.messages) {
        const userName = msg.senderInfo?.userName || msg.senderInfo?.fullName || 'Người dùng ẩn'
        const time = new Date(msg.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
        result += `- (${time}) ${userName}: ${msg.content}\n`
      }
    }
    return result
  }

  // ==========================================
  // BƠM SIÊU DỮ LIỆU CÁ NHÂN CHO AI
  // ==========================================
  static formatUserMetadata(profile: any, friends: any[], receivedReqs: any[], sentReqs: any[], blocks: any[]): string {
    if (!profile) return 'Không có dữ liệu cá nhân.'

    let meta = `THÔNG TIN TÀI KHOẢN (SIÊU DỮ LIỆU CỦA NGƯỜI DÙNG CHỦ THỂ):\n`
    meta += `- Tên của bạn (Người đang chat với AI): ${profile.userName || profile.fullName || 'Chưa cập nhật'}\n`
    meta += `- Email: ${profile.email || 'Chưa cập nhật'}\n`
    meta += `- Số điện thoại: ${profile.phone || 'Chưa cập nhật'}\n`
    meta += `- Tổng số bạn bè hiện tại: ${friends.length} người.\n`
    meta += `- Lời mời kết bạn đang chờ nhận: ${receivedReqs.length} lời mời.\n`
    meta += `- Lời mời kết bạn đã gửi đi: ${sentReqs.length} lời mời.\n`
    meta += `- Danh sách đen (Số người đã chặn): ${blocks.length} người.\n`

    return meta
  }
}
