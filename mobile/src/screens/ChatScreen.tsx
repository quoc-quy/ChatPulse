import React, { useState, useCallback, useMemo, useRef } from "react";

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
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../contexts/ThemeContext";
import { jwtDecode } from "jwt-decode";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useChatContext } from "../contexts/ChatContext";

// --- THÊM IMPORT CAMERA TỪ EXPO ---
import { CameraView, useCameraPermissions } from "expo-camera";

import { getConversations } from "../apis/chat.api";
import { friendApi } from "../apis/friends.api";

// ==========================================
// 1. BẢNG MÀU ĐỒNG BỘ 100%
// ==========================================
const lightColors = {
  background: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF2FF",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
  primary: "#6366F1",
  accent: "#711cc1",
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
  primary: "#1c0249",
  accent: "#711cc1",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
};

const ChatScreen = () => {
  const navigation = useNavigation<any>();
  const { setTotalUnreadCount } = useChatContext();

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
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // --- STATE TÌM KIẾM ---
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // --- STATE CAMERA (QUÉT QR) ---
  const [showQRScanner, setShowQRScanner] = useState(false);
  const scannedRef = useRef(false); // <--- DÙNG USEREF THAY VÌ USESTATE
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    const totalUnread = conversations.reduce(
      (sum, chat) => sum + (chat.unread_count || 0),
      0,
    );
    setTotalUnreadCount(totalUnread);
  }, [conversations, setTotalUnreadCount]);

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
      console.log("Lỗi lấy danh sách:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchBlockedUsers = async () => {
    try {
      const res = await friendApi.getBlockedUsers();
      const ids = (res.data?.result || []).map((u: any) =>
        (u._id || "").toString(),
      );
      setBlockedUserIds(new Set(ids));
    } catch {
      // silent fail
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserId().then(() => {
        fetchConversations(1, true);
        fetchBlockedUsers();
      });
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(1, true);
  };

  const onLoadMore = () => {
    if (!loading && hasMore && !refreshing && searchQuery === "") {
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
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });
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

  const isMutedForItem = (item: any): boolean => {
    if (!currentUserId) return false;
    const myMember = (item.members || []).find(
      (m: any) => (m.userId?.toString?.() || m.user_id?.toString?.()) === currentUserId,
    );
    return myMember?.hasMuted === true;
  };

  const navigateToChat = (item: any) => {
    const { chatName, targetUserId } = getChatDetails(item);

    if (showSearchModal) {
      setShowSearchModal(false);
      setSearchQuery("");
    }

    navigation.navigate("MessageScreen", {
      id: item._id,
      name: chatName,
      isGroup: item.type === "group",
      targetUserId: targetUserId,
      unreadCount: item.unread_count || 0,
      isMuted: isMutedForItem(item),
    });
  };

  // --- LOGIC MỞ CAMERA QUÉT QR ---
  const handleOpenQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Thông báo", "Bạn cần cấp quyền truy cập Camera để quét mã QR.");
        return;
      }
    }
    scannedRef.current = false; // <--- MỞ KHÓA TRƯỚC KHI QUÉT
    setShowQRScanner(true);
  };

  // --- XỬ LÝ KHI QUÉT ĐƯỢC MÃ ---
  // --- XỬ LÝ KHI QUÉT ĐƯỢC MÃ ---
  const handleBarcodeScanned = ({ type, data }: { type: string, data: string }) => {
    if (scannedRef.current) return; // <--- NẾU ĐANG KHÓA THÌ DỪNG NGAY
    scannedRef.current = true;      // <--- KHÓA LẠI NGAY LẬP TỨC (ĐỒNG BỘ)

    setShowQRScanner(false);
    Alert.alert("Kết quả quét QR", `Nội dung: ${data}`);
  };
  const renderItem = ({ item }: any) => {
    const { chatName, chatAvatarUrl, isOnline } = getChatDetails(item);
    let messageContent = item.lastMessage?.content || "Chưa có tin nhắn";
    const unread = item.unread_count || 0;

    return (
      <TouchableOpacity style={styles.chatCard} onPress={() => navigateToChat(item)}>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {isMutedForItem(item) && (
                <Ionicons name="notifications-off-outline" size={13} color={COLORS.textLight} />
              )}
              <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
                {formatTimeZalo(item.updated_at)}
              </Text>
            </View>
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

  const validConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (c.type === "group") return true;
      const partner = c.participants?.find((p: any) => p._id?.toString() !== currentUserId);
      if (!partner) return true;
      return !blockedUserIds.has(partner._id?.toString() || "");
    });
  }, [conversations, blockedUserIds, currentUserId]);

  const displayConversations =
    activeTab === "all" ? validConversations : validConversations.filter((c) => (c.unread_count || 0) > 0);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return validConversations;
    return validConversations.filter((c) => {
      const { chatName } = getChatDetails(c);
      return chatName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [validConversations, searchQuery]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={COLORS.primary} translucent={false} />

      <View style={styles.heroContainer}>
        <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.heroGradient}>
          <SafeAreaView style={styles.safeHeader}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Tin nhắn</Text>
                <Text style={styles.subtitle}>{conversations.length} cuộc hội thoại</Text>
              </View>
              <View style={styles.headerIcons}>
                {/* NÚT MỞ MÀN HÌNH QUÉT QR CỦA BẠN ĐÂY */}
                <TouchableOpacity style={styles.iconBtn} onPress={handleOpenQRScanner}>
                  <Ionicons name="qr-code-outline" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconBtn}>
                  <Feather name="plus" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.searchWrapper}>
              <TouchableOpacity
                style={styles.searchBarFake}
                activeOpacity={0.8}
                onPress={() => setShowSearchModal(true)}
              >
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 10 }} />
                <Text style={styles.searchPlaceholderText}>Tìm kiếm bạn bè, nhóm...</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.tabsContainer}>
          <TouchableOpacity style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]} onPress={() => setActiveTab("all")}>
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === "unread" && styles.tabButtonActive]} onPress={() => setActiveTab("unread")}>
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
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có cuộc hội thoại nào</Text>
              </View>
            }
          />
        )}
      </View>

      {/* ========================================== */}
      {/* MODAL MÀN HÌNH TÌM KIẾM */}
      {/* ========================================== */}
      <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
        <View style={[styles.root, { backgroundColor: COLORS.background }]}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <View style={styles.searchModalHeader}>
              <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={26} color={COLORS.text} />
              </TouchableOpacity>

              <View style={styles.searchModalInputWrapper}>
                <Ionicons name="search" size={20} color={COLORS.textLight} style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.searchModalInput, { color: COLORS.text }]}
                  placeholder="Tìm kiếm bạn bè, nhóm..."
                  placeholderTextColor={COLORS.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 8 }}>
                    <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color={COLORS.textLight} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <Text style={styles.emptyText}>Không tìm thấy kết quả phù hợp</Text>
                </View>
              }
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* MODAL CAMERA QUÉT QR */}
      {/* ========================================== */}
      <Modal visible={showQRScanner} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#000000' }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.qrHeader}>
              <TouchableOpacity onPress={() => setShowQRScanner(false)}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
              <Text style={styles.qrTitle}>Quét mã QR</Text>
              <View style={{ width: 32 }} />
            </View>

            <View style={styles.qrCameraContainer}>
              {showQRScanner && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  // Không cần check điều kiện ở đây nữa, cứ truyền thẳng hàm vào
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                />
              )}
              {/* Khung ngắm quét QR mờ ảo */}
              <View style={styles.qrTargetOverlay}>
                <View style={styles.qrTargetBox} />
              </View>
            </View>

            <View style={styles.qrFooter}>
              <Text style={{ color: "white", textAlign: "center", fontSize: 15, opacity: 0.8 }}>
                Hướng camera về phía mã QR để quét
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

// ==========================================
// 2. STYLES CHI TIẾT
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

    // --- STYLES THANH TÌM KIẾM ---
    searchWrapper: { marginTop: 10, paddingHorizontal: 20 },
    searchBarFake: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      height: 42,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
    },
    searchPlaceholderText: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 15,
      marginLeft: 8,
    },

    // --- STYLES MODAL TÌM KIẾM ---
    searchModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 10,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      top: 0,
    },
    backBtn: { paddingRight: 15 },
    searchModalInputWrapper: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDarkMode ? COLORS.border : "#F1F5F9",
      borderRadius: 20,
      height: 40,
    },
    searchModalInput: {
      flex: 1,
      fontSize: 15,
      marginLeft: 8,
      paddingVertical: 0,
    },

    // --- STYLES MODAL QUÉT QR ---
    qrHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    qrTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    qrCameraContainer: {
      flex: 1,
      borderRadius: 24,
      overflow: 'hidden',
      marginHorizontal: 15,
      marginTop: 10,
      marginBottom: 20,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#222'
    },
    qrTargetOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qrTargetBox: {
      width: 250,
      height: 250,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 24,
      backgroundColor: 'transparent'
    },
    qrFooter: {
      paddingBottom: 40,
    },

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
      backgroundColor: COLORS.border,
    },
    tabButtonActive: { backgroundColor: COLORS.primary },
    tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: "600" },
    tabTextActive: { color: "#FFFFFF" },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 5 },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: COLORS.textLight, fontSize: 15 },
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
    avatarRing: { borderWidth: 2, borderRadius: 30, padding: 2 },
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