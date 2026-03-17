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
  StatusBar,
  Platform,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import { jwtDecode } from "jwt-decode";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; 

import SearchComponent from "../components/ui/SearchComponent";
import { getConversations } from "../apis/chat.api";

// ==========================================
// 1. BẢNG MÀU ĐỒNG BỘ 100% VỚI PROFILE SCREEN
// ==========================================
const lightColors = {
  background: "#F5F7FB", // Khớp với lightTheme background
  surface: "#FFFFFF",    // Khớp với lightTheme card
  surfaceSoft: "#EEF2FF",// Khớp với lightTheme cardSoft
  text: "#0F172A",       // Khớp với lightTheme textPrimary
  textLight: "#64748B",  // Khớp với lightTheme textSecondary
  border: "#E2E8F0",     // Khớp với lightTheme border
  primary: "#6366F1",    // Khớp với lightTheme accent
  accent: "#711cc1",     // Khớp với lightTheme accentAlt
  success: "#10B981",    
  badge: "#EF4444",      // Khớp với danger
  headerText: "#FFFFFF", 
};

const darkColors = {
  background: "#070B1A", // Khớp với darkTheme background
  surface: "#11182D",    // Khớp với darkTheme card
  surfaceSoft: "#0D1428",// Khớp với darkTheme cardSoft
  text: "#F8FAFC",       // Khớp với darkTheme textPrimary
  textLight: "#9CA3AF",  // Khớp với darkTheme textSecondary
  border: "#1E2946",     // Khớp với darkTheme border
  primary: "#1c0249",    // Khớp với darkTheme accent
  accent: "#711cc1",     // Khớp với darkTheme accentAlt
  success: "#10B981",    
  badge: "#EF4444",      // Khớp với danger
  headerText: "#FFFFFF", 
};

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  
  // --- LẤY THEME HIỆN TẠI TỪ HỆ THỐNG ---
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS, isDarkMode), [isDarkMode, COLORS]);

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
            unreadCount: item.unread_count || 0,
          })
        }
      >
        <View style={styles.avatarWrapper}>
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
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={COLORS.primary} translucent={false} />
      
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
    title: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginLeft: 20 },
    subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginLeft: 20 },
    headerIcons: { flexDirection: "row", right: 20 },
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
      bottom: -7,
      // Nền tab ăn theo viền/cardSoft để hòa quyện với theme Profile
      backgroundColor: isDarkMode ? COLORS.border : COLORS.border,
    },
    tabButtonActive: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: "600" },
    tabTextActive: { color: "#FFFFFF" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 5 },
    chatCard: {
      flexDirection: "row",
      backgroundColor: COLORS.surface, 
      padding: 12,
      borderRadius: 24,
      marginBottom: 12,
      alignItems: "center",
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
      borderColor: COLORS.surface, 
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