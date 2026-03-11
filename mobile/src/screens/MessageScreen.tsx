import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard,
  ActivityIndicator,
  RefreshControl,
  useColorScheme // <-- Hook giúp nhận biết máy đang bật Dark hay Light Mode
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { getMessages, sendMessage } from '../apis/chat.api';

// ==========================================
// 1. CẤU HÌNH 2 BẢNG MÀU SÁNG / TỐI CHUẨN ZALO
// ==========================================
const lightColors = {
  headerBg: "#0091FF",        // Header xanh dương đặc trưng
  background: "#E2E9F1",      // Nền chat xám nhạt
  surface: "#FFFFFF",         // Vùng nhập tin nhắn màu trắng
  text: "#000000",            // Chữ đen
  textLight: "#8E8E93",       // Chữ phụ xám nhạt
  border: "#E5E5EA",
  myBubble: "#D8EBFD",        // Bong bóng mình: Xanh dương nhạt
  myBubbleText: "#000000",    // Chữ trong bong bóng mình: Đen
  otherBubble: "#FFFFFF",     // Bong bóng bạn: Trắng
  otherBubbleText: "#000000", // Chữ trong bong bóng bạn: Đen
  senderName: "#0068FF",      // Tên người gửi: Xanh đậm
  iconText: "#FFFFFF",        // Icon & chữ trên Header: Trắng
};

const darkColors = {
  headerBg: "#1C1C1E",        // Header tối màu sang trọng
  background: "#000000",      // Nền chat đen tuyền (Tiết kiệm pin OLED)
  surface: "#1C1C1E",         // Vùng nhập tin nhắn xám đen
  text: "#FFFFFF",            // Chữ trắng
  textLight: "#A1A1AA",       // Chữ phụ xám
  border: "#2C2C2E",
  myBubble: "#005CC8",        // Bong bóng mình: Xanh dương đậm
  myBubbleText: "#FFFFFF",    // Chữ trong bong bóng mình: Trắng (Tương phản tốt)
  otherBubble: "#2C2C2E",     // Bong bóng bạn: Xám đậm
  otherBubbleText: "#FFFFFF", // Chữ trong bong bóng bạn: Trắng
  senderName: "#66B2FF",      // Tên người gửi: Xanh lơ sáng (Dễ đọc trên nền đen)
  iconText: "#FFFFFF",
};

const MessageScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  // --- LẤY THEME HIỆN TẠI CỦA HỆ ĐIỀU HÀNH ---
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

  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        const decoded: any = jwtDecode(token);
        setCurrentUserId(decoded.user_id || decoded._id || decoded.id);
      }
    } catch (error) {
      console.log("Lỗi giải mã token:", error);
    }
  };

  const fetchInitialMessages = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await getMessages(conversationId, null, 20);
      const rawData = res.data.result || res.data.data || res.data || [];

      if (rawData.length > 0) {
        setCursor(rawData[rawData.length - 1]._id);
      }
      if (rawData.length < 20) {
        setHasMore(false);
      }
      setMessages([...rawData].reverse());
    } catch (error: any) {
      console.log('Lỗi lấy tin nhắn lần đầu:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || isLoadingMore || !cursor || !conversationId) return;

    try {
      setIsLoadingMore(true);
      const res = await getMessages(conversationId, cursor, 20);
      const rawOlderData = res.data.result || res.data.data || res.data || [];

      if (rawOlderData.length > 0) {
        setCursor(rawOlderData[rawOlderData.length - 1]._id);
        const reversedOlder = [...rawOlderData].reverse();
        setMessages(prev => [...reversedOlder, ...prev]);
      }
      if (rawOlderData.length < 20) {
        setHasMore(false);
      }
    } catch (error: any) {
      console.log('Lỗi tải thêm tin nhắn cũ:', error.message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchCurrentUserId().then(() => {
      fetchInitialMessages();
    });
  }, [conversationId]);

  useEffect(() => {
    if (!isLoadingMore && messages.length > 0) {
      setTimeout(() => {
         flatListRef.current?.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;

    const contentToSend = inputText.trim();
    setInputText(''); 
    Keyboard.dismiss();

    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      conversationId: conversationId,
      type: 'text',
      content: contentToSend,
      createdAt: new Date().toISOString(),
      sender: { _id: currentUserId, userName: 'Tôi' } 
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const res = await sendMessage(conversationId, contentToSend, 'text');
      const realMessage = res.data.result || res.data;
      if (realMessage) {
        setMessages(prev => prev.map(msg => msg._id === tempId ? realMessage : msg));
      }
    } catch (error) {
      console.log("Lỗi gửi tin nhắn:", error);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item, index }: { item: any, index: number }) => {
    const msgSenderId = item.sender?._id || item.senderId; 
    const isMe = msgSenderId === currentUserId;

    const prevItem = index > 0 ? messages[index - 1] : null;
    const nextItem = index < messages.length - 1 ? messages[index + 1] : null;

    const prevSenderId = prevItem?.sender?._id || prevItem?.senderId;
    const nextSenderId = nextItem?.sender?._id || nextItem?.senderId;

    const isSameSenderAsPrev = prevItem && prevSenderId === msgSenderId;
    const isSameSenderAsNext = nextItem && nextSenderId === msgSenderId;

    const FIVE_MINUTES = 5 * 60 * 1000;
    const timeDiffPrev = prevItem ? new Date(item.createdAt).getTime() - new Date(prevItem.createdAt).getTime() : 0;
    const timeDiffNext = nextItem ? new Date(nextItem.createdAt).getTime() - new Date(item.createdAt).getTime() : 0;
    
    const isWithin5MinsPrev = timeDiffPrev <= FIVE_MINUTES;
    const isWithin5MinsNext = timeDiffNext <= FIVE_MINUTES;

    const isGroupedWithPrev = isSameSenderAsPrev && isWithin5MinsPrev;
    const isGroupedWithNext = isSameSenderAsNext && isWithin5MinsNext;

    const showAvatar = !isMe && !isGroupedWithNext; 
    const showTime = !isGroupedWithNext;            
    const showUserName = isGroup && !isMe && !isGroupedWithPrev;

    const marginBottom = isGroupedWithNext ? 2 : 12;

    const bubbleStyle = [
      styles.bubble,
      isMe ? styles.bubbleMe : styles.bubbleOther,
      isMe
        ? {
            borderTopRightRadius: isGroupedWithPrev ? 2 : 12,
            borderBottomRightRadius: isGroupedWithNext ? 2 : 0, 
          }
        : {
            borderTopLeftRadius: isGroupedWithPrev ? 2 : 12,
            borderBottomLeftRadius: isGroupedWithNext ? 2 : 0, 
          }
    ];

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther, { marginBottom }]}>
        {!isMe && (
          <View style={styles.avatarPlaceholder}>
            {showAvatar && (
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>
                  {item.sender?.userName ? item.sender.userName.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.messageContent, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
          <View style={bubbleStyle}>
            {showUserName && (
              <Text style={styles.userNameText}>{item.sender?.userName || 'Người dùng'}</Text>
            )}
            
            {/* MÀU CHỮ THAY ĐỔI ĐỘNG DỰA THEO THEME VÀ BONG BÓNG CỦA AI */}
            <Text style={[styles.messageText, { color: isMe ? COLORS.myBubbleText : COLORS.otherBubbleText }]}>
              {item.content}
            </Text>
            
            {showTime && <Text style={styles.messageTime}>{formatTime(item.createdAt)}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={COLORS.iconText} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerName} numberOfLines={1}>{chatName || 'Đang tải...'}</Text>
            <Text style={styles.headerStatus}>Trực tuyến</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="call-outline" size={24} color={COLORS.iconText} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="videocam-outline" size={26} color={COLORS.iconText} /></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Ionicons name="menu" size={28} color={COLORS.iconText} /></TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.chatArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
           <View style={{ flex: 1, justifyContent: 'center' }}>
             <ActivityIndicator size="large" color="#0091FF" />
           </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl 
                refreshing={isLoadingMore} 
                onRefresh={loadMoreMessages} 
                colors={["#0091FF"]}
              />
            }
          />
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}><Feather name="plus" size={24} color={COLORS.textLight} /></TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Tin nhắn..."
            placeholderTextColor={COLORS.textLight} // Màu placeholder động
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          {inputText.trim().length > 0 ? (
            <TouchableOpacity onPress={handleSend} style={styles.sendBtn}>
              <Ionicons name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.attachBtn}><Ionicons name="mic-outline" size={26} color={COLORS.textLight} /></TouchableOpacity>
              <TouchableOpacity style={styles.attachBtn}><Ionicons name="image-outline" size={24} color={COLORS.textLight} /></TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default MessageScreen;

// ==========================================
// 2. STYLES ĐỘNG (Sinh ra lại mỗi khi đổi chế độ Sáng/Tối)
// ==========================================
const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.headerBg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.headerBg, paddingHorizontal: 10, paddingVertical: 12, paddingTop: Platform.OS === 'android' ? 30 : 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: 10 },
  headerName: { color: COLORS.iconText, fontSize: 18, fontWeight: '600' },
  headerStatus: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { marginLeft: 16 },
  chatArea: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingVertical: 20 },
  
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  
  avatarPlaceholder: { width: 32, marginRight: 8, justifyContent: 'flex-end' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#A855F7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  
  messageContent: { flexDirection: 'column', maxWidth: '80%' },
  
  userNameText: { fontSize: 13, color: COLORS.senderName, marginBottom: 4, fontWeight: '600' },
  
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  bubbleMe: { backgroundColor: COLORS.myBubble },
  bubbleOther: { backgroundColor: COLORS.otherBubble },
  
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTime: { fontSize: 11, color: COLORS.textLight, marginTop: 4, alignSelf: 'flex-end' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: Platform.OS === 'ios' ? 25 : 10 },
  attachBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
  
  // Cập nhật ô nhập văn bản có màu nền và màu chữ linh động
  textInput: { flex: 1, backgroundColor: COLORS.background, color: COLORS.text, borderRadius: 20, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, maxHeight: 100, marginHorizontal: 8 },
  sendBtn: { backgroundColor: "#0091FF", width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }
});