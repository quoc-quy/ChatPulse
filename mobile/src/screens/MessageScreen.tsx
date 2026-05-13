import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useVideoPlayer, VideoView } from 'expo-video'
import {
  View, Text, StyleSheet, Image, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, SafeAreaView, StatusBar,
  PanResponder, Linking, Modal, Pressable, Alert, ActivityIndicator, Dimensions
} from 'react-native'

import { useRoute, useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { jwtDecode } from 'jwt-decode'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Import API
import {
  getMessages, sendMessage, reactMessage as reactMessageApi, recallMessage as recallMessageApi,
  deleteMessageForMe as deleteMessageForMeApi, summarizeChatApi, getConversationDetail,
  deleteConversationForMe, sendMediaMessage, pinMessageApi, suggestReplyApi, markConversationAsSeen
} from '../apis/chat.api'
import { friendApi } from "../apis/friends.api";

// Import Contexts & Hooks
import { useTheme } from '../contexts/ThemeContext'
import { useTranslation } from '../hooks/useTranslation'
import { useChatContext } from '../contexts/ChatContext'

// Import Colors
import { lightColors as globalLight, darkColors as globalDark } from '../theme/colors';

// Import Components đã tách
import { MessageHeader } from '../components/message/MessageHeader';
import { MessageInput } from '../components/message/MessageInput';
import { MessageBubble } from '../components/message/MessageBubble';
import { PinnedModal } from '../components/message/PinnedModal';
import { ReactionModal } from '../components/message/ReactionModal';
import { AiSummaryModal } from '../components/message/AiSummaryModal';
import { MessageMenuModal } from '../components/message/MessageMenuModal';
import { MediaPreviewModal } from '../components/message/MediaPreviewModal';

const localLightColors = {
  ...globalLight, primary: '#8B5CF6', accent: '#6D28D9', ring: '#8B5CF6',
  badge: '#EF4444', textLight: '#6B7280', surface: '#FFFFFF', text: '#1F2937',
  success: '#10B981', surfaceSoft: '#F3F4F6', searchBg: '#F3F4F6',
  highlight: '#FDE047', headerText: '#FFFFFF', fileBg: '#F5F3FF', border: '#E5E7EB',
};

const localDarkColors = {
  ...globalDark, primary: '#A78BFA', accent: '#7C3AED', ring: '#A78BFA',
  badge: '#EF4444', textLight: '#9CA3AF', surface: globalDark.card,
  text: globalDark.foreground, success: '#10B981', surfaceSoft: '#1E293B',
  searchBg: '#1E293B', highlight: '#EAB308', headerText: '#FFFFFF',
  fileBg: '#2E1065', border: '#334155',
};

const REACTION_LIST = ['👍', '❤️', '🤣', '😮', '😭', '😡']
const BLOCKED_EXTENSIONS = ['exe', 'bat', 'cmd', 'msi', 'scr', 'vbs', 'sh', 'ps1', 'jar', 'sys', 'dll']
const MAX_FILE_SIZE = 50 * 1024 * 1024

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes'
  const k = 1024; const dm = decimals < 0 ? 0 : decimals; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

interface FilePayload { url: string; originalName: string; size: number; mimeType: string }

function parseMediaContent(content: string): FilePayload[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0].url) return parsed as FilePayload[]
      return (parsed as string[]).map((u) => ({ url: u, originalName: u.split('/').pop() || 'file', size: 0, mimeType: '' }))
    }
    if (typeof parsed === 'object' && parsed !== null && parsed.url) return [parsed as FilePayload]
    return [{ url: content, originalName: content.split('/').pop() || 'file', size: 0, mimeType: '' }]
  } catch { return [{ url: content, originalName: content.split('/').pop() || 'file', size: 0, mimeType: '' }] }
}

const getFileIconInfo = (payload: FilePayload) => {
  const ext = payload.originalName.split('.').pop()?.toLowerCase() || ''; const mime = payload.mimeType || ''
  if (ext === 'pdf' || mime === 'application/pdf') return { color: '#EF4444', label: 'PDF' }
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) return { color: '#3B82F6', label: 'DOC' }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime.includes('spreadsheet')) return { color: '#10B981', label: 'XLS' }
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation')) return { color: '#F97316', label: 'PPT' }
  if (['zip', 'rar', '7z'].includes(ext)) return { color: '#8B5CF6', label: 'ZIP' }
  if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || mime.startsWith('video/')) return { color: '#EC4899', label: 'VID' }
  if (['mp3', 'wav', 'm4a'].includes(ext) || mime.startsWith('audio/')) return { color: '#EAB308', label: 'AUD' }
  if (['js', 'ts', 'py', 'java', 'cpp', 'html', 'css', 'json'].includes(ext)) return { color: '#06B6D4', label: 'CODE' }
  return { color: '#64748B', label: ext.toUpperCase() || 'FILE' }
}

const unarchiveChat = async (conversationId: string) => {
  try {
    const stored = await AsyncStorage.getItem('archived_chats')
    if (stored) {
      let archivedArray: string[] = JSON.parse(stored)
      const index = archivedArray.findIndex((key: string) => key.startsWith(`${conversationId}:`) || key === conversationId)
      if (index !== -1) {
        archivedArray.splice(index, 1); await AsyncStorage.setItem('archived_chats', JSON.stringify(archivedArray))
      }
    }
  } catch (error) {}
}

const MessageScreen = () => {
  const route = useRoute<any>()
  const navigation = useNavigation<any>()
  const flatListRef = useRef<FlatList>(null)
  const { id } = route.params || {}
  const insets = useSafeAreaInsets()

  const { isDarkMode } = useTheme()
  const { language, t } = useTranslation()
  const COLORS = useMemo(() => (isDarkMode ? localDarkColors : localLightColors), [isDarkMode]);
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode, COLORS])
  const { clearLocalUnread, drafts, updateDraft, socket } = useChatContext() as any

  const { id: conversationId, name: chatName, isGroup, targetUserId, isMuted = false, avatar = '', members = [] } = route.params || {}

  const [partnerId, setPartnerId] = useState<string>(targetUserId || '');
  const [currentChatName, setCurrentChatName] = useState(chatName || 'Chat')
  const [messages, setMessages] = useState<any[]>([])
  const [inputText, setInputText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [isAiProcessing, setIsAiProcessing] = useState(false)
  const [isMutedState, setIsMutedState] = useState<boolean>(isMuted)
  
  const [chatAvatarUrl, setChatAvatarUrl] = useState<string>(avatar)
  const [membersData, setMembersData] = useState<any[]>(members)
  
  // Lấy dữ liệu Partner từ Params khởi tạo để có ngay lập tức
  const partnerInit = members.find((m: any) => m._id === partnerId || m.id === partnerId) || {};
  const [isOnline, setIsOnline] = useState<boolean>(route.params?.isOnline ?? partnerInit.isOnline ?? false);
  const [lastOnlineTime, setLastOnlineTime] = useState<string | null>(route.params?.lastOnline ?? partnerInit.lastActiveAt ?? partnerInit.lastOnline ?? partnerInit.last_active ?? null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [isNotFriendState, setIsNotFriendState] = useState<boolean>(route.params?.isFriend === false)
  const [isFetchingMore, setIsFetchingMore] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
  const [isGroupDisbanded, setIsGroupDisbanded] = useState(false)
  const [disbandMessage, setDisbandMessage] = useState('')
  const [pinnedMessages, setPinnedMessages] = useState<any[]>([])
  const [showPinnedModal, setShowPinnedModal] = useState(false)
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null)
  const [pendingMedia, setPendingMedia] = useState<any[]>([])
  const [previewMedia, setPreviewMedia] = useState<{ items: { id: string; url: string; isVideo: boolean }[], initialIndex: number } | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const [selectedMsg, setSelectedMsg] = useState<any>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null)
  const [emojiStripWidth, setEmojiStripWidth] = useState(0)
  const [showReactionDetails, setShowReactionDetails] = useState(false)
  const [reactionDetailMessage, setReactionDetailMessage] = useState<any>(null)
  const [reactionFilter, setReactionFilter] = useState<string>('ALL')
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiSummaryText, setAiSummaryText] = useState('')

  // 🌟 BỘ ĐẾM 60 GIÂY: Giúp cập nhật dòng chữ "Hoạt động X phút trước" theo thời gian thực
  useEffect(() => {
    if (isGroup || isOnline) return;
    const interval = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, [isGroup, isOnline]);

  // 🌟 LOGIC TÍNH TOÁN HIỂN THỊ CHỮ ZALO
  const headerStatusText = useMemo(() => {
    if (isGroup) return `${membersData.length} thành viên`;
    if (isNotFriendState) return 'Người lạ (Chưa kết bạn)'; // 🌟 ƯU TIÊN HIỂN THỊ NẾU KHÔNG PHẢI BẠN BÈ
    if (isOnline) return 'Đang hoạt động';
    if (!lastOnlineTime) return 'Không hoạt động';

    const last = new Date(lastOnlineTime);
    if (isNaN(last.getTime())) return 'Không hoạt động';

    const now = new Date(nowTick);
    const diffMs = now.getTime() - last.getTime();
    if (diffMs < 0) return 'Vừa mới truy cập';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins <= 1) return 'Vừa mới truy cập';
    if (diffMins < 60) return `Hoạt động ${diffMins} phút trước`;
    if (diffHours < 24 && last.getDate() === now.getDate()) return `Hoạt động ${diffHours} giờ trước`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (last.getDate() === yesterday.getDate() && last.getMonth() === yesterday.getMonth() && last.getFullYear() === yesterday.getFullYear()) {
      return `Hoạt động hôm qua lúc ${last.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return `Hoạt động ${last.toLocaleDateString('vi-VN')}`;
  }, [isGroup, membersData.length, isOnline, lastOnlineTime, nowTick]);

  // Gọi API Bạn bè để đảm bảo lấy được trạng thái Online chuẩn xác nhất nếu chưa có
  useEffect(() => {
    const checkFriendStatus = async () => {
      if (!isGroup && partnerId) {
        try {
          const res = await friendApi.getFriends();
          const friendsList = res.data?.result || [];
          const friendInfo = friendsList.find((f: any) => f._id === partnerId || f.id === partnerId);
          setIsNotFriendState(!friendInfo);
          
          if (friendInfo) {
            if (friendInfo.isOnline !== undefined) setIsOnline(!!friendInfo.isOnline);
            if (friendInfo.lastOnline || friendInfo.last_active || friendInfo.lastActiveAt) {
              setLastOnlineTime(friendInfo.lastActiveAt || friendInfo.lastOnline || friendInfo.last_active);
            }
          }
        } catch (error) {}
      }
    };
    checkFriendStatus();
  }, [isGroup, partnerId]);

  useEffect(() => {
    if (conversationId && drafts && drafts[conversationId]) setInputText(drafts[conversationId])
  }, [conversationId])

  useEffect(() => {
    const fetchConversationDetail = async () => {
      try {
        const res = await getConversationDetail(route.params.id)
        if (res.data?.result?.pinnedMessages) setPinnedMessages(res.data.result.pinnedMessages)
      } catch (error) {}
    }
    fetchConversationDetail()
  }, [route.params.id])

  useEffect(() => {
    if (!socket) return
    const handlePinnedUpdate = (data: any) => { if (data.conversationId === route.params.id) setPinnedMessages(data.pinnedMessages) }
    socket.on('pinned_messages_updated', handlePinnedUpdate)
    return () => { socket.off('pinned_messages_updated', handlePinnedUpdate) }
  }, [socket, route.params.id])

  useEffect(() => {
    if (id) markConversationAsSeen(id).then(() => clearLocalUnread(id)).catch(() => clearLocalUnread(id))
  }, [id])

  useEffect(() => {
    const initChat = async () => {
      let resolvedUserId = currentUserId
      if (!resolvedUserId) {
        try {
          const token = await AsyncStorage.getItem('access_token')
          if (token) {
            const decoded: any = jwtDecode(token); resolvedUserId = decoded.user_id || decoded._id || decoded.id
            setCurrentUserId(resolvedUserId)
          }
        } catch (e) { }
      }
      if (conversationId && resolvedUserId) {
        setLoading(true)
        try {
          const res = await getMessages(conversationId, null, 20)
          const rawData = res.data.result || res.data.data || []
          if (rawData.length > 0) setCursor(rawData[rawData.length - 1]._id)
          if (rawData.length < 20) setHasMore(false)
          setMessages(rawData)

          const detailRes = await getConversationDetail(conversationId)
          const conv = detailRes.data?.result
          if (conv) {
            const rawMembers = conv.participants || conv.members || []
            let pMembers = rawMembers.map((m: any) => (m.userId ? m.userId : m)).filter((m: any) => m != null)
            
            const isPopulated = pMembers.length > 0 && typeof pMembers[0] === 'object' && (pMembers[0].avatar || pMembers[0].avatarUrl || pMembers[0].userName);
            let finalMembers = isPopulated ? pMembers : members;

            let newAvatarUrl = conv.avatarUrl || '';

            if (!isGroup) {
              finalMembers = finalMembers.filter((m: any) => m._id !== resolvedUserId && m.id !== resolvedUserId)
              if (finalMembers.length > 0) {
                if (!newAvatarUrl) newAvatarUrl = finalMembers[0].avatar || finalMembers[0].avatarUrl || '';
                if (!partnerId) setPartnerId(finalMembers[0]._id || finalMembers[0].id);
                
                // Đề phòng API trả về đè mất data xịn, ta chỉ update nếu API thực sự có field này
                if (finalMembers[0].isOnline !== undefined) setIsOnline(!!finalMembers[0].isOnline);
                if (finalMembers[0].lastActiveAt || finalMembers[0].lastOnline || finalMembers[0].last_active) {
                  setLastOnlineTime(finalMembers[0].lastActiveAt || finalMembers[0].lastOnline || finalMembers[0].last_active);
                }
              }
            }

            setMembersData(finalMembers.length > 0 ? finalMembers : members)
            setChatAvatarUrl(newAvatarUrl || avatar)

            if (conv.pinnedMessages) setPinnedMessages(conv.pinnedMessages)
            if (conv.name) setCurrentChatName(conv.name)
            if (conv.is_disbanded || conv.isDisbanded) {
              setIsGroupDisbanded(true)
              setDisbandMessage(conv.disbanded_message || 'Nhóm đã bị giải tán.')
            } else { setIsGroupDisbanded(false) }
            const myMember = (conv.members || []).find((m: any) => m.userId?.toString() === resolvedUserId)
            if (myMember?.hasMuted !== undefined) setIsMutedState(myMember.hasMuted)
          }
        } catch (error: any) {} finally { setLoading(false) }
      }
    }
    initChat()
  }, [conversationId, isGroup, currentUserId])

  // 🌟 FIX LOGIC LẮNG NGHE SOCKET CHUẨN TỪ BACKEND
  useEffect(() => {
    if (!socket || !conversationId) return

    const handleReceiveMessage = (newMessage: any) => {
      if (newMessage.sender?._id === currentUserId && newMessage.type !== 'system') return
      if (newMessage.conversationId === conversationId || newMessage.convId === conversationId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg._id === newMessage._id)) return prev
          return [newMessage, ...prev]
        })
        if (currentUserId) {
          socket.emit('message_seen', { messageId: newMessage._id, conversationId })
          clearLocalUnread(conversationId)
        }
      }
    }
    
    const handleGroupDisbanded = ({ conversationId: disbandedId, message }: any) => {
      if (disbandedId === conversationId) {
        setIsGroupDisbanded(true)
        setDisbandMessage(message || 'Nhóm trưởng đã giải tán nhóm')
        setMessages((prev) => [{ _id: `disband_${Date.now()}`, conversationId, type: 'system', content: message || 'Nhóm trưởng đã giải tán nhóm', createdAt: new Date().toISOString() }, ...prev])
      }
    }
    
    const handleMessageRevoked = (data: any) => {
      if (data.conversationId === conversationId) setMessages((prev) => prev.map((msg) => msg._id === data.messageId ? { ...msg, type: 'revoked', content: '' } : msg))
    }
    const handleMessageReacted = (data: any) => {
      setMessages((prev) => prev.map((msg) => msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg))
    }
    const handleConversationUpdated = (data: any) => {
      if (data.conversationId === conversationId && data.name) setCurrentChatName(data.name)
    }

    // Backend CỦA BẠN CHỈ DÙNG user_status_change
    const handleUserStatusChange = (data: any) => {
      const uid = data?.userId || data?.id || data?._id;
      if (!isGroup && uid === partnerId) {
        setIsOnline(data.isOnline);
        if (!data.isOnline) {
          setLastOnlineTime(data.lastActiveAt || new Date().toISOString());
        }
      }
    }

    socket.on('receive_message', handleReceiveMessage)
    socket.on('message_revoked', handleMessageRevoked)
    socket.on('message_reacted', handleMessageReacted)
    socket.on('group_disbanded', handleGroupDisbanded)
    socket.on('conversation_updated', handleConversationUpdated)
    socket.on('user_status_change', handleUserStatusChange) // <-- Duy nhất sự kiện này hoạt động cho Status

    return () => {
      socket.off('receive_message', handleReceiveMessage)
      socket.off('message_revoked', handleMessageRevoked)
      socket.off('message_reacted', handleMessageReacted)
      socket.off('group_disbanded', handleGroupDisbanded)
      socket.off('conversation_updated', handleConversationUpdated)
      socket.off('user_status_change', handleUserStatusChange)
    }
  }, [socket, conversationId, currentUserId, partnerId, isGroup, clearLocalUnread])

  const groupedMessages = messages
  const isInputDisabled = isGroupDisbanded || (!isGroup && isNotFriendState)

  const handleForward = () => { setShowMenu(false); if (selectedMsg) navigation.navigate('ForwardMessageScreen', { messageId: selectedMsg._id }) }

  const scrollToMessage = (msgId: string) => {
    setShowPinnedModal(false)
    const index = groupedMessages.findIndex((msg) => msg._id === msgId)
    if (index !== -1) {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 })
      setHighlightedMsgId(msgId)
      setTimeout(() => { setHighlightedMsgId(null) }, 2000)
    } else {
      Alert.alert('Thông báo', 'Tin nhắn này ở quá xa, vui lòng cuộn lên để tải thêm lịch sử trò chuyện.')
    }
  }

  const handleSuggestReply = async () => {
    if (messages.length === 0) return
    setIsSuggesting(true)
    try {
      const recentMsgs = messages.slice(-5)
      const res = await suggestReplyApi(recentMsgs)
      if (res.data?.result) {
        const text = `@PulseAI ${res.data.result.trim()}`
        setInputText(text)
        if (updateDraft && conversationId) updateDraft(conversationId, text)
      }
    } catch (error) { Alert.alert(t.error, t.messageAiSuggestFailed) } finally { setIsSuggesting(false) }
  }

  const VideoThumbnail = ({ url }: { url: string }) => {
    const player = useVideoPlayer({ uri: url }, (p) => p.pause())
    return (
      <View style={{ width: 240, height: 300, borderRadius: 16, overflow: 'hidden' }}>
        <VideoView style={{ width: '100%', height: '100%' }} player={player} nativeControls={false} contentFit="cover" />
        <View style={styles.playIconOverlay}>
          <Ionicons name="play-circle" size={54} color="rgba(255, 255, 255, 0.85)" />
        </View>
      </View>
    )
  }

  const VideoViewer = ({ url }: { url: string }) => {
    const player = useVideoPlayer({ uri: url }, (player) => { player.loop = true; player.play() })
    return <VideoView style={{ width: '100%', height: '100%' }} player={player} nativeControls={true} allowsFullscreen allowsPictureInPicture />
  }

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, allowsMultipleSelection: true, quality: 0.8, videoExportPreset: ImagePicker.VideoExportPreset.HighestQuality })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const validAssets: any[] = []
      for (const asset of result.assets) {
        const isVideo = asset.type === 'video' || asset.uri.match(/\.(mp4|mov|avi|mkv)$/i)
        validAssets.push({ ...asset, attachmentType: 'media', detectedType: isVideo ? 'video' : 'image' })
      }
      if (validAssets.length > 0) setPendingMedia((prev) => [...prev, ...validAssets])
    }
  }

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const validAssets: any[] = []
      for (const asset of result.assets) {
        if (asset.size && asset.size > MAX_FILE_SIZE) { Alert.alert(t.error || 'Lỗi', `Không thể gửi file lớn hơn ${MAX_FILE_SIZE / (1024 * 1024)}MB`); continue }
        const extension = (asset.name || '').split('.').pop()?.toLowerCase() || ''
        if (BLOCKED_EXTENSIONS.includes(extension)) { Alert.alert('Lỗi bảo mật', `Không được phép gửi tệp tin định dạng .${extension}`); continue }
        validAssets.push({ ...asset, attachmentType: 'file', fileSize: asset.size })
      }
      if (validAssets.length > 0) setPendingMedia((prev) => [...prev, ...validAssets])
    }
  }

  const uploadMultipleAttachments = async (files: any[], type: 'media' | 'file') => {
    setIsUploading(true)
    const tempId = Date.now().toString()
    const filePayloads: FilePayload[] = files.map((f) => ({ url: f.uri, originalName: f.name || f.fileName || `file_${Date.now()}`, size: f.size || f.fileSize || 0, mimeType: f.mimeType || f.type || 'application/octet-stream' }))
    const content = filePayloads.length === 1 ? JSON.stringify(filePayloads[0]) : JSON.stringify(filePayloads)
    const tempMessage = { _id: tempId, conversationId, type: type, content: content, createdAt: new Date().toISOString(), sender: { _id: currentUserId, userName: t.messageYou }, isSending: true }
    setMessages((prev) => [tempMessage, ...prev])
    try {
      const res = await sendMediaMessage(conversationId, files, type)
      const realMessage = res.data?.result || res.data
      if (realMessage) { setMessages((prev) => prev.map((msg) => (msg._id === tempId ? realMessage : msg))); unarchiveChat(conversationId) }
    } catch (error: any) {
      setMessages((prev) => [{ _id: `error_${Date.now()}`, conversationId, type: 'system_error', content: error.response?.data?.message || t.messageAttachmentFailed || 'Lỗi', createdAt: new Date().toISOString() }, ...prev.filter((msg) => msg._id !== tempId)])
    } finally { setIsUploading(false) }
  }

  const handleSend = async () => {
    let textToSend = inputText.trim()
    if (textToSend === '@PulseAI ') textToSend = ''
    if (textToSend.length > 2000) { Alert.alert(t.error || 'Cảnh báo', `Tin nhắn quá dài (${textToSend.length}/2000 ký tự).`); return }
    const mediaToSend = [...pendingMedia]
    if (textToSend.length === 0 && mediaToSend.length === 0) return
    setInputText(''); setPendingMedia([])
    if (updateDraft && conversationId) updateDraft(conversationId, '')

    if (textToSend.length > 0) {
      const tempId = Date.now().toString()
      setMessages((prev) => [{ _id: tempId, conversationId, type: 'text', content: textToSend, createdAt: new Date().toISOString(), sender: { _id: currentUserId, userName: t.messageMe }, isSending: true }, ...prev])
      try {
        const res = await sendMessage(conversationId, textToSend, 'text')
        const realMessage = res.data.result || res.data
        if (realMessage) { setMessages((prev) => prev.map((msg) => (msg._id === tempId ? realMessage : msg))); unarchiveChat(conversationId) }
      } catch (error: any) {
        setMessages((prev) => [{ _id: `error_${Date.now()}`, conversationId, type: 'system_error', content: error.response?.data?.message || 'Lỗi gửi', createdAt: new Date().toISOString() }, ...prev.filter((msg) => msg._id !== tempId)])
      }
    }
    const mediaFiles = mediaToSend.filter((m) => m.attachmentType === 'media')
    const docFiles = mediaToSend.filter((m) => m.attachmentType === 'file')
    if (mediaFiles.length > 0) await uploadMultipleAttachments(mediaFiles, 'media')
    if (docFiles.length > 0) await uploadMultipleAttachments(docFiles, 'file')
  }

  const handleDeleteDisbandedChat = () => {
    Alert.alert('Xóa trò chuyện', 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => { try { await deleteConversationForMe(conversationId); navigation.goBack() } catch (error) {} } }
    ])
  }

  const loadMoreMessages = async () => {
    if (!hasMore || isFetchingMore || !cursor) return
    try {
      setIsFetchingMore(true)
      const res = await getMessages(conversationId, cursor, 20)
      const rawData = res.data.result || res.data.data || []
      if (rawData.length > 0) { setCursor(rawData[rawData.length - 1]._id); setMessages((prev) => [...prev, ...rawData]) }
      if (rawData.length < 20) setHasMore(false)
    } catch (error: any) { console.log('Lỗi tải thêm tin nhắn:', error.message) } finally { setIsFetchingMore(false) }
  }

  const handleSummarizeChat = async () => {
    if (!messages || messages.length === 0) { Alert.alert(t.error || 'Lỗi', 'Chưa có tin nhắn nào.'); return }
    setIsSummarizing(true); setShowAiModal(true); setIsAiProcessing(true); setAiSummaryText('')
    try {
      const recentMessages = [...messages].slice(0, 50).reverse()
      const res = await summarizeChatApi(recentMessages)
      setAiSummaryText(res.data?.result || 'Không thể tạo bản tóm tắt lúc này.')
    } catch (error: any) { setAiSummaryText('Đã có lỗi xảy ra.') } finally { setIsSummarizing(false); setIsAiProcessing(false) }
  }

  const handleToggleReact = async (message: any, emoji: string) => { }
  const handleRemoveAllReactions = async (message: any) => { }

  const buildReactionGroups = (reactions: any[] = []) => {
    const groupMap = new Map<string, { emoji: string; count: number; users: any[] }>()
    reactions.forEach((reaction: any) => {
      const emoji = reaction?.emoji
      if (!emoji) return
      if (!groupMap.has(emoji)) groupMap.set(emoji, { emoji, count: 0, users: [] })
      const group = groupMap.get(emoji)!; group.count += 1; group.users.push(reaction)
    })
    return Array.from(groupMap.values()).sort((a, b) => b.count - a.count)
  }

  const openReactionDetails = (message: any) => { setReactionDetailMessage(message); setReactionFilter('ALL'); setShowReactionDetails(true) }

  const reactionGroupsForModal = useMemo(() => buildReactionGroups(reactionDetailMessage?.reactions || []), [reactionDetailMessage, currentUserId])
  const reactionUsersForModal = useMemo(() => { return [] }, [reactionFilter, reactionGroupsForModal, currentUserId])

  // 🌟 LOGIC THU HỒI
  const handleRevoke = async () => { 
    if (!selectedMsg || selectedMsg.type === 'revoked') return;
    try {
      await recallMessageApi(selectedMsg._id);
      setShowMenu(false);
      setMessages((prev) => prev.map((msg) => msg._id === selectedMsg._id ? { ...msg, type: 'revoked', content: '' } : msg));
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thu hồi tin nhắn lúc này.');
    }
  }

  const handleDeleteForMe = async () => { }
  const handleDoubleTap = (message: any) => { }

  const handleLongPress = (event: any, message: any) => {
    if (message.type === 'revoked') return // 🌟 KHÔNG THAO TÁC NẾU ĐÃ THU HỒI
    const { pageY } = event.nativeEvent
    setMenuPos({ x: 0, y: Math.max(100, pageY - 130) })
    setSelectedMsg(message)
    setShowMenu(true)
  }

  const getReactionFromX = useCallback((x: number) => {
    if (emojiStripWidth <= 0) return null
    const clampedX = Math.max(0, Math.min(x, emojiStripWidth - 1))
    const cellWidth = emojiStripWidth / REACTION_LIST.length
    const index = Math.floor(clampedX / cellWidth)
    if (index < 0 || index >= REACTION_LIST.length) return null
    return REACTION_LIST[index]
  }, [emojiStripWidth])

  const emojiPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => { setHoveredReaction(getReactionFromX(e.nativeEvent.locationX)) },
    onPanResponderMove: (e) => { setHoveredReaction(getReactionFromX(e.nativeEvent.locationX)) },
    onPanResponderRelease: () => { if (hoveredReaction && selectedMsg) handleToggleReact(selectedMsg, hoveredReaction); else setShowMenu(false); setHoveredReaction(null) },
    onPanResponderTerminate: () => setHoveredReaction(null)
  }), [getReactionFromX, hoveredReaction, selectedMsg])

  const formatTime = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const handleTogglePinMessage = async (message: any) => {
    try {
      const isPinned = pinnedMessages.some((p) => p.messageId === message._id)
      await pinMessageApi(message._id, isPinned ? 'unpin' : 'pin')
    } catch (error: any) { Alert.alert('Lỗi', error.response?.data?.message || 'Không thể thực hiện hành động này.') }
  }

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString); const today = new Date(); const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return t.messageToday
    if (date.toDateString() === yesterday.toDateString()) return t.messageYesterday
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const renderAiText = (text: string) => { return text || '' }

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (!viewableItems || viewableItems.length === 0) return
    const lastVisibleItem = viewableItems[viewableItems.length - 1]
    if (lastVisibleItem?.index === messages.length - 1) clearLocalUnread(conversationId)
  }, [messages.length, conversationId, clearLocalUnread])

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 80 })
  const onViewableItemsChangedRef = useRef(handleViewableItemsChanged)
  useEffect(() => { onViewableItemsChangedRef.current = handleViewableItemsChanged }, [handleViewableItemsChanged])

  const renderPinnedMessageContent = (message: any) => {
    if (!message || !message.content) return '[Nội dung không khả dụng]'
    const type = message.type || 'text'
    if (type === 'text') return message.content.startsWith('@PulseAI ') ? message.content.substring(9) : message.content
    try {
      const payloads = parseMediaContent(message.content)
      if (payloads && payloads.length > 0) {
        const firstPayload = payloads[0]
        let fileName = firstPayload.originalName || ''
        if (fileName === 'file' || fileName.length > 50) fileName = ''
        const ext = firstPayload.originalName.split('.').pop()?.toLowerCase() || ''
        const mime = firstPayload.mimeType || ''
        if (type === 'file' || mime.startsWith('application/') || mime.startsWith('text/') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'csv', '7z'].includes(ext)) return `[File] ${fileName}`.trim()
        if (type === 'video' || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext) || mime.startsWith('video/')) return `[Video] ${fileName}`.trim()
        return `[Photo] ${fileName}`.trim()
      }
    } catch (error) {}
    if (type === 'video') return '[Video]'; if (type === 'file') return '[Tệp đính kèm]'; if (type === 'image' || type === 'media') return '[Hình ảnh]'; if (type === 'call') return '[Cuộc gọi]'
    return message.content
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      <MessageHeader 
        navigation={navigation} conversationId={conversationId} currentChatName={currentChatName}
        chatAvatarUrl={chatAvatarUrl} isGroup={isGroup} isOnline={isOnline} statusText={headerStatusText}
        isMutedState={isMutedState} isGroupDisbanded={isGroupDisbanded} membersData={membersData}
        isSummarizing={isSummarizing} handleSummarizeChat={handleSummarizeChat} 
        isNotFriendState={isNotFriendState} // 🌟 TRUYỀN BIẾN NÀY SANG HEADER
        COLORS={COLORS} styles={styles}
      />

      {/* 🌟 BANNER CẢNH BÁO NẾU KHÔNG PHẢI BẠN BÈ */}
      {!isGroup && isNotFriendState && (
        <View style={{ backgroundColor: isDarkMode ? '#450a0a' : '#FEF2F2', paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: isDarkMode ? '#7f1d1d' : '#FCA5A5' }}>
          <Ionicons name="information-circle-outline" size={16} color={isDarkMode ? '#FCA5A5' : '#EF4444'} style={{ marginRight: 6 }} />
          <Text style={{ color: isDarkMode ? '#FCA5A5' : '#EF4444', fontSize: 13, fontWeight: '500' }}>
            Người này không có trong danh sách bạn bè
          </Text>
        </View>
      )}

      {/* ... GIỮ NGUYÊN PHẦN BÊN DƯỚI (pinnedMessages...) */}

      {pinnedMessages.length > 0 && (
        <View style={styles.pinnedBannerContainer}>
          <View style={styles.pinnedIcon}><Ionicons name="pin" size={16} color={COLORS.primary} /></View>
          <TouchableOpacity style={styles.pinnedContent} onPress={() => { const latestPin = pinnedMessages[pinnedMessages.length - 1]; if (latestPin) scrollToMessage(latestPin.messageId); }}>
            <Text style={styles.pinnedTitle}>Pinned message ({pinnedMessages.length})</Text>
            <Text style={styles.pinnedText} numberOfLines={1}>{renderPinnedMessageContent(pinnedMessages[pinnedMessages.length - 1]?.message)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowPinnedModal(true)}><Ionicons name="chevron-down" size={20} color={COLORS.textLight} /></TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {!isGroupDisbanded && (
          <FlatList
            ref={flatListRef} inverted={true} data={groupedMessages}
            keyExtractor={(item, index) => `${item._id ?? 'msg'}_${index}`}
            renderItem={({ item, index }) => (
               <MessageBubble 
                 item={item} index={index} groupedMessages={groupedMessages} 
                 isMe={(item.sender?._id || item.senderId) === currentUserId} messages={messages} 
                 highlightedMsgId={highlightedMsgId} formatMessageDate={formatMessageDate} 
                 formatTime={formatTime} parseMediaContent={parseMediaContent} 
                 getFileIconInfo={getFileIconInfo} formatBytes={formatBytes} 
                 buildReactionGroups={buildReactionGroups} handleLongPress={handleLongPress} 
                 handleDoubleTap={handleDoubleTap} setPreviewMedia={setPreviewMedia} 
                 handleToggleReact={handleToggleReact} openReactionDetails={openReactionDetails} 
                 VideoThumbnail={VideoThumbnail} VideoViewer={VideoViewer} COLORS={COLORS} 
                 styles={styles} t={t} isDarkMode={isDarkMode} 
                 SCREEN_WIDTH={SCREEN_WIDTH} SCREEN_HEIGHT={SCREEN_HEIGHT}
               />
            )}
            contentContainerStyle={styles.listContent}
            onScrollToIndexFailed={(info) => { const wait = new Promise((resolve) => setTimeout(resolve, 500)); wait.then(() => { flatListRef.current?.scrollToIndex({ index: info.index, animated: true }) }) }}
            onEndReached={loadMoreMessages} onEndReachedThreshold={0.5}
            ListFooterComponent={ !hasMore && messages.length > 0 ? (<Text style={{ textAlign: 'center', color: COLORS.textLight, paddingVertical: 10 }}>Đã tải hết lịch sử trò chuyện</Text>) : isFetchingMore ? (<ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 10 }} />) : null }
            onViewableItemsChanged={(info) => onViewableItemsChangedRef.current(info)} viewabilityConfig={viewabilityConfig.current}
          />
        )}

        <MessageInput 
          isGroupDisbanded={isGroupDisbanded} isInputDisabled={isInputDisabled} disbandMessage={disbandMessage} handleDeleteDisbandedChat={handleDeleteDisbandedChat}
          formatMessageDate={formatMessageDate} inputText={inputText} setInputText={setInputText} updateDraft={updateDraft} conversationId={conversationId}
          handleSend={handleSend} pendingMedia={pendingMedia} setPendingMedia={setPendingMedia} handlePickMedia={handlePickMedia} handlePickDocument={handlePickDocument}
          handleSuggestReply={handleSuggestReply} isUploading={isUploading} isSuggesting={isSuggesting} COLORS={COLORS} styles={styles} insets={insets} t={t} isDarkMode={isDarkMode}
        />
      </KeyboardAvoidingView>

      <PinnedModal showPinnedModal={showPinnedModal} setShowPinnedModal={setShowPinnedModal} pinnedMessages={pinnedMessages} scrollToMessage={scrollToMessage} renderPinnedMessageContent={renderPinnedMessageContent} handleTogglePinMessage={handleTogglePinMessage} COLORS={COLORS} styles={styles} isDarkMode={isDarkMode} />
      <ReactionModal showReactionDetails={showReactionDetails} setShowReactionDetails={setShowReactionDetails} reactionFilter={reactionFilter} setReactionFilter={setReactionFilter} reactionGroupsForModal={reactionGroupsForModal} reactionUsersForModal={reactionUsersForModal} COLORS={COLORS} styles={styles} t={t} isDarkMode={isDarkMode} />
      <AiSummaryModal showAiModal={showAiModal} setShowAiModal={setShowAiModal} isAiProcessing={isAiProcessing} aiSummaryText={aiSummaryText} renderAiText={renderAiText} t={t} styles={styles} />

      <MessageMenuModal 
        showMenu={showMenu} setShowMenu={setShowMenu} menuPos={menuPos} setEmojiStripWidth={setEmojiStripWidth} emojiPanResponder={emojiPanResponder} hoveredReaction={hoveredReaction}
        handleRemoveAllReactions={handleRemoveAllReactions} selectedMsg={selectedMsg} handleForward={handleForward} pinnedMessages={pinnedMessages} handleTogglePinMessage={handleTogglePinMessage}
        currentUserId={currentUserId} handleRevoke={handleRevoke} handleDeleteForMe={handleDeleteForMe} COLORS={COLORS} styles={styles} t={t}
      />

      <MediaPreviewModal 
        previewMedia={previewMedia} setPreviewMedia={setPreviewMedia} SCREEN_WIDTH={SCREEN_WIDTH} SCREEN_HEIGHT={SCREEN_HEIGHT} VideoViewer={VideoViewer} styles={styles} 
      />
    </SafeAreaView>
  )
}

const getStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, marginRight: 8 },
  backBtn: { marginRight: 10, flexShrink: 0 },
  headerName: { color: COLORS.headerText, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  headerStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  iconBtn: { marginLeft: 16 },
  chatArea: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  aiOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
  aiContainer: { width: '100%', backgroundColor: '#0F172A', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  aiTitle: { color: '#F8FAFC', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  aiText: { color: '#E2E8F0', fontSize: 16, lineHeight: 28, textAlign: 'left' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 15, color: '#94A3B8', fontSize: 14, fontStyle: 'italic' },
  aiBtn: { paddingVertical: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#4C1D95' },
  aiBtnText: { color: '#DDD6FE', fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  aiLink: { color: '#8B5CF6', textDecorationLine: 'underline', fontWeight: 'bold' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  avatarPlaceholder: { width: 35, marginRight: 8 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  messageContent: { maxWidth: '75%' },
  bubble: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 15, borderRadius: 18, position: 'relative', minWidth: 60, marginBottom: 5 },
  bubbleMe: { backgroundColor: COLORS.primary, borderBottomRightRadius: 2, elevation: 1 },
  bubbleOther: { backgroundColor: COLORS.surface, borderWidth: isDarkMode ? 1 : 0.5, borderColor: COLORS.border, borderBottomLeftRadius: 2, elevation: 1 },
  messageText: { fontSize: 16, lineHeight: 22, paddingRight: 5 },
  messageTime: { fontSize: 11, color: isDarkMode ? COLORS.textLight : '#6B7280', marginTop: 4, alignSelf: 'flex-end' },
  dateDivider: { alignItems: 'center', marginVertical: 15 },
  dateDividerText: { backgroundColor: COLORS.border, color: COLORS.textLight, fontSize: 12, fontWeight: '600', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  systemMessageWrapper: { alignItems: 'center', marginVertical: 6, paddingHorizontal: 24 },
  systemMessageText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.surface, alignItems: 'flex-end', borderTopWidth: 1, borderColor: COLORS.border },
  attachBtn: { padding: 6, marginBottom: 0 },
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 16, minHeight: 38 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8, marginBottom: 1 },
  reactionContainer: { position: 'absolute', bottom: -8, right: -8, flexDirection: 'row', zIndex: 2 },
  miniReact: { width: 24, height: 24, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  reactionSummary: { minHeight: 24, minWidth: 40, paddingHorizontal: 8, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, elevation: 2 },
  reactionEmojiPreview: { fontSize: 11 },
  reactionCountText: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  defaultLike: { width: 24, height: 24, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', opacity: 0.75 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  reactionDetailBox: { position: 'absolute', top: '20%', alignSelf: 'center', width: '92%', maxHeight: 430, backgroundColor: COLORS.surface, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  reactionDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reactionDetailTitle: { fontSize: 30, fontWeight: '700', color: COLORS.text },
  reactionDetailBody: { flexDirection: 'row', minHeight: 260, maxHeight: 360 },
  reactionFilterCol: { width: 115, backgroundColor: isDarkMode ? '#0F172A' : '#F3F4F6' },
  reactionFilterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12 },
  reactionFilterItemActive: { backgroundColor: isDarkMode ? '#11182D' : '#E5E7EB' },
  reactionFilterLabel: { color: COLORS.text, fontSize: 20, fontWeight: '500' },
  reactionFilterCount: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  reactionUsersCol: { flex: 1, backgroundColor: COLORS.surface, paddingVertical: 8 },
  reactionUserRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  reactionUserAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  reactionUserAvatarFallback: { width: 36, height: 36, borderRadius: 18, marginRight: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceSoft },
  reactionUserAvatarText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  reactionUserName: { flex: 1, color: COLORS.text, fontSize: 20, fontWeight: '500' },
  reactionUserRight: { flexDirection: 'row', alignItems: 'center', maxWidth: '48%' },
  reactionUserEmoji: { color: COLORS.text, fontSize: 22, marginRight: 8, textAlign: 'right', flexShrink: 1 },
  reactionUserCount: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  reactionEmptyText: { textAlign: 'center', color: COLORS.textLight, paddingVertical: 20 },
  menuBox: { position: 'absolute', alignSelf: 'center', backgroundColor: COLORS.surface, width: '85%', borderRadius: 25, padding: 10, elevation: 10, borderWidth: isDarkMode ? 1 : 0, borderColor: COLORS.border },
  emojiRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: COLORS.border, paddingHorizontal: 8 },
  emojiStrip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginRight: 6 },
  reactionEmojiWrap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  reactionEmojiWrapHovered: { backgroundColor: COLORS.surfaceSoft, transform: [{ translateY: -6 }] },
  reactionEmojiText: { fontSize: 33 },
  reactionEmojiTextHovered: { fontSize: 40 },
  removeAllReactionBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  actionRow: { paddingVertical: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  aiContent: { maxHeight: 350, paddingHorizontal: 20, paddingVertical: 20 },
  aiFooter: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  mediaImage: { width: 240, height: 300, borderRadius: 16, borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.1)' },
  playIconOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 16 },
  fileCard: { width: 240, borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 5 },
  fileCardPreview: { height: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  fileCardInfo: { flexDirection: 'row', padding: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border },
  fileTypeBadge: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  fileTypeBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  fileNameCardText: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  fileMetaRow: { flexDirection: 'row', alignItems: 'center' },
  fileMetaText: { fontSize: 11 },
  downloadIconBtn: { padding: 6, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  imagePreviewContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, right: 20, zIndex: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  fullScreenImage: { width: '100%', height: '80%' },
  pendingContainerWrap: { backgroundColor: COLORS.surface, borderTopWidth: 1, borderColor: COLORS.border },
  pendingContainer: { paddingHorizontal: 10, paddingVertical: 10, alignItems: 'center' },
  pendingMediaWrap: { position: 'relative', width: 60, height: 60, borderRadius: 8, marginRight: 15 },
  pendingImage: { width: '100%', height: '100%', borderRadius: 8 },
  pendingFile: { width: '100%', height: '100%', borderRadius: 8, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center' },
  removePendingBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: COLORS.badge, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  pendingFileNameOverlay: { position: 'absolute', bottom: -18, left: 0, width: 60, fontSize: 10, color: COLORS.text, textAlign: 'center' },
  pendingVideoIcon: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.5)', padding: 2, borderRadius: 4 },
  imageGridContainer: { width: 240, marginTop: 5, backgroundColor: 'transparent', borderWidth: 0.5, borderColor: 'rgba(0,0,0,0.05)' },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  gridCol: { flexDirection: 'column' },
  gridImageWrapper: { backgroundColor: '#E2E8F0', overflow: 'hidden' },
  fullImage: { width: '100%', height: '100%' },
  moreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  moreText: { color: 'white', fontSize: 24, fontWeight: '700' },
  callCard: { minWidth: 220, maxWidth: 280, padding: 0, borderRadius: 18, overflow: 'hidden', marginBottom: 5 },
  callCardTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14 },
  callIconWrapper: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  callInfo: { flex: 1 },
  callTitle: { fontSize: 16, fontWeight: '600', marginBottom: 3 },
  callSubtitle: { fontSize: 13 },
  callDivider: { height: 1, width: '100%' },
  callActionBtn: { paddingVertical: 12, alignItems: 'center', justifyContent: 'center', width: '100%' },
  callActionText: { fontSize: 15, fontWeight: '600' },
  pinnedBannerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, zIndex: 10 },
  pinnedIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceSoft, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  pinnedContent: { flex: 1 },
  pinnedTitle: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginBottom: 2 },
  pinnedText: { fontSize: 14, color: COLORS.text },
  pinnedModalContainer: { position: 'absolute', bottom: 0, width: '100%', maxHeight: '60%', backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  pinnedModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pinnedModalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  pinnedItemRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pinnedItemContent: { flex: 1, paddingRight: 10 },
  pinnedItemText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  unpinBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: isDarkMode ? '#332727' : '#FEF2F2', borderRadius: 8 },
  unpinText: { fontSize: 13, color: COLORS.badge, fontWeight: '600' }
})

export default MessageScreen;