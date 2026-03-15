import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, SafeAreaView, Keyboard,
  ActivityIndicator, RefreshControl, useColorScheme, Modal, Pressable
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { getMessages, sendMessage } from '../apis/chat.api';

// ==========================================
// 1. CẤU HÌNH MÀU SẮC (GIỮ NGUYÊN)
// ==========================================
const lightColors = {
  headerBg: "#0091FF", background: "#E2E9F1", surface: "#FFFFFF",
  text: "#000000", textLight: "#8E8E93", border: "#E5E5EA",
  myBubble: "#D8EBFD", myBubbleText: "#000000", otherBubble: "#FFFFFF",
  otherBubbleText: "#000000", senderName: "#0068FF", iconText: "#FFFFFF",
};

const darkColors = {
  headerBg: "#1C1C1E", background: "#000000", surface: "#1C1C1E",
  text: "#FFFFFF", textLight: "#A1A1AA", border: "#2C2C2E",
  myBubble: "#005CC8", myBubbleText: "#FFFFFF", otherBubble: "#2C2C2E",
  otherBubbleText: "#FFFFFF", senderName: "#66B2FF", iconText: "#FFFFFF",
};

const REACTION_LIST = ['👍', '❤️', '🤣', '😮', '😭', '😡'];

const MessageScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);
  const lastTap = useRef(0);

  const isDarkMode = useColorScheme() === 'dark';
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS), [isDarkMode]);

  const { id: conversationId, name: chatName, isGroup } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // --- STATE REACTION & MENU ---
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        const decoded: any = jwtDecode(token);
        setCurrentUserId(decoded.user_id || decoded._id || decoded.id);
      }
    } catch (error) { console.log("Lỗi token:", error); }
  };

  const fetchInitialMessages = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await getMessages(conversationId, null, 20);
      const rawData = res.data.result || res.data.data || [];
      const visibleData = rawData.filter((m: any) => !m.deleted_by_users?.includes(currentUserId));
      if (visibleData.length > 0) setCursor(visibleData[visibleData.length - 1]._id);
      if (visibleData.length < 20) setHasMore(false);
      setMessages([...visibleData].reverse());
    } catch (error: any) { console.log('Lỗi tải tin nhắn:', error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchCurrentUserId().then(() => fetchInitialMessages());
  }, [conversationId]);

  // --- LOGIC THẢ/GỠ REACTION ---
  const handleToggleReact = (message: any, emoji: string) => {
    if (!message || message.type === 'revoked') return; // Chặn thả react vào tin nhắn thu hồi

    setMessages(prev => prev.map(msg => {
      if (msg._id === message._id) {
        const isExist = msg.reactions?.some((r: any) => r.user_id === currentUserId && r.emoji === emoji);
        return { 
          ...msg, 
          reactions: isExist ? [] : [{ emoji, user_id: currentUserId }] 
        };
      }
      return msg;
    }));
    setShowMenu(false);
  };

  // --- TASK 15: THU HỒI (FIXED: RESET LUÔN REACTION) ---
  const handleRevoke = () => {
    setMessages(prev => prev.map(msg => 
      msg._id === selectedMsg._id ? { ...msg, type: 'revoked', content: '', reactions: [] } : msg
    ));
    setShowMenu(false);
  };

  const handleDeleteForMe = () => {
    setMessages(prev => prev.filter(msg => msg._id !== selectedMsg._id));
    setShowMenu(false);
  };

  const handleDoubleTap = (message: any) => {
    if (message.type === 'revoked') return; // Chặn double tap thả tim tin nhắn thu hồi
    const now = Date.now();
    if (now - lastTap.current < 300) handleToggleReact(message, '❤️');
    else lastTap.current = now;
  };

  const handleLongPress = (event: any, message: any) => {
    if (message.type === 'revoked') return;
    const { pageY } = event.nativeEvent;
    setMenuPos({ x: 0, y: Math.max(100, pageY - 130) });
    setSelectedMsg(message);
    setShowMenu(true);
  };

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;
    const contentToSend = inputText.trim();
    setInputText('');
    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId, conversationId, type: 'text', content: contentToSend,
      createdAt: new Date().toISOString(), sender: { _id: currentUserId, userName: 'Tôi' }
    };
    setMessages(prev => [...prev, tempMessage]);
    try {
      const res = await sendMessage(conversationId, contentToSend, 'text');
      const realMessage = res.data.result || res.data;
      if (realMessage) setMessages(prev => prev.map(msg => msg._id === tempId ? realMessage : msg));
    } catch (error) { console.log(error); }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const isMe = (item.sender?._id || item.senderId) === currentUserId;
    const isRevoked = item.type === 'revoked';
    const hasReactions = item.reactions && item.reactions.length > 0;
    const nextItem = index < messages.length - 1 ? messages[index + 1] : null;
    const isSameSenderAsNext = nextItem && (nextItem.sender?._id || nextItem.senderId) === (item.sender?._id || item.senderId);
    const showAvatar = !isMe && !isSameSenderAsNext;

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        {!isMe && (
          <View style={styles.avatarPlaceholder}>
            {showAvatar && (
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>{item.sender?.userName?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
            )}
          </View>
        )}
        <View style={[styles.messageContent, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
          <TouchableOpacity onPress={() => handleDoubleTap(item)} onLongPress={(e) => handleLongPress(e, item)} activeOpacity={0.9}>
            <View style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              isRevoked && { backgroundColor: isDarkMode ? '#222' : '#EEE', opacity: 0.6 }
            ]}>
              <Text style={[
                styles.messageText, 
                { color: isMe ? COLORS.myBubbleText : COLORS.otherBubbleText },
                isRevoked && { fontStyle: 'italic' }
              ]}>
                {isRevoked ? 'Tin nhắn đã được thu hồi' : item.content}
              </Text>
              {!isSameSenderAsNext && !isRevoked && <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>}

              {/* FIXED: CHỈ HIỂN THỊ REACTION NẾU KHÔNG PHẢI TIN THU HỒI */}
              {!isRevoked && (
                <View style={styles.reactionContainer}>
                  {hasReactions ? (
                    <TouchableOpacity style={styles.miniReact} onPress={() => handleToggleReact(item, item.reactions[0].emoji)}>
                      <Text style={{ fontSize: 11 }}>{item.reactions[0].emoji}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.defaultLike} onPress={() => handleToggleReact(item, '👍')}>
                      <Ionicons name="thumbs-up-outline" size={12} color={COLORS.textLight} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="chevron-back" size={28} color="white" /></TouchableOpacity>
          <View><Text style={styles.headerName}>{chatName || 'Chat'}</Text><Text style={styles.headerStatus}>Trực tuyến</Text></View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="call-outline" size={24} color="white" /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam-outline" size={26} color="white" /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="menu" size={28} color="white" /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList ref={flatListRef} data={messages} keyExtractor={(item) => item._id} renderItem={renderMessage} contentContainerStyle={styles.listContent} />
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}><Feather name="plus" size={24} color={COLORS.textLight} /></TouchableOpacity>
          <TextInput style={styles.textInput} placeholder="Tin nhắn..." placeholderTextColor={COLORS.textLight} value={inputText} onChangeText={setInputText} />
          <TouchableOpacity onPress={handleSend} style={styles.sendBtn}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuBox, { top: menuPos.y }]}>
            <View style={styles.emojiRow}>
              {REACTION_LIST.map((e) => (
                <TouchableOpacity key={e} onPress={() => handleToggleReact(selectedMsg, e)} style={{ padding: 10 }}>
                  <Text style={{ fontSize: 30 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionRow}>
              {selectedMsg?.sender?._id === currentUserId && (
                <TouchableOpacity style={styles.menuItem} onPress={handleRevoke}>
                  <Ionicons name="refresh-outline" size={20} color="red" />
                  <Text style={{ color: 'red', marginLeft: 12, fontSize: 16 }}>Thu hồi</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.menuItem} onPress={handleDeleteForMe}>
                <Ionicons name="trash-outline" size={20} color={COLORS.text} />
                <Text style={{ color: COLORS.text, marginLeft: 12, fontSize: 16 }}>Xóa phía tôi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.headerBg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 40 : 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 10 },
  headerName: { color: 'white', fontSize: 18, fontWeight: '600' },
  headerStatus: { color: 'white', fontSize: 12, opacity: 0.8 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 16 },
  chatArea: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  avatarPlaceholder: { width: 35, marginRight: 8 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#A855F7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  messageContent: { maxWidth: '75%' },
  bubble: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 15, borderRadius: 18, position: 'relative', minWidth: 60, marginBottom: 10 },
  bubbleMe: { backgroundColor: COLORS.myBubble, borderBottomRightRadius: 2 },
  bubbleOther: { backgroundColor: COLORS.otherBubble, borderBottomLeftRadius: 2 },
  messageText: { fontSize: 16, lineHeight: 22, paddingRight: 5 },
  messageTime: { fontSize: 11, color: COLORS.textLight, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  attachBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 16, height: 40 },
  sendBtn: { backgroundColor: "#0091FF", width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  reactionContainer: { position: 'absolute', bottom: -8, right: -8, flexDirection: 'row', zIndex: 2 },
  miniReact: { width: 24, height: 24, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  defaultLike: { width: 24, height: 24, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', opacity: 0.75 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  menuBox: { position: 'absolute', alignSelf: 'center', backgroundColor: COLORS.surface, width: '85%', borderRadius: 25, padding: 10, elevation: 10 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 15, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  actionRow: { paddingVertical: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15 }
});

export default MessageScreen;