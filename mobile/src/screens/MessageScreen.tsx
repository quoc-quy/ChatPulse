import React, { useState, useRef, useEffect, useMemo } from "react";
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
  useColorScheme,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { LinearGradient } from "expo-linear-gradient";

import {
  getMessages,
  sendMessage,
  reactMessage as reactMessageApi,
  recallMessage as recallMessageApi,
  deleteMessageForMe as deleteMessageForMeApi,
  summarizeChatApi,
  askChatPulseAIApi, // <-- Nhớ khai báo hàm này trong chat.api.ts
} from "../apis/chat.api";

// ==========================================
// 1. CẤU HÌNH BẢNG MÀU DYNAMIC (GIỐNG 100% CHATSCREEN)
// ==========================================
const lightColors = {
  background: "#F9FAFB",
  surface: "#FFFFFF",
  text: "#111827",
  textLight: "#6B7280",
  border: "#E5E7EB",
  primary: "#312E81",
  accent: "#581C87",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
};

const darkColors = {
  background: "#111111",
  surface: "#1E1E22",
  text: "#FFFFFF",
  textLight: "#A1A1AA",
  border: "#2A2A30",
  primary: "#312E81",
  accent: "#581C87",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
};

const REACTION_LIST = ["👍", "❤️", "🤣", "😮", "😭", "😡"];

const MessageScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const aiFlatListRef = useRef<FlatList>(null); // Ref cho danh sách chat với AI
  const lastTap = useRef(0);

  const isDarkMode = useColorScheme() === "dark";
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode, COLORS]);

  const {
    id: conversationId,
    name: chatName,
    isGroup,
    targetUserId,
  } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // --- STATE REACTION & MENU ---
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // --- STATE CHO CHỨC NĂNG AI CHAT TƯƠNG TÁC ---
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMessages, setAiMessages] = useState<any[]>([]); // Lưu các đoạn chat với AI
  const [aiInputText, setAiInputText] = useState(""); // Ô nhập liệu để hỏi AI
  const [isAiReplying, setIsAiReplying] = useState(false); // Trạng thái AI đang suy nghĩ

  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        const decoded: any = jwtDecode(token);
        setCurrentUserId(decoded.user_id || decoded._id || decoded.id);
      }
    } catch (error) {
      console.log("Lỗi token:", error);
    }
  };

  const fetchInitialMessages = async () => {
    if (!conversationId) return;
    try {
      setLoading(true);
      const res = await getMessages(conversationId, null, 20);
      const rawData = res.data.result || res.data.data || [];
      const visibleData = rawData;
      if (visibleData.length > 0)
        setCursor(visibleData[visibleData.length - 1]._id);
      if (visibleData.length < 20) setHasMore(false);
      setMessages([...visibleData].reverse());
    } catch (error: any) {
      console.log("Lỗi tải tin nhắn:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUserId().then(() => fetchInitialMessages());
  }, [conversationId]);

  // --- LOGIC GỌI AI TÓM TẮT BAN ĐẦU ---
  const handleSummarizeChat = async () => {
    if (messages.length === 0) {
      Alert.alert("Chưa có dữ liệu", "Đoạn chat hiện tại chưa có tin nhắn nào để AI tổng hợp.");
      return;
    }

    setIsSummarizing(true);
    try {
      const messagesToSend = [...messages].reverse().slice(-20);
      const response = await summarizeChatApi(messagesToSend);

      if (response.data && response.data.result) {
        // Mở modal và đưa lời tóm tắt vào làm tin nhắn đầu tiên của AI
        setAiMessages([
          { id: Date.now().toString(), role: "ai", text: response.data.result }
        ]);
        setShowAiModal(true);
      }
    } catch (error) {
      console.log("CHI TIẾT LỖI AI:", error);
      Alert.alert("Lỗi", "Không thể gọi AI lúc này. Vui lòng thử lại sau.");
    } finally {
      setIsSummarizing(false);
    }
  };

  // --- LOGIC HỎI ĐÁP TIẾP THEO VỚI AI ---
  const handleSendAi = async () => {
    if (aiInputText.trim().length === 0) return;
    
    const userQuestion = aiInputText.trim();
    setAiInputText("");
    
    // Thêm câu hỏi của mình vào màn hình AI
    const newUserMsg = { id: Date.now().toString(), role: "user", text: userQuestion };
    setAiMessages((prev) => [...prev, newUserMsg]);
    setIsAiReplying(true);

    try {
      const chatContext = [...messages].reverse().slice(-20); 
      // Gọi API hỏi đáp (Bạn cần làm API này ở Backend)
      const response = await askChatPulseAIApi(chatContext, userQuestion);
      
      if (response.data && response.data.result) {
        const newAiMsg = { id: (Date.now() + 1).toString(), role: "ai", text: response.data.result };
        setAiMessages((prev) => [...prev, newAiMsg]);
      }
    } catch (error) {
      console.log("Lỗi hỏi AI:", error);
      const errorMsg = { id: (Date.now() + 1).toString(), role: "ai", text: "Xin lỗi, AI đang gặp sự cố kết nối." };
      setAiMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiReplying(false);
      setTimeout(() => {
        aiFlatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleToggleReact = async (message: any, emoji: string) => {
    if (!message || message.type === "revoked") return;
    try {
      await reactMessageApi(message._id, emoji);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === message._id) {
            const isExist = msg.reactions?.some((r: any) => {
              const reactionUserId = r?.userId || r?.user_id;
              return (
                reactionUserId?.toString?.() === currentUserId?.toString?.() &&
                r?.emoji === emoji
              );
            });
            return {
              ...msg,
              reactions: isExist ? [] : [{ emoji, user_id: currentUserId }],
            };
          }
          return msg;
        })
      );
    } catch (error) {
      console.log("Lỗi thả react :", error);
    }
    setShowMenu(false);
  };

  const handleRevoke = async () => {
    if (!selectedMsg) return;
    try {
      await recallMessageApi(selectedMsg._id);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === selectedMsg._id
            ? { ...msg, type: "revoked", content: "", reactions: [] }
            : msg
        )
      );
    } catch (error) {
      console.log("Lỗi thu hồi:", error);
    }
    setShowMenu(false);
  };

  const handleDeleteForMe = async () => {
    if (!selectedMsg) return;
    try {
      await deleteMessageForMeApi(selectedMsg._id);
      setMessages((prev) => prev.filter((msg) => msg._id !== selectedMsg._id));
    } catch (error) {
      console.log("Lỗi xóa phía tôi :", error);
    }
    setShowMenu(false);
  };

  const handleDoubleTap = (message: any) => {
    if (message.type === "revoked") return;
    const now = Date.now();
    if (now - lastTap.current < 300) handleToggleReact(message, "❤️");
    else lastTap.current = now;
  };

  const handleLongPress = (event: any, message: any) => {
    if (message.type === "revoked") return;
    const { pageY } = event.nativeEvent;
    setMenuPos({ x: 0, y: Math.max(100, pageY - 130) });
    setSelectedMsg(message);
    setShowMenu(true);
  };

  const handleSend = async () => {
    if (inputText.trim().length === 0) return;
    const contentToSend = inputText.trim();
    setInputText("");
    const tempId = Date.now().toString();
    const tempMessage = {
      _id: tempId,
      conversationId,
      type: "text",
      content: contentToSend,
      createdAt: new Date().toISOString(),
      sender: { _id: currentUserId, userName: "Tôi" },
    };
    setMessages((prev) => [...prev, tempMessage]);
    try {
      const res = await sendMessage(conversationId, contentToSend, "text");
      const realMessage = res.data.result || res.data;
      if (realMessage)
        setMessages((prev) =>
          prev.map((msg) => (msg._id === tempId ? realMessage : msg))
        );
    } catch (error) {
      console.log(error);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMessageDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hôm nay";
    if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";

    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // --- RENDER TIN NHẮN BÌNH THƯỜNG ---
  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = (item.sender?._id || item.senderId) === currentUserId;
    const isRevoked = item.type === "revoked";
    const hasReactions = item.reactions && item.reactions.length > 0;

    const prevItem = index > 0 ? messages[index - 1] : null;
    const nextItem = index < messages.length - 1 ? messages[index + 1] : null;

    const currentDate = new Date(item.createdAt).toDateString();
    const prevDate = prevItem ? new Date(prevItem.createdAt).toDateString() : null;
    const showDateDivider = currentDate !== prevDate;

    const isSameSenderAsNext =
      nextItem &&
      (nextItem.sender?._id || nextItem.senderId) ===
      (item.sender?._id || item.senderId);

    let isCloseInTime = false;
    if (nextItem) {
      const diff = new Date(nextItem.createdAt).getTime() - new Date(item.createdAt).getTime();
      isCloseInTime = diff < 60000;
    }

    const showTime = !isRevoked && !(isSameSenderAsNext && isCloseInTime);
    const showAvatar = !isMe && !isSameSenderAsNext;

    return (
      <View>
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateDividerText}>
              {formatMessageDate(item.createdAt)}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.messageWrapper,
            isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
          ]}
        >
          {!isMe && (
            <View style={styles.avatarPlaceholder}>
              {showAvatar && (
                <View style={styles.avatarSmall}>
                  <Text style={styles.avatarText}>
                    {item.sender?.userName?.charAt(0).toUpperCase() || "U"}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View
            style={[
              styles.messageContent,
              isMe ? { alignItems: "flex-end" } : { alignItems: "flex-start" },
            ]}
          >
            <TouchableOpacity
              onPress={() => handleDoubleTap(item)}
              onLongPress={(e) => handleLongPress(e, item)}
              activeOpacity={0.9}
            >
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleMe : styles.bubbleOther,
                  isRevoked && {
                    backgroundColor: isDarkMode ? "#222" : "#EEE",
                    opacity: 0.6,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color: isMe ? COLORS.headerText : COLORS.text,
                    },
                    isRevoked && { fontStyle: "italic" },
                  ]}
                >
                  {isRevoked ? "Tin nhắn đã được thu hồi" : item.content}
                </Text>

                {showTime && (
                  <Text style={[styles.messageTime, isMe && { color: "rgba(255,255,255,0.7)" }]}>
                    {formatTime(item.createdAt)}
                  </Text>
                )}

                {!isRevoked && (
                  <View style={styles.reactionContainer}>
                    {hasReactions ? (
                      <TouchableOpacity
                        style={styles.miniReact}
                        onPress={() =>
                          handleToggleReact(item, item.reactions[0].emoji)
                        }
                      >
                        <Text style={{ fontSize: 11 }}>
                          {item.reactions[0].emoji}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.defaultLike}
                        onPress={() => handleToggleReact(item, "👍")}
                      >
                        <Ionicons
                          name="thumbs-up-outline"
                          size={12}
                          color={COLORS.textLight}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // --- RENDER BONG BÓNG CHAT TRONG MODAL AI ---
  const renderAiMessage = ({ item }: { item: any }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.aiMsgWrapper, isUser ? styles.aiMsgUserWrapper : styles.aiMsgBotWrapper]}>
        {!isUser && (
          <View style={styles.aiBotIcon}>
            <Ionicons name="sparkles" size={16} color="#FFD700" />
          </View>
        )}
        <View style={[styles.aiBubble, isUser ? styles.aiBubbleUser : styles.aiBubbleBot]}>
          <Text style={[styles.aiMsgText, { color: isUser ? "#FFF" : COLORS.text }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color="white" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerName}>{chatName || "Chat"}</Text>
            <Text style={styles.headerStatus}>Trực tuyến</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {/* NÚT AI */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={handleSummarizeChat}
            disabled={isSummarizing}
          >
            {isSummarizing ? (
              <ActivityIndicator size="small" color="#FFD700" />
            ) : (
              <Ionicons name="sparkles" size={24} color="#FFD700" />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="call-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="videocam-outline" size={26} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate("ConversationDetail", {
                id: conversationId,
                name: chatName,
                isGroup: isGroup,
              })
            }
          >
            <Ionicons name="menu" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* KHU VỰC CHAT CHÍNH */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
        />
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachBtn}>
            <Feather name="plus" size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <TextInput
            style={styles.textInput}
            placeholder="Tin nhắn..."
            placeholderTextColor={COLORS.textLight}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity onPress={handleSend}>
            <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="white" style={{ marginLeft: 3 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* --- MENU MODAL (THU HỒI, XOÁ) --- */}
      <Modal visible={showMenu} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuBox, { top: menuPos.y }]}>
            <View style={styles.emojiRow}>
              {REACTION_LIST.map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => handleToggleReact(selectedMsg, e)}
                  style={{ padding: 10 }}
                >
                  <Text style={{ fontSize: 30 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionRow}>
              {selectedMsg?.sender?._id === currentUserId && (
                <TouchableOpacity style={styles.menuItem} onPress={handleRevoke}>
                  <Ionicons name="refresh-outline" size={20} color={COLORS.badge} />
                  <Text style={{ color: COLORS.badge, marginLeft: 12, fontSize: 16 }}>Thu hồi</Text>
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

      {/* --- MODAL AI TƯƠNG TÁC XỊN XÒ --- */}
      <Modal visible={showAiModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.aiOverlay} 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.aiContainer}>
            {/* Header của Modal AI */}
            <LinearGradient colors={["#6D28D9", "#312E81"]} style={styles.aiHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="sparkles" size={24} color="#FFD700" style={{ marginRight: 8 }} />
                <Text style={styles.aiTitle}>Hỏi đáp cùng AI</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Danh sách trò chuyện với AI */}
            <FlatList
              ref={aiFlatListRef}
              data={aiMessages}
              keyExtractor={(item) => item.id}
              renderItem={renderAiMessage}
              contentContainerStyle={styles.aiChatContent}
              showsVerticalScrollIndicator={false}
            />

            {/* Hiệu ứng Loading khi AI đang nghĩ */}
            {isAiReplying && (
              <View style={styles.aiLoadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.textLight, fontSize: 13 }}>AI đang suy nghĩ...</Text>
              </View>
            )}

            {/* Khung nhập liệu hỏi AI */}
            <View style={styles.aiInputArea}>
              <TextInput
                style={styles.aiInput}
                placeholder="Hỏi AI thêm về đoạn chat..."
                placeholderTextColor={COLORS.textLight}
                value={aiInputText}
                onChangeText={setAiInputText}
                onSubmitEditing={handleSendAi}
              />
              <TouchableOpacity 
                onPress={handleSendAi} 
                disabled={isAiReplying || !aiInputText.trim()}
              >
                <LinearGradient 
                  colors={aiInputText.trim() ? [COLORS.primary, COLORS.accent] : ["#9CA3AF", "#9CA3AF"]} 
                  style={styles.aiSendBtn}
                >
                  <Ionicons name="arrow-up" size={20} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

// ==========================================
// 2. STYLES CHI TIẾT
// ==========================================
const getStyles = (COLORS: any, isDarkMode: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      paddingVertical: 12,
      paddingTop: Platform.OS === "android" ? 40 : 10,
    },
    headerLeft: { flexDirection: "row", alignItems: "center" },
    backBtn: { marginRight: 10 },
    headerName: { color: COLORS.headerText, fontSize: 18, fontWeight: "600" },
    headerStatus: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
    headerRight: { flexDirection: "row", alignItems: "center" },
    iconBtn: { marginLeft: 16 },
    chatArea: { flex: 1, backgroundColor: COLORS.background },
    listContent: { paddingHorizontal: 16, paddingVertical: 20 },
    messageWrapper: {
      flexDirection: "row",
      alignItems: "flex-end",
      marginBottom: 10,
    },
    messageWrapperMe: { justifyContent: "flex-end" },
    messageWrapperOther: { justifyContent: "flex-start" },
    avatarPlaceholder: { width: 35, marginRight: 8 },
    avatarSmall: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: COLORS.accent,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { color: "#FFFFFF", fontSize: 14, fontWeight: "bold" },
    messageContent: { maxWidth: "75%" },
    bubble: {
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 15,
      borderRadius: 18,
      position: "relative",
      minWidth: 60,
      marginBottom: 5,
    },
    bubbleMe: {
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 2,
    },
    bubbleOther: {
      backgroundColor: COLORS.surface,
      borderBottomLeftRadius: 2,
    },
    messageText: { fontSize: 16, lineHeight: 22, paddingRight: 5 },
    messageTime: {
      fontSize: 11,
      color: COLORS.textLight,
      marginTop: 4,
      alignSelf: "flex-end",
    },
    dateDivider: {
      alignItems: "center",
      marginVertical: 15,
    },
    dateDividerText: {
      backgroundColor: isDarkMode ? "#2A2A30" : "#E5E7EB",
      color: COLORS.textLight,
      fontSize: 12,
      fontWeight: "600",
      paddingHorizontal: 14,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: "hidden",
    },
    inputContainer: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: COLORS.surface,
      alignItems: "center",
      borderTopWidth: 1,
      borderColor: COLORS.border,
    },
    attachBtn: { padding: 8 },
    textInput: {
      flex: 1,
      backgroundColor: COLORS.background,
      color: COLORS.text,
      borderRadius: 20,
      paddingHorizontal: 16,
      height: 40,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 8,
    },
    reactionContainer: {
      position: "absolute",
      bottom: -8,
      right: -8,
      flexDirection: "row",
      zIndex: 2,
    },
    miniReact: {
      width: 24,
      height: 24,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
    },
    defaultLike: {
      width: 24,
      height: 24,
      backgroundColor: COLORS.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: "center",
      alignItems: "center",
      opacity: 0.75,
    },
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    menuBox: {
      position: "absolute",
      alignSelf: "center",
      backgroundColor: COLORS.surface,
      width: "85%",
      borderRadius: 25,
      padding: 10,
      elevation: 10,
      borderWidth: isDarkMode ? 1 : 0,
      borderColor: COLORS.border,
    },
    emojiRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: 15,
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.border,
    },
    actionRow: { paddingVertical: 5 },
    menuItem: { flexDirection: "row", alignItems: "center", padding: 15 },

    // ==========================================
    // STYLES CHO MODAL AI CHAT TƯƠNG TÁC
    // ==========================================
    aiOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end", // Ép modal nằm dưới cùng màn hình
    },
    aiContainer: {
      height: "85%", // Kích thước bằng 85% chiều cao màn hình
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: "hidden",
      elevation: 20,
    },
    aiHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    aiTitle: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "700",
    },
    aiChatContent: {
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    aiMsgWrapper: {
      flexDirection: "row",
      marginBottom: 16,
      alignItems: "flex-end",
    },
    aiMsgUserWrapper: {
      justifyContent: "flex-end",
    },
    aiMsgBotWrapper: {
      justifyContent: "flex-start",
      paddingRight: 40,
    },
    aiBotIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: "rgba(109, 40, 217, 0.1)",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    aiBubble: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 18,
      maxWidth: "85%",
    },
    aiBubbleUser: {
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 4,
    },
    aiBubbleBot: {
      backgroundColor: isDarkMode ? "#2A2A30" : "#F3F4F6",
      borderBottomLeftRadius: 4,
    },
    aiMsgText: {
      fontSize: 15,
      lineHeight: 24,
    },
    aiLoadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 15,
    },
    aiInputArea: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    aiInput: {
      flex: 1,
      backgroundColor: COLORS.background,
      color: COLORS.text,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      fontSize: 15,
      maxHeight: 100,
    },
    aiSendBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 10,
      elevation: 2,
    },
  });

export default MessageScreen;