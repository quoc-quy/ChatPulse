import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  useColorScheme,
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // Đảm bảo đã cài expo-linear-gradient

import SearchComponent from "../components/ui/SearchComponent";
import { getConversations } from "../apis/chat.api";

// ==========================================
// 1. CẤU HÌNH BẢNG MÀU DYNAMIC - MÀU TÍM ĐẬM HƠN
// ==========================================
const lightColors = {
  background: "#F9FAFB", // Xám siêu nhạt cho nền
  surface: "#FFFFFF",    // Trắng cho các thẻ Card, nền Header
  text: "#111827",       // Đen cho văn bản chính
  textLight: "#6B7280",  // Xám cho văn bản phụ
  border: "#E5E7EB",     // Xám nhạt cho viền
  // Tông màu chủ đạo (Màu tím đậm hơn)
  primary: "#312E81",    // Indigo 900 (Tím đậm)
  accent: "#581C87",     // Purple 900 (Tím đậm hơn)
  success: "#10B981",    // Xanh lá cho Online status
  badge: "#EF4444",      // Đỏ cho số tin nhắn
  headerText: "#FFFFFF", // Màu chữ trên nền tím
};

const darkColors = {
  background: "#111111", // Đen sâu cho nền (OLED friendly)
  surface: "#1E1E22",    // Xám rất tối cho Card, nền Header
  text: "#FFFFFF",       // Trắng cho văn bản chính
  textLight: "#A1A1AA",  // Xám nhạt cho văn bản phụ
  border: "#2A2A30",     // Xám tối cho viền
  // Tông màu chủ đạo (Màu tím đậm hơn)
  primary: "#312E81",    // Indigo 900 (Tím đậm)
  accent: "#581C87",     // Purple 900 (Tím đậm hơn)
  success: "#10B981",    // Xanh lá cho Online status
  badge: "#EF4444",      // Đỏ cho số tin nhắn
  headerText: "#FFFFFF", // Màu chữ trên nền tím
};

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  
  // --- LẤY THEME HIỆN TẠI TỪ HỆ THỐNG ---
  const isDarkMode = useColorScheme() === "dark";
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode]);

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  const fetchConversations = async (pageNumber = 1, isRefresh = false) => {
    try {
      if (pageNumber === 1 && !isRefresh) setLoading(true);
      const response = await getConversations(pageNumber, 20);
      const newConversations = response.data.result || [];
      setHasMore(newConversations.length >= 20);

      if (isRefresh || pageNumber === 1) {
        setConversations(newConversations);
      } else {
        setConversations((prev) => [...prev, ...newConversations]);
      }
      setPage(pageNumber);
    } catch (error: any) {
      console.log("Lỗi lấy danh sách hội thoại:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserId().then(() => {
        fetchConversations(1, true);
      });
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(1, true);
  };

  const onLoadMore = () => {
    if (!loading && hasMore && !refreshing) {
      fetchConversations(page + 1);
    }
  };

  const formatTimeZalo = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins}p`;
    if (Math.floor(diffMins / 60) < 24 && date.getDate() === now.getDate())
      return `${Math.floor(diffMins / 60)}g`;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const getChatDetails = (item: any) => {
    let chatName = "Người dùng";
    let chatAvatarUrl = "";
    let isOnline = false;
    let targetUserId = null;

    if (item.type === "group") {
      chatName = item.name || "Nhóm không tên";
      chatAvatarUrl = item.avatarUrl || "";
    } else {
      if (item.participants?.length > 0 && currentUserId) {
        const partner = item.participants.find((p: any) => p._id !== currentUserId);
        if (partner) {
          chatName = partner.displayName || partner.fullName || partner.userName || "Người dùng";
          chatAvatarUrl = partner.avatar || "";
          isOnline = partner.isOnline;
          targetUserId = partner._id;
        }
      }
    }
    return { chatName, chatAvatarUrl, isOnline, targetUserId };
  };

  const renderItem = ({ item }: any) => {
    const { chatName, chatAvatarUrl, isOnline, targetUserId } = getChatDetails(item);
    let messageContent = item.lastMessage?.content || "Chưa có tin nhắn";
    const unread = item.unread_count || 0;

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() =>
          navigation.navigate("MessageScreen", {
            id: item._id,
            name: chatName,
            isGroup: item.type === "group",
            targetUserId: targetUserId,
          })
        }
      >
        <View style={styles.avatarWrapper}>
          {/* Thêm vòng Ring bao quanh avatar, sử dụng màu Primary tím đậm */}
          <View style={[styles.avatarRing, { borderColor: COLORS.primary }]}>
            {chatAvatarUrl ? (
              <Image source={{ uri: chatAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: COLORS.accent }]}>
                <Text style={styles.avatarText}>{chatName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>{chatName}</Text>
            <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
              {formatTimeZalo(item.updated_at)}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <Text style={[styles.message, unread > 0 && styles.unreadMessage]} numberOfLines={1}>
              {messageContent}
            </Text>
            {unread > 0 && (
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
              </LinearGradient>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayConversations =
    activeTab === "all"
      ? conversations
      : conversations.filter((c) => (c.unread_count || 0) > 0);

  return (
    <View style={styles.root}>
      {/* Đặt StatusBar tương ứng với Theme */}
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? darkColors.background : lightColors.background} translucent={false} />
      
      {/* Hero Header với màu tím tối đậm */}
      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          style={styles.heroGradient}
        >
          <SafeAreaView style={styles.safeHeader}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Tin nhắn</Text>
                <Text style={styles.subtitle}>{conversations.length} cuộc hội thoại</Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity style={styles.iconBtn}>
                  <Ionicons name="qr-code-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <Feather name="plus" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.searchWrapper}>
              <SearchComponent />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "unread" && styles.tabButtonActive]}
            onPress={() => setActiveTab("unread")}
          >
            <Text style={[styles.tabText, activeTab === "unread" && styles.tabTextActive]}>Chưa đọc</Text>
          </TouchableOpacity>
        </View>

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
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>
    </View>
  );
};

// ==========================================
// 2. STYLES ĐỘNG VÀ CHI TIẾT GIAO DIỆN
// ==========================================
const getStyles = (COLORS: any, isDarkMode: boolean) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    heroContainer: {
      height: Platform.OS === "ios" ? 220 : 190,
      borderBottomLeftRadius: 32,
      borderBottomRightRadius: 32,
      overflow: "hidden",
    },
    heroGradient: { flex: 1 },
    safeHeader: { flex: 1, paddingHorizontal: 20 },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 10,
      marginBottom: 15,
    },
    title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
    subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)" },
    headerIcons: { flexDirection: "row" },
    iconBtn: {
      width: 40,
      height: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12,
    },
    searchWrapper: { marginTop: 5 },
    contentContainer: { flex: 1, marginTop: -25 },
    tabsContainer: {
      flexDirection: "row",
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    tabButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginRight: 10,
      backgroundColor: isDarkMode ? "#2A2A30" : "#E5E7EB",
    },
    tabButtonActive: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: "600" },
    tabTextActive: { color: "#FFFFFF" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    chatCard: {
      flexDirection: "row",
      backgroundColor: COLORS.card,
      padding: 12,
      borderRadius: 24,
      marginBottom: 12,
      alignItems: "center",
      // Hiệu ứng đổ bóng nhẹ
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    avatarWrapper: { position: "relative" },
    avatarRing: {
      borderWidth: 2,
      borderRadius: 30,
      padding: 2,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
    onlineDot: {
      position: "absolute",
      right: 2,
      bottom: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: COLORS.success,
      borderWidth: 2,
      borderColor: COLORS.card,
    },
    chatContent: { flex: 1, marginLeft: 14 },
    chatHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    name: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
    time: { color: COLORS.textLight, fontSize: 12 },
    unreadTime: { color: COLORS.primary, fontWeight: "700" },
    chatFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    message: { color: COLORS.textLight, fontSize: 14, flex: 1, marginRight: 10 },
    unreadMessage: { color: COLORS.text, fontWeight: "600" },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 6,
    },
    badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  });

export default ChatScreen;