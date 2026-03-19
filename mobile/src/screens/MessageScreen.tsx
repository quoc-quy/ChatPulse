import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
  Modal,
  Pressable,
  Alert,
  ScrollView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from 'expo-blur';
import { markConversationAsSeen } from '../apis/chat.api';

// IMPORT USE THEME Ở ĐÂY
import { useTheme } from "../contexts/ThemeContext";

import {
  getMessages,
  sendMessage,
  reactMessage as reactMessageApi,
  recallMessage as recallMessageApi,
  deleteMessageForMe as deleteMessageForMeApi,
  summarizeChatApi,
} from "../apis/chat.api";

// ==========================================
// 1. CẤU HÌNH BẢNG MÀU ĐỒNG BỘ 100% TOÀN APP
// ==========================================
const lightColors = {
  background: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF2FF",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
  primary: "#6366F1",
  accent: "#8B5CF6",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
};

const darkColors = {
  background: "#070B1A",
  surface: "#11182D",
  surfaceSoft: "#0D1428",
  text: "#F8FAFC",
  textLight: "#9CA3AF",
  border: "#1E2946",
  primary: "#7C3AED",
  accent: "#A855F7",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
};

const REACTION_LIST = ["👍", "❤️", "🤣", "😮", "😭", "😡"];

const MessageScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);
  const lastTap = useRef(0);
  const { id } = route.params;

  // --- LẤY THEME TỪ CONTEXT (CÔNG TẮC CỦA PROFILE) ---
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode, COLORS]);

  const {
    id: conversationId,
    name: chatName,
    isGroup,
    targetUserId,
    unreadCount = 0,
  } = route.params || {};

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // Thêm state để chặn gọi API liên tục khi đang tải
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Hàm tải thêm tin nhắn cũ
  // Hàm tải thêm tin nhắn cũ (Có thêm delay 1 giây để hiện xoay xoay)
  const loadMoreMessages = async () => {
    // Nếu hết tin, hoặc đang tải, hoặc không có con trỏ cursor -> Bỏ qua
    if (!hasMore || isFetchingMore || !cursor) return;
    
    try {
      // 1. Bật cờ loading lên để RefreshControl bắt đầu xoay
      setIsFetchingMore(true);
      
      // 2. Ép ứng dụng chờ đúng 1 giây (1000ms) để người dùng thấy cái vòng xoay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 3. Gọi API lấy 20 tin nhắn tiếp theo
      const res = await getMessages(conversationId, cursor, 20);
      const rawData = res.data.result || res.data.data || [];
      
      if (rawData.length > 0) {
        setCursor(rawData[rawData.length - 1]._id);
        setMessages((prev) => [...[...rawData].reverse(), ...prev]);
      }
      
      if (rawData.length < 20) setHasMore(false);
      
    } catch (error: any) {
      console.log("Lỗi tải thêm tin nhắn:", error.message);
    } finally {
      // 4. Tắt cờ loading đi để giấu vòng xoay
      setIsFetchingMore(false);
    }
  };
  // --- STATE REACTION & MENU ---
  const [selectedMsg, setSelectedMsg] = useState<any>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  // --- STATE CHO CHỨC NĂNG AI SUMMARY ---
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState("");
  useEffect(() => {
    if (id) {
      // Bắn API báo cho Backend biết user đã xem tin nhắn này
      markConversationAsSeen(id).catch((error) => {
        console.log("Lỗi khi đánh dấu đã xem tin nhắn:", error);
      });
    }
  }, [id]);

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

  const handleSummarizeChat = async () => {
    if (unreadCount === 0) {
      Alert.alert("Thông báo", "Bạn đã đọc hết tin nhắn rồi!");
      return;
    }

    setShowAiModal(true);
    setIsAiProcessing(true);
    setAiSummaryText("");

    try {
      const messagesToSend = messages.slice(-unreadCount);
      const response = await summarizeChatApi(messagesToSend);

      setTimeout(() => {
        if (response.data?.result) {
          setAiSummaryText(response.data.result);
          setIsAiProcessing(false);
        }
      }, 1500);

    } catch (error) {
      setShowAiModal(false);
      Alert.alert("Lỗi", "AI đang bận, thử lại sau nhé!");
    }
  };

  const scrollToMessage = (messageId: string) => {
    const index = messages.findIndex((m) => m._id === messageId);
    if (index !== -1) {
      setShowAiModal(false); 
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5, 
        });
      }, 300);
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

  const renderAiText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\[xem:.*?\]|\*\*.*?\*\*)/g);

    return (
      <Text style={styles.aiText}>
        {parts.map((part, index) => {
          if (part.startsWith("[xem:") && part.endsWith("]")) {
            const msgId = part.slice(5, -1);
            return (
              <Text
                key={index}
                style={styles.aiLink}
                onPress={() => scrollToMessage(msgId)}
              >
                {" "}(Xem){" "}
              </Text>
            );
          }
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <Text key={index} style={{ fontWeight: "900", color: "#A78BFA" }}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

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
                    backgroundColor: isDarkMode ? "#1E2946" : "#E2E8F0",
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
                    isRevoked && { fontStyle: "italic", color: COLORS.textLight },
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />
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

          refreshControl={
            <RefreshControl
              refreshing={isFetchingMore}
              onRefresh={loadMoreMessages}
              tintColor={COLORS.primary}
            />
          }
          ListHeaderComponent={
            !hasMore && messages.length > 0 ? (
              <Text style={{ textAlign: "center", color: COLORS.textLight, paddingVertical: 10 }}>
                Đã tải hết lịch sử trò chuyện
              </Text>
            ) : null
          }
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

      {/* MODAL AI GIỮ NGUYÊN ĐEN HUYỀN BÍ */}
      <Modal visible={showAiModal} transparent animationType="fade">
        <View style={styles.aiOverlay}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

          <View style={styles.aiContainer}>
            <LinearGradient
              colors={["#1e1b4b", "#0f172a"]}
              style={styles.aiHeader}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="sparkles" size={20} color="#A78BFA" style={{ marginRight: 8 }} />
                <Text style={styles.aiTitle}>AI TỔNG HỢP</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAiModal(false)}>
                <Ionicons name="close-circle" size={24} color="#475569" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.aiContent} showsVerticalScrollIndicator={false}>
              {isAiProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#8B5CF6" />
                  <Text style={styles.loadingText}>Đang giải mã bối cảnh...</Text>
                </View>
              ) : (
                <Text style={styles.aiText}>
                  {renderAiText(aiSummaryText)}
                </Text>
              )}
            </ScrollView>

            {!isAiProcessing && (
              <View style={styles.aiFooter}>
                <TouchableOpacity onPress={() => setShowAiModal(false)} activeOpacity={0.8}>
                  <LinearGradient colors={["#5b21b6", "#1e1b4b"]} style={styles.aiBtn}>
                    <Text style={styles.aiBtnText}>Đã hiểu</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// ==========================================
// 2. STYLES CHI TIẾT VÀ HOÀN CHỈNH THEO THEME
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
    // --- KHỐI AI SUMMARY (Giữ màu tối sang trọng không phụ thuộc theme) ---
    aiOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.85)", 
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 25,
    },
    aiContainer: {
      width: "100%",
      backgroundColor: "#0F172A", 
      borderRadius: 30,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#1E293B", 
      shadowColor: "#8B5CF6",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 20,
    },
    aiHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 18,
      borderBottomWidth: 1,
      borderBottomColor: "#1E293B",
    },
    aiTitle: {
      color: "#F8FAFC",
      fontSize: 14,
      fontWeight: "800",
      letterSpacing: 2, 
    },
    aiText: {
      color: "#E2E8F0", 
      fontSize: 16,
      lineHeight: 28,
      textAlign: "left",
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: "center",
    },
    loadingText: {
      marginTop: 15,
      color: "#94A3B8",
      fontSize: 14,
      fontStyle: "italic",
    },
    aiBtn: {
      paddingVertical: 15,
      borderRadius: 20,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#4C1D95",
    },
    aiBtnText: {
      color: "#DDD6FE",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 1,
    },
    aiLink: {
      color: "#8B5CF6", 
      textDecorationLine: "underline",
      fontWeight: "bold",
    },
    // --- KẾT THÚC KHỐI AI ---
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
      backgroundColor: COLORS.surface, // Dùng surface để nổi lên trên nền
      borderWidth: isDarkMode ? 1 : 1,
      borderColor: COLORS.border,
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
      backgroundColor: COLORS.border,
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
    aiContent: {
      maxHeight: 350,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    aiFooter: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 10,
    },
  });

export default MessageScreen;