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
  useColorScheme, // Thêm hook để nhận diện Theme hệ thống
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import { Feather, Ionicons } from "@expo/vector-icons";

import SearchComponent from "../components/ui/SearchComponent";
import { getConversations } from "../apis/chat.api";

// ==========================================
// 1. CẤU HÌNH BẢNG MÀU ĐỘNG (LIGHT/DARK)
// ==========================================
const lightColors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  text: "#000000",
  textLight: "#8E8E93",
  border: "#E5E5EA",
  tabActiveBg: "#F2F2F7",
  primary: "#0091FF",
  secondary: "#A855F7",
  success: "#34C759",
  badge: "#FF3B30",
  headerText: "#000000",
};

const darkColors = {
  background: "#000000", // Nền đen OLED
  surface: "#1C1C1E", // Bề mặt xám đen
  text: "#FFFFFF",
  textLight: "#A1A1AA",
  border: "#2C2C2E",
  tabActiveBg: "#2C2C2E",
  primary: "#0091FF",
  secondary: "#A855F7",
  success: "#34C759",
  badge: "#FF3B30",
  headerText: "#FFFFFF",
};

const ChatScreen = () => {
  const navigation = useNavigation<any>();

  // --- LẤY THEME HIỆN TẠI ---
  const isDarkMode = useColorScheme() === "dark";
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS), [isDarkMode]);

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
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24 && date.getDate() === now.getDate())
      return `${diffHours} giờ`;
    if (diffDays === 1) return "Hôm qua";
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getChatDetails = (item: any) => {
    let chatName = "Người dùng";
    let chatAvatarUrl = "";
    let isOnline = false;
    let targetUserId = null; // Thêm biến này

    if (item.type === "group") {
      chatName = item.name || "Nhóm không tên";
      chatAvatarUrl = item.avatarUrl || "";
    } else {
      if (item.participants?.length > 0 && currentUserId) {
        const partner = item.participants.find(
          (p: any) => p._id !== currentUserId,
        );
        if (partner) {
          chatName = partner.fullName || partner.userName || "Người dùng";
          chatAvatarUrl = partner.avatar || "";
          isOnline = partner.isOnline;
          targetUserId = partner._id;
        }
      }
    }
    return { chatName, chatAvatarUrl, isOnline, targetUserId };
  };

  const renderItem = ({ item }: any) => {
    const { chatName, chatAvatarUrl, isOnline, targetUserId } =
      getChatDetails(item);
    let messageContent = item.lastMessage?.content || "Chưa có tin nhắn";

    if (item.type === "group" && item.lastMessage?.sender_id) {
      if (item.lastMessage.sender_id === currentUserId) {
        messageContent = `Bạn: ${messageContent}`;
      } else {
        const sender = item.participants?.find(
          (p: any) => p._id === item.lastMessage.sender_id,
        );
        if (sender) {
          const shortName = sender.userName
            ? sender.userName.split(" ").pop()
            : "Ai đó";
          messageContent = `${shortName}: ${messageContent}`;
        }
      }
    }

    const time = formatTimeZalo(item.updated_at);
    const unread = item.unread_count || 0;
    const avatarLetter = chatName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate("MessageScreen", {
            id: item._id,
            name: chatName,
            isGroup: item.type === "group",
            targetUserId: targetUserId, // Truyền ID sang MessageScreen
          })
        }
      >
        <View style={styles.avatarContainer}>
          {chatAvatarUrl ? (
            <Image source={{ uri: chatAvatarUrl }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                item.type === "group" && { backgroundColor: COLORS.secondary },
              ]}
            >
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
          )}
          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
              {time}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <Text
              style={[styles.message, unread > 0 && styles.unreadMessage]}
              numberOfLines={1}
            >
              {messageContent}
            </Text>
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 5 ? "N" : unread}
                </Text>
              </View>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tin nhắn</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons
              name="qr-code-outline"
              size={24}
              color={COLORS.headerText}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="plus" size={26} color={COLORS.headerText} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchWrapper}>
        <SearchComponent />
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "all" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("all")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.tabTextActive,
            ]}
          >
            Tất cả
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "unread" && styles.tabButtonActive,
          ]}
          onPress={() => setActiveTab("unread")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "unread" && styles.tabTextActive,
            ]}
          >
            Chưa đọc
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {loading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={displayConversations}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
              />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

// ==========================================
// 2. STYLES ĐỘNG TÙY BIẾN THEO THEME
// ==========================================
const getStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: COLORS.surface,
    },
    title: { fontSize: 24, fontWeight: "700", color: COLORS.headerText },
    headerIcons: { flexDirection: "row", alignItems: "center" },
    iconBtn: { marginLeft: 20 },
    searchWrapper: { paddingBottom: 10, backgroundColor: COLORS.surface },
    tabsContainer: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    tabButton: {
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginRight: 10,
    },
    tabButtonActive: { backgroundColor: COLORS.tabActiveBg },
    tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: "500" },
    tabTextActive: { color: COLORS.primary, fontWeight: "600" },
    listContainer: { flex: 1 },
    chatItem: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    avatarContainer: { position: "relative", marginRight: 14 },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: COLORS.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "bold" },
    onlineDot: {
      position: "absolute",
      right: 0,
      bottom: 2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: COLORS.success,
      borderWidth: 2,
      borderColor: COLORS.surface,
    },
    chatContent: { flex: 1 },
    chatHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    name: { color: COLORS.text, fontSize: 16, fontWeight: "600", flex: 1 },
    time: { color: COLORS.textLight, fontSize: 12 },
    unreadTime: { color: COLORS.primary, fontWeight: "600" },
    chatFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    message: {
      color: COLORS.textLight,
      fontSize: 14,
      flex: 1,
      marginRight: 12,
    },
    unreadMessage: { color: COLORS.text, fontWeight: "600" },
    badge: {
      backgroundColor: COLORS.badge,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 5,
    },
    badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  });

export default ChatScreen;
