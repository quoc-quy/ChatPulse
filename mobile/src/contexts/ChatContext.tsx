import React, { createContext, useState, useContext } from 'react';

interface ChatContextType {
  totalUnreadCount: number;
  setTotalUnreadCount: (count: number) => void;
}

const ChatContext = createContext<ChatContextType>({
  totalUnreadCount: 0,
  setTotalUnreadCount: () => {},
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  return (
    <ChatContext.Provider value={{ totalUnreadCount, setTotalUnreadCount }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => useContext(ChatContext);