import React, { createContext, useState, useContext, useCallback } from "react";

interface ChatContextType {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;

  // 🔥 LOCAL UNREAD MAP: lưu unread_count theo từng conversationId
  localUnreadMap: Record<string, number>;
  setLocalUnread: (conversationId: string, count: number) => void;
  clearLocalUnread: (conversationId: string) => void;
  getLocalUnread: (conversationId: string) => number;
}

const ChatContext = createContext<ChatContextType>({
  totalUnreadCount: 0,
  setTotalUnreadCount: () => {},
  localUnreadMap: {},
  setLocalUnread: () => {},
  clearLocalUnread: () => {},
  getLocalUnread: () => 0,
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [localUnreadMap, setLocalUnreadMap] = useState<Record<string, number>>(
    {},
  );
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

  // Lấy unread_count của 1 conversation
  const getLocalUnread = useCallback(
    (conversationId: string) => localUnreadMap[conversationId] ?? 0,
    [localUnreadMap],
  );
  return (
    <ChatContext.Provider
      value={{
        totalUnreadCount,
        setTotalUnreadCount,
        localUnreadMap,
        setLocalUnread,
        clearLocalUnread,
        getLocalUnread,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);
