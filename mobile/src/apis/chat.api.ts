import { api } from './api';

export const getConversations = (page: number | string = 1, limit: number | string = 20) => {
  return api.get(`/conversations`, {
    params: { page, limit }
  });
};

export const getMessages = (conversationId: string, cursor: string | null = null, limit = 20) => {
  const params: any = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  return api.get(`/messages/${conversationId}`, { params });
};

// ĐÃ SỬA LẠI HÀM NÀY: Gửi đúng trường "convId" mà Backend yêu cầu
export const sendMessage = (conversationId: string, content: string, type = "text") => {
  return api.post(`/messages`, { 
    convId: conversationId,  // <-- Đổi tên key chỗ này thành convId
    content: content, 
    type: type 
  });
};