import React, { createContext, useState, useContext, useCallback } from "react";

interface ChatContextType {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;

  // 🔥 LOCAL UNREAD MAP: lưu unread_count theo từng conversationId
  localUnreadMap: Record<string, number>;
  setLocalUnread: (conversationId: string, count: number) => void;
  clearLocalUnread: (conversationId: string) => void;
  getLocalUnread: (conversationId: string) => number;
  resetChatContext: () => void;
  
  // 🔥 DRAFTS: Lưu tin nhắn nháp
  drafts: Record<string, string>;
  updateDraft: (conversationId: string, text: string) => void;
}

const ChatContext = createContext<ChatContextType>({
  totalUnreadCount: 0,
  setTotalUnreadCount: () => {},
  localUnreadMap: {},
  setLocalUnread: () => {},
  clearLocalUnread: () => {},
  getLocalUnread: () => 0,
  resetChatContext: () => {},
  drafts: {},
  updateDraft: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [localUnreadMap, setLocalUnreadMap] = useState<Record<string, number>>({});
  
  // STATE LƯU NHÁP
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const setLocalUnread = useCallback(
    (conversationId: string, count: number) => {
      setLocalUnreadMap((prev) => ({
        ...prev,
        [conversationId]: count,
      }));
    },
    [],
  );

  const clearLocalUnread = useCallback((conversationId: string) => {
    setLocalUnreadMap((prev) => ({
      ...prev,
      [conversationId]: 0,
    }));
  }, []);

  const getLocalUnread = useCallback(
    (conversationId: string) => localUnreadMap[conversationId] ?? 0,
    [localUnreadMap],
  );

  // HÀM CẬP NHẬT NHÁP
  const updateDraft = useCallback((conversationId: string, text: string) => {
    setDrafts((prev) => ({ ...prev, [conversationId]: text }));
  }, []);

  const resetChatContext = useCallback(() => {
    setTotalUnreadCount(0);
    setLocalUnreadMap({});
    setDrafts({}); // Xóa nháp khi đăng xuất
  }, []);

  return (
    <ChatContext.Provider
      value={{
        totalUnreadCount,
        setTotalUnreadCount,
        localUnreadMap,
        setLocalUnread,
        clearLocalUnread,
        getLocalUnread,
        resetChatContext,
        drafts,
        updateDraft,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);