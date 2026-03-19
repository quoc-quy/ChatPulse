import { api } from "./api";

export const getConversations = (
  page: number | string = 1,
  limit: number | string = 20,
) => {
  return api.get(`/conversations`, {
    params: { page, limit },
  });
};

export const getMessages = (
  conversationId: string,
  cursor: string | null = null,
  limit = 20,
) => {
  const params: any = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  return api.get(`/messages/${conversationId}`, { params });
};

// ĐÃ SỬA LẠI HÀM NÀY: Gửi đúng trường "convId" mà Backend yêu cầu
export const sendMessage = (
  conversationId: string,
  content: string,
  type = "text",
) => {
  return api.post(`/messages`, {
    convId: conversationId, // <-- Đổi tên key chỗ này thành convId
    content: content,
    type: type,
  });
};

// API Thả hoặc Gỡ cảm xúc (React)
export const reactMessage = (messageId: string, emoji: string) => {
  return api.post(`/messages/${messageId}/react`, { emoji });
};

// API Thu hồi tin nhắn (Recall)
export const recallMessage = (messageId: string) => {
  return api.post(`/messages/${messageId}/revoke`);
};

// API Xóa tin nhắn phía tôi
export const deleteMessageForMe = (messageId: string) => {
  return api.delete(`/messages/${messageId}/delete-for-me`);
};
// Lấy chi tiết hội thoại + danh sách thành viên
export const getConversationDetail = (conversationId: string) => {
  return api.get(`/conversations/${conversationId}`);
};

// Cập nhật tên/avatar nhóm
export const updateGroup = (
  conversationId: string,
  data: { name?: string; avatarUrl?: string },
) => {
  return api.patch(`/conversations/${conversationId}`, data);
};

// Thêm thành viên vào nhóm
export const addMembers = (conversationId: string, members: string[]) => {
  return api.post(`/conversations/${conversationId}/members`, {
    member_ids: members,
  });
};

// Kick thành viên khỏi nhóm (admin)
export const kickMember = (conversationId: string, memberId: string) => {
  return api.delete(`/conversations/${conversationId}/members`, {
    data: { memberId },
  });
};

// Tự rời nhóm
export const leaveGroup = (conversationId: string) => {
  return api.delete(`/conversations/${conversationId}/leave`);
};

// Thăng cấp thành viên lên admin
export const promoteAdmin = (conversationId: string, memberId: string) => {
  return api.patch(`/conversations/${conversationId}/admin`, { memberId });
};

// Gửi mảng tin nhắn lên Backend thật để xử lý qua Groq AI
export const summarizeChatApi = (messages: any[]) => {
  // Thay đổi đường dẫn '/conversations/summarize' cho khớp với route bạn đã khai báo bên backend
  return api.post(`/conversations/summarize`, {
    messages: messages,
  });
};

// API để chat liên tục với AI (gửi kèm bối cảnh chat và câu hỏi mới)
export const askChatPulseAIApi = (chatContext: any[], prompt: string) => {
  return api.post(`/conversations/ask-ai`, {
    context: chatContext,
    question: prompt,
  });
};
// Tạo hoặc lấy conversation 1-1 với một user (idempotent)
export const createDirectConversation = (userId: string) => {
  return api.post("/conversations", {
    type: "direct",
    members: [userId],
  });
};
/**
 * Tắt/bật thông báo cho một hội thoại
 * PATCH /groups/:id/mute
 */
export const muteConversation = (conversationId: string, mute: boolean) =>
  api.patch(`/groups/${conversationId}/mute`, { mute });

/**
 * Lấy ảnh, video, file đã gửi trong nhóm
 * GET /groups/:id/media?page=1&limit=20
 */
export const getMediaFiles = (
  conversationId: string,
  page: number = 1,
  limit: number = 20,
) => api.get(`/groups/${conversationId}/media`, { params: { page, limit } });

/**
 * Lấy danh sách link đã chia sẻ trong nhóm
 * GET /groups/:id/links?page=1&limit=20
 */
export const getSharedLinks = (
  conversationId: string,
  page: number = 1,
  limit: number = 20,
) => api.get(`/groups/${conversationId}/links`, { params: { page, limit } });

/**
 * Đổi tên nhóm
 * PATCH /groups/:id/name
 */
export const renameGroup = (conversationId: string, name: string) =>
  api.patch(`/groups/${conversationId}/name`, { name });

/**
 * Tìm kiếm tin nhắn trong hội thoại
 * GET /messages/:convId/search?q=keyword&page=1&limit=20
 */
export const searchMessages = (
  conversationId: string,
  keyword: string,
  page: number = 1,
  limit: number = 20,
) =>
  api.get(`/messages/${conversationId}/search`, {
    params: { q: keyword, page, limit },
  });
