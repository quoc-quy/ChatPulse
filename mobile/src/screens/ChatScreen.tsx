import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { joinGroupByLink } from '../apis/chat.api'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert
} from 'react-native'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from '../hooks/useTranslation'
import { jwtDecode } from 'jwt-decode'
import { useChatContext } from '../contexts/ChatContext'
import { useCameraPermissions } from 'expo-camera'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { getConversations, pinConversation, deleteConversationForMe } from '../apis/chat.api'
import { friendApi } from '../apis/friends.api'

// 1. Import bộ màu
import { lightColors as globalLight, darkColors as globalDark } from '../theme/colors'

// 2. Import các component đã tách
import { ChatHeader } from '../components/chat/ChatHeader'
import { ChatTabs } from '../components/chat/ChatTabs'
import { ConversationItem } from '../components/chat/ConversationItem'
import { ChatSearchModal } from '../components/chat/ChatSearchModal'
import { ChatQRScannerModal } from '../components/chat/ChatQRScannerModal'
import { ChatPinMenuModal } from '../components/chat/ChatPinMenuModal'
import { ChatPlusMenuModal } from '../components/chat/ChatPlusMenuModal'

// ── THÊM MỚI: Import TrafficConversationItem ──────────────────────────────
import TrafficConversationItem from '../components/traffic/TrafficConversationItem'

// Định nghĩa màu đồng bộ với MessageScreen
const localLightColors = {
  ...globalLight,
  primary: '#8B5CF6', // Tím chính
  accent: '#6D28D9', // Tím đậm
  ring: '#8B5CF6',
  badge: '#EF4444', // Đỏ badge
  textLight: '#6B7280',
  surface: '#FFFFFF',
  text: '#1F2937',
  success: '#10B981',
  surfaceSoft: '#F3F4F6',
  border: '#E5E7EB'
}

const localDarkColors = {
  ...globalDark,
  primary: '#A78BFA', // Tím nhạt cho Dark mode
  accent: '#7C3AED',
  ring: '#A78BFA',
  badge: '#EF4444',
  textLight: '#9CA3AF',
  surface: globalDark.card,
  text: globalDark.foreground,
  success: '#10B981',
  surfaceSoft: '#1E293B',
  border: '#334155'
}

const ChatScreen = ({ route }: any) => {
  const navigation = useNavigation<any>()
  const { language, t } = useTranslation()

  const {
    setTotalUnreadCount,
    setLocalUnread,
    getLocalUnread,
    localUnreadMap,
    drafts = {},
    socket
  } = useChatContext() as any

  const { isDarkMode } = useTheme()

  const COLORS = useMemo(() => (isDarkMode ? localDarkColors : localLightColors), [isDarkMode])
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode, COLORS])

  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups'>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set())
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set())
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())

  const [showPinMenu, setShowPinMenu] = useState(false)
  const [selectedConvForPin, setSelectedConvForPin] = useState<any>(null)

  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const [showQRScanner, setShowQRScanner] = useState(false)
  const scannedRef = useRef(false)
  const [permission, requestPermission] = useCameraPermissions()

  const [showPlusMenu, setShowPlusMenu] = useState(false)

  useEffect(() => {
    const loadArchived = async () => {
      try {
        const stored = await AsyncStorage.getItem('archived_chats')
        if (stored) setArchivedIds(new Set(JSON.parse(stored)))
      } catch (error) {
        console.log('Lỗi load archive:', error)
      }
    }
    loadArchived()
  }, [])

  useEffect(() => {
    if (archivedIds.size === 0 || conversations.length === 0) return
    let hasChanges = false
    const newArchivedIds = new Set(archivedIds)

    conversations.forEach((conv) => {
      if (newArchivedIds.has(conv._id)) {
        const unread = getLocalUnread(conv._id)
        if (unread > 0 || conv.lastMessage?.senderId === currentUserId) {
          newArchivedIds.delete(conv._id)
          hasChanges = true
        }
      }
    })

    if (hasChanges) {
      setArchivedIds(newArchivedIds)
      AsyncStorage.setItem('archived_chats', JSON.stringify(Array.from(newArchivedIds)))
    }
  }, [conversations, localUnreadMap])

  useEffect(() => {
    const totalUnread = Object.values(localUnreadMap).reduce(
      (sum: any, count: any) => sum + (count || 0),
      0
    )
    setTotalUnreadCount(totalUnread)
  }, [localUnreadMap, setTotalUnreadCount])

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.initialTab === 'groups') {
        setActiveTab('groups')
        navigation.setParams({ initialTab: undefined })
      }
    }, [route?.params?.initialTab, navigation])
  )

  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token')
      if (token) {
        const decoded: any = jwtDecode(token)
        setCurrentUserId(decoded.user_id || decoded._id || decoded.id)
      }
    } catch (error) {}
  }

  const initializedConvsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (Object.keys(localUnreadMap).length === 0) initializedConvsRef.current.clear()
  }, [localUnreadMap])
  useEffect(() => {
    return () => {
      initializedConvsRef.current.clear()
    }
  }, [])

  const fetchConversations = async (pageNumber = 1, isRefresh = false) => {
    try {
      if (pageNumber === 1 && !isRefresh) setLoading(true)
      const response = await getConversations(pageNumber, 20)
      const newConversations = response.data.result || []
      setHasMore(newConversations.length >= 20)

      let archivedHasChanged = false
      const currentArchived = new Set(archivedIds)

      let resolvedUserId = currentUserId
      if (!resolvedUserId) {
        try {
          const token = await AsyncStorage.getItem('access_token')
          if (token) {
            const decoded: any = jwtDecode(token)
            resolvedUserId = decoded.user_id || decoded._id || decoded.id
          }
        } catch {}
      }

      const processConversation = (conv: any, pinned: Set<string>) => {
        if (!conv._id) return
        if (!initializedConvsRef.current.has(conv._id)) {
          initializedConvsRef.current.add(conv._id)
          setLocalUnread(conv._id, conv.unread_count || 0)
        }

        if (currentArchived.has(conv._id)) {
          const isUnread = conv.unread_count > 0
          const isMyLatestMessage = conv.lastMessage?.senderId === resolvedUserId
          if (isUnread || isMyLatestMessage) {
            currentArchived.delete(conv._id)
            archivedHasChanged = true
          }
        }

        if (resolvedUserId) {
          const myMember = (conv.members || []).find(
            (m: any) => m.userId?.toString() === resolvedUserId
          )
          if (myMember?.isPinned) pinned.add(conv._id)
        }
      }

      if (isRefresh || pageNumber === 1) {
        const pinned = new Set<string>()
        newConversations.forEach((c: any) => processConversation(c, pinned))
        setConversations(newConversations)
        if (resolvedUserId) setPinnedIds(pinned)
      } else {
        const pinned = new Set<string>(pinnedIds)
        newConversations.forEach((c: any) => processConversation(c, pinned))
        setConversations((prev) => [...prev, ...newConversations])
      }

      if (archivedHasChanged) {
        setArchivedIds(new Set(currentArchived))
        AsyncStorage.setItem('archived_chats', JSON.stringify(Array.from(currentArchived)))
      }
      setPage(pageNumber)
    } catch (error: any) {
      console.log('Lỗi lấy danh sách:', error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!socket) return
    const handleReceiveMessage = (newMessage: any) => {
      const convId = newMessage.conversationId || newMessage.convId
      setConversations((prev) => {
        const convIndex = prev.findIndex((c) => c._id === convId)
        if (convIndex > -1) {
          const newConversations = [...prev]
          const updatedConv = {
            ...newConversations[convIndex],
            lastMessage: newMessage,
            updated_at: newMessage.createdAt || new Date().toISOString()
          }
          newConversations.splice(convIndex, 1)
          newConversations.unshift(updatedConv)
          if (newMessage.sender?._id !== currentUserId && currentUserId) {
            const currentUnread = getLocalUnread(convId) || 0
            setLocalUnread(convId, currentUnread + 1)
          }
          return newConversations
        } else {
          fetchConversations(1, true)
          return prev
        }
      })
    }

    const handleGroupDisbanded = ({ conversationId }: { conversationId: string }) => {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId))
    }

    const handleCallIncoming = (data: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (String(c._id) === String(data.conversationId)) {
            return {
              ...c,
              activeCall: {
                callId: data.callId,
                conversationId: data.conversationId,
                type: data.type,
                status: 'initiated',
                callerId: data.callerId
              }
            }
          }
          return c
        })
      )
    }

    const handleCallAccepted = (data: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (String(c._id) === String(data.conversationId)) {
            const currentCall = c.activeCall || {
              callId: data.callId,
              conversationId: data.conversationId,
              status: 'ongoing'
            }
            return { ...c, activeCall: { ...currentCall, status: 'ongoing' } }
          }
          return c
        })
      )
    }

    const handleCallEnded = (data: any) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.activeCall && String(c.activeCall.callId) === String(data.callId)) {
            return { ...c, activeCall: null }
          }
          return c
        })
      )
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('group_disbanded', handleGroupDisbanded)
    socket.on('call:incoming', handleCallIncoming)
    socket.on('call:accepted', handleCallAccepted)
    socket.on('call:ended', handleCallEnded)

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('group_disbanded', handleGroupDisbanded)
      socket.off('call:incoming', handleCallIncoming)
      socket.off('call:accepted', handleCallAccepted)
      socket.off('call:ended', handleCallEnded)
    }
  }, [socket, currentUserId, getLocalUnread, setLocalUnread])

  const fetchBlockedUsers = async () => {
    try {
      const resBlock = await friendApi.getBlockedUsers()
      const bIds = (resBlock.data?.result || []).map((u: any) => (u._id || '').toString())
      setBlockedUserIds(new Set(bIds))

      const resFriends = await friendApi.getFriends()
      const fIds = (resFriends.data?.result || []).map((f: any) => (f._id || f.id || '').toString())
      setFriendIds(new Set(fIds))
    } catch (error) {
      console.log('Lỗi fetch status:', error)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserId().then(() => {
        fetchConversations(1, true)
        fetchBlockedUsers()
      })
    }, [])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchConversations(1, true)
  }
  const onLoadMore = () => {
    if (!loading && hasMore && !refreshing && searchQuery === '') fetchConversations(page + 1)
  }

  const formatTimeZalo = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return t.chatJustNow
    if (diffMins < 60) return `${diffMins}p`
    if (Math.floor(diffMins / 60) < 24 && date.getDate() === now.getDate())
      return `${Math.floor(diffMins / 60)}g`
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  const getChatDetails = (item: any) => {
    let chatName = t.chatUserDefault
    let chatAvatarUrl = ''
    let isOnline = false
    let targetUserId = null
    let isGroup = item.type === 'group'
    let membersData: any[] = []
    if (isGroup) {
      chatName = item.name || t.chatUnnamedGroup
      chatAvatarUrl = item.avatarUrl || ''
      membersData = (item.participants || item.members || [])
        .map((m: any) => (m.userId ? m.userId : m))
        .filter((m: any) => m != null)
    } else {
      if (item.participants?.length > 0 && currentUserId) {
        const partner = item.participants.find((p: any) => p._id !== currentUserId)
        if (partner) {
          chatName =
            partner.displayName || partner.fullName || partner.userName || t.chatUserDefault
          chatAvatarUrl = partner.avatar || ''
          isOnline = partner.isOnline
          targetUserId = partner._id
        }
      }
    }
    return { chatName, chatAvatarUrl, isOnline, targetUserId, isGroup, membersData }
  }

  const isMutedForItem = (item: any): boolean => {
    if (!currentUserId) return false
    const myMember = (item.members || []).find(
      (m: any) => (m.userId?.toString?.() || m.user_id?.toString?.()) === currentUserId
    )
    return myMember?.hasMuted === true
  }

  const handleLongPressConv = (item: any) => {
    setSelectedConvForPin(item)
    setShowPinMenu(true)
  }

  const handleToggleArchive = async (item: any) => {
    const id = item._id
    setArchivedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      AsyncStorage.setItem('archived_chats', JSON.stringify(Array.from(next)))
      return next
    })
  }

  const handleDeleteConversation = (id: string) => {
    const conv = conversations.find((c) => c._id === id)
    const isDisbanded = conv?.isDisbanded
    Alert.alert(
      'Xóa hội thoại',
      isDisbanded
        ? 'Nhóm này đã bị giải tán. Bạn có muốn xóa khỏi danh sách không?'
        : 'Bạn có chắc chắn muốn xóa cuộc trò chuyện này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            setConversations((prev) => prev.filter((c) => c._id !== id))
            setArchivedIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              AsyncStorage.setItem('archived_chats', JSON.stringify(Array.from(next)))
              return next
            })
            try {
              deleteConversationForMe(id)
            } catch {}
          }
        }
      ]
    )
  }

  const handleTogglePin = async (item: any) => {
    const isCurrentlyPinned = pinnedIds.has(item._id)
    const newIsPinned = !isCurrentlyPinned
    setShowPinMenu(false)
    setPinnedIds((prev) => {
      const next = new Set(prev)
      if (newIsPinned) next.add(item._id)
      else next.delete(item._id)
      return next
    })
    try {
      await pinConversation(item._id, newIsPinned)
    } catch (e) {
      setPinnedIds((prev) => {
        const next = new Set(prev)
        if (newIsPinned) next.delete(item._id)
        else next.add(item._id)
        return next
      })
      Alert.alert(t.error, t.chatActionFailed)
    }
  }

  const handleOpenQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        Alert.alert(t.chatNotice, t.chatNeedCameraPermission)
        return
      }
    }
    scannedRef.current = false
    setShowQRScanner(true)
  }

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scannedRef.current) return
    scannedRef.current = true
    setShowQRScanner(false)

    if (data.startsWith('chatpulse://group/join/')) {
      const groupId = data.split('chatpulse://group/join/')[1]
      Alert.alert(t.chatJoinGroup, t.chatQrValidJoining, [
        {
          text: t.chatConfirm,
          onPress: async () => {
            try {
              setLoading(true)
              await joinGroupByLink(groupId)
              Alert.alert(t.success, t.chatJoinedGroupSuccess)
              fetchConversations(1, true)
            } catch (error: any) {
              Alert.alert(t.error, t.chatJoinGroupFailed)
            } finally {
              setLoading(false)
            }
          }
        },
        {
          text: t.cancel,
          style: 'cancel',
          onPress: () => {
            scannedRef.current = false
          }
        }
      ])
    } else {
      Alert.alert(t.chatInvalidQrTitle, t.chatInvalidQrMessage, [
        {
          text: 'OK',
          onPress: () => {
            scannedRef.current = false
          }
        }
      ])
    }
  }

  const validConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (c.type === 'group') return true
      const partner = c.participants?.find((p: any) => p._id?.toString() !== currentUserId)
      if (!partner) return true
      return !blockedUserIds.has(partner._id?.toString() || '')
    })
  }, [conversations, blockedUserIds, currentUserId])

  const displayConversations = useMemo(() => {
    let list = validConversations.filter((c) => !archivedIds.has(c._id))
    if (activeTab === 'unread') list = list.filter((c) => getLocalUnread(c._id) > 0)
    if (activeTab === 'groups') list = list.filter((c) => c.type === 'group')

    return [...list].sort((a, b) => {
      const aPinned = pinnedIds.has(a._id) ? 1 : 0
      const bPinned = pinnedIds.has(b._id) ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      const aDraft = drafts[a._id] && drafts[a._id].trim() !== '' ? 1 : 0
      const bDraft = drafts[b._id] && drafts[b._id].trim() !== '' ? 1 : 0
      if (aDraft !== bDraft) return bDraft - aDraft
      const dateA = new Date(a.updated_at || 0).getTime()
      const dateB = new Date(b.updated_at || 0).getTime()
      return dateB - dateA
    })
  }, [validConversations, activeTab, pinnedIds, drafts, archivedIds])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return validConversations
    return validConversations.filter((c) => {
      const { chatName } = getChatDetails(c)
      return chatName.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }, [validConversations, searchQuery])

  const renderItem = ({ item }: any) => {
    return (
      <ConversationItem
        item={item}
        currentUserId={currentUserId}
        getLocalUnread={getLocalUnread}
        pinnedIds={pinnedIds}
        archivedIds={archivedIds}
        friendIds={friendIds}
        drafts={drafts}
        onPress={(
          itemSelected: any,
          chatNameFallback: string,
          isGroup: boolean,
          targetUserId: string
        ) => {
          const { chatName, chatAvatarUrl, isOnline, membersData } = getChatDetails(itemSelected)
          const otherUser =
            itemSelected.participants?.find((p: any) => p._id !== currentUserId) ||
            itemSelected.members?.find((m: any) => m.userId?._id !== currentUserId)?.userId

          if (showSearchModal) {
            setShowSearchModal(false)
            setSearchQuery('')
          }

          navigation.navigate('MessageScreen', {
            id: itemSelected._id,
            name: itemSelected.name || otherUser?.userName || chatName,
            isGroup: isGroup,
            targetUserId: otherUser?._id,
            targetPublicKey: otherUser?.public_key || otherUser?.publicKey,
            unreadCount: itemSelected.unread_count,
            isMuted: isMutedForItem(itemSelected),
            isOnline: isOnline,
            lastOnline: otherUser?.lastActiveAt || otherUser?.lastOnline || otherUser?.last_active,
            avatar: chatAvatarUrl,
            members: membersData
          })
        }}
        onLongPress={handleLongPressConv}
        onToggleArchive={handleToggleArchive}
        onDeleteConversation={handleDeleteConversation}
        getChatDetails={getChatDetails}
        formatTimeZalo={formatTimeZalo}
        isMutedForItem={isMutedForItem}
        COLORS={COLORS}
        t={t}
      />
    )
  }

  // ── THÊM MỚI: header ghim TrafficConversationItem ─────────────────────────
  // Chỉ hiện ở tab "all", ẩn khi đang search
  const renderListHeader = () => {
    if (activeTab !== 'all' || searchQuery.trim() !== '') return null
    return <TrafficConversationItem onPress={() => navigation.navigate('TrafficBot')} />
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={COLORS.primary}
        translucent={false}
      />

      <ChatHeader
        COLORS={COLORS}
        displayConversationsLength={displayConversations.length}
        t={t}
        setShowQRScanner={handleOpenQRScanner}
        setShowPlusMenu={setShowPlusMenu}
        setShowSearchModal={setShowSearchModal}
      />

      <View style={styles.contentContainer}>
        <ChatTabs activeTab={activeTab} setActiveTab={setActiveTab} COLORS={COLORS} t={t} />
        {loading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={displayConversations}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            // ── THÊM MỚI: ghim TrafficConversationItem ở đầu danh sách ──
            ListHeaderComponent={renderListHeader}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t.chatNoConversations}</Text>
              </View>
            }
          />
        )}
      </View>

      <ChatSearchModal
        showSearchModal={showSearchModal}
        setShowSearchModal={setShowSearchModal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        renderItem={renderItem}
        COLORS={COLORS}
        isDarkMode={isDarkMode}
        t={t}
      />

      <ChatPinMenuModal
        showPinMenu={showPinMenu}
        setShowPinMenu={setShowPinMenu}
        handleTogglePin={handleTogglePin}
        selectedConvForPin={selectedConvForPin}
        pinnedIds={pinnedIds}
        COLORS={COLORS}
        t={t}
      />

      <ChatQRScannerModal
        showQRScanner={showQRScanner}
        setShowQRScanner={setShowQRScanner}
        handleBarcodeScanned={handleBarcodeScanned}
        t={t}
      />

      <ChatPlusMenuModal
        showPlusMenu={showPlusMenu}
        setShowPlusMenu={setShowPlusMenu}
        COLORS={COLORS}
      />
    </GestureHandlerRootView>
  )
}

const getStyles = (COLORS: any, isDarkMode: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    contentContainer: { flex: 1, marginTop: -25 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 5 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: COLORS.textLight, fontSize: 15 }
  })

export default ChatScreen
