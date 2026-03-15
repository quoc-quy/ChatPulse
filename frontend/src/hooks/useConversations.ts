import { useState, useEffect, useRef, useContext, useMemo, useCallback } from 'react'
import { useSocket } from '@/context/socket.context'
import { AppContext } from '@/context/app.context'
import { conversationsApi } from '@/apis/conversations.api'

export function useConversations() {
  const { profile, activeChat, setActiveChat } = useContext(AppContext)
  const { socket } = useSocket()

  const [chatList, setChatList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const activeChatRef = useRef(activeChat)

  useEffect(() => {
    activeChatRef.current = activeChat
  }, [activeChat])

  // --- 1. LẤY DANH SÁCH CUỘC TRÒ CHUYỆN ---
  // // Bọc trong useCallback để tránh re-create hàm liên tục
  const fetchChats = useCallback(async () => {
    if (!profile) return
    setIsLoading(true)
    try {
      const res = await conversationsApi.getConversations()
      let rawData = res.data?.result || res.data?.data || res.data
      if (!Array.isArray(rawData)) rawData = []

      const formattedChats = rawData.map((conv: any) => {
        let chatName = 'Cuộc trò chuyện'
        let isOnline = false
        let lastActiveAt = undefined

        if (conv.type === 'direct') {
          const otherUser = conv.participants?.find((p: any) => String(p._id) !== String(profile._id))
          if (otherUser) {
            chatName = otherUser.userName || otherUser.fullName || 'Người dùng'
            isOnline = otherUser.isOnline === true
            lastActiveAt = otherUser.last_active_at || otherUser.lastActiveAt
          }
        } else if (conv.type === 'group') {
          if (conv.name) {
            chatName = conv.name
          } else if (conv.participants) {
            const otherUsers = conv.participants.filter((p: any) => String(p._id) !== String(profile._id))
            chatName = otherUsers.map((u: any) => u.userName || u.fullName).join(', ')
            if (!chatName) chatName = 'Nhóm trò chuyện'
          }
        }

        const timeString = conv.updated_at
          ? new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : ''

        let lastMessageContent = 'Chưa có tin nhắn nào...'
        let prefix = ''

        if (conv.lastMessage && (conv.lastMessage.content || conv.lastMessage.type)) {
          let content = conv.lastMessage.content

          if (conv.lastMessage.type === 'revoked') {
            content = 'Tin nhắn đã được thu hồi'
            prefix = ''
          } else if (conv.lastMessage.type === 'image' || conv.lastMessage.type === 'media') {
            content = '[Hình ảnh/Video]'
          } else if (!content) {
            content = 'Tin nhắn'
          }

          if (conv.lastMessage.type !== 'revoked' && (conv.lastMessage.sender_id || conv.lastMessage.senderId)) {
            const senderId = conv.lastMessage.sender_id || conv.lastMessage.senderId
            const isMe = String(senderId) === String(profile._id)
            if (isMe) {
              prefix = 'Bạn: '
            } else if (conv.type === 'group') {
              const sender = conv.participants?.find((p: any) => String(p._id) === String(senderId))
              if (sender) {
                const senderName = sender.userName || sender.fullName || 'Thành viên'
                prefix = `${senderName}: `
              }
            }
          }
          lastMessageContent = prefix ? `${prefix}${content}` : content
        }

        const unreadCount = conv.unread_count ?? conv.unreadCount ?? 0

        return {
          id: conv._id,
          name: chatName,
          message: lastMessageContent,
          lastMessageId: conv.last_message_id,
          time: timeString,
          timestamp: new Date(conv.updated_at || 0).getTime(),
          type: conv.type,
          avatarUrl: conv.avatarUrl,
          participants: conv.participants || [],
          admin_id: conv.admin_id,
          isOnline,
          lastActiveAt,
          unreadCount
        }
      })

      const uniqueChatsMap = new Map()
      formattedChats.forEach((chat: any) => {
        if (!uniqueChatsMap.has(chat.id)) uniqueChatsMap.set(chat.id, chat)
      })

      const uniqueChats = Array.from(uniqueChatsMap.values())
      uniqueChats.sort((a, b) => b.timestamp - a.timestamp)
      setChatList(uniqueChats)
    } catch (error) {
      console.error('Lỗi khi tải danh sách:', error)
    } finally {
      setIsLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchChats()
  }, [fetchChats, refetchTrigger])

  // --- 2. LẮNG NGHE SOCKET REALTIME ---
  useEffect(() => {
    if (!profile || !socket) return

    const handleReceiveMessage = (newMessage: any) => {
      setChatList((prevChats) => {
        const convIdStr = String(newMessage.conversationId)
        const existingChatIndex = prevChats.findIndex((c) => String(c.id) === convIdStr)
        let updatedChats = [...prevChats]

        const senderIdStr = String(newMessage.sender?._id || newMessage.senderId)
        const isMe = senderIdStr === String(profile._id)
        let prefix = isMe ? 'Bạn: ' : ''
        if (!isMe && newMessage.type === 'group') {
          prefix = `${newMessage.sender?.userName || newMessage.sender?.fullName || 'Thành viên'}: `
        }

        let previewContent = newMessage.content
        if (newMessage.type === 'image' || newMessage.type === 'media') previewContent = '[Hình ảnh]'
        const newPreview = `${prefix}${previewContent}`
        const newTime = new Date(newMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        const newTimestamp = new Date(newMessage.createdAt).getTime()

        if (existingChatIndex !== -1) {
          const chatToUpdate = { ...updatedChats[existingChatIndex] }
          chatToUpdate.message = newPreview
          chatToUpdate.time = newTime
          chatToUpdate.timestamp = newTimestamp
          chatToUpdate.lastMessageId = newMessage._id

          const isCurrentlyViewing = String(activeChatRef.current?.id) === convIdStr
          if (!isMe) {
            if (isCurrentlyViewing) {
              conversationsApi.markAsSeen(convIdStr).catch((err) => console.error(err))
            } else {
              chatToUpdate.unreadCount = (chatToUpdate.unreadCount || 0) + 1
            }
          }
          updatedChats.splice(existingChatIndex, 1)
          updatedChats.unshift(chatToUpdate)
          return updatedChats
        } else {
          setRefetchTrigger((prev) => prev + 1)
          return prevChats
        }
      })
    }

    const handleMessageRevoked = ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      setChatList((prevChats) => {
        return prevChats.map((chat) => {
          if (String(chat.id) === String(conversationId) && String(chat.lastMessageId) === String(messageId)) {
            return { ...chat, message: 'Tin nhắn đã được thu hồi' }
          }
          return chat
        })
      })
    }

    const handleUserStatusChange = (data: { userId: string; isOnline: boolean; lastActiveAt?: string }) => {
      setChatList((prevChats) =>
        prevChats.map((chat) => {
          const hasUser = chat.participants?.some((p: any) => String(p._id) === String(data.userId))
          if (hasUser) {
            const updatedParticipants = chat.participants.map((p: any) =>
              String(p._id) === String(data.userId)
                ? { ...p, isOnline: data.isOnline, last_active_at: data.lastActiveAt || p.last_active_at }
                : p
            )
            let updatedIsOnline = chat.isOnline
            if (chat.type === 'direct') {
              const otherUser = updatedParticipants.find((p: any) => String(p._id) !== String(profile._id))
              if (otherUser) {
                updatedIsOnline = otherUser.isOnline === true
              }
            }
            return {
              ...chat,
              isOnline: updatedIsOnline,
              lastActiveAt: data.lastActiveAt || chat.lastActiveAt,
              participants: updatedParticipants
            }
          }
          return chat
        })
      )
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_revoked', handleMessageRevoked)
    socket.on('user_status_change', handleUserStatusChange)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_revoked', handleMessageRevoked)
      socket.off('user_status_change', handleUserStatusChange)
    }
  }, [profile, socket])

  // --- 3. ĐỒNG BỘ TRẠNG THÁI ---
  useEffect(() => {
    if (activeChat) {
      const currentInList = chatList.find((c) => String(c.id) === String(activeChat.id))
      if (
        currentInList &&
        (currentInList.isOnline !== activeChat.isOnline || currentInList.lastActiveAt !== activeChat.lastActiveAt)
      ) {
        setActiveChat((prev) => {
          if (!prev) return prev
          if (prev.isOnline === currentInList.isOnline && prev.lastActiveAt === currentInList.lastActiveAt) return prev
          return {
            ...prev,
            isOnline: currentInList.isOnline,
            lastActiveAt: currentInList.lastActiveAt
          }
        })
      }
    }
  }, [chatList, activeChat, setActiveChat])

  // --- LẮNG NGHE SỰ KIỆN XÓA TIN NHẮN PHÍA TÔI ---
  useEffect(() => {
    const handleLocalDelete = (e: any) => {
      const { conversationId, newLastMessage } = e.detail

      setChatList((prevChats) =>
        prevChats.map((chat) => {
          if (String(chat.id) === String(conversationId)) {
            if (!newLastMessage) {
              return { ...chat, message: 'Chưa có tin nhắn nào...', time: '', lastMessageId: null }
            }

            const isMe = newLastMessage.sender?._id === profile?._id
            let prefix = isMe ? 'Bạn: ' : ''
            if (!isMe && chat.type === 'group') {
              prefix = `${newLastMessage.sender?.userName || 'Thành viên'}: `
            }

            let previewContent = newLastMessage.content
            if (newLastMessage.type === 'image' || newLastMessage.type === 'media') {
              previewContent = '[Hình ảnh/Video]'
            }
            if (newLastMessage.type === 'revoked') {
              previewContent = 'Tin nhắn đã được thu hồi'
              prefix = ''
            }

            const newTime = new Date(newLastMessage.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })

            return {
              ...chat,
              message: newLastMessage.type === 'revoked' ? previewContent : `${prefix}${previewContent}`,
              time: newTime,
              lastMessageId: newLastMessage._id
            }
          }
          return chat
        })
      )
    }

    window.addEventListener('local_message_deleted', handleLocalDelete)
    return () => window.removeEventListener('local_message_deleted', handleLocalDelete)
  }, [profile])

  useEffect(() => {
    const handleRefresh = () => {
      fetchChats()
    }
    window.addEventListener('refresh_chat_list', handleRefresh)
    return () => window.removeEventListener('refresh_chat_list', handleRefresh)
  }, [fetchChats])

  const hasUnreadMessages = useMemo(() => {
    return chatList.some((chat) => chat.unreadCount > 0)
  }, [chatList])

  return {
    chatList,
    setChatList,
    isLoading,
    hasUnreadMessages,
    profile,
    activeChat,
    setActiveChat,
    fetchChats
  }
}
