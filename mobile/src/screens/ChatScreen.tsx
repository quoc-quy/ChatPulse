import React, { useState, useCallback, useMemo, useRef } from "react";
import { joinGroupByLink } from "../apis/chat.api";
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
import { useTranslation } from "../hooks/useTranslation";
import { jwtDecode } from "jwt-decode";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useChatContext } from "../contexts/ChatContext";
import { CameraView, useCameraPermissions } from "expo-camera";

import { getConversations, pinConversation } from "../apis/chat.api";
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

const ChatScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const { language, t } = useTranslation();

  // ✅ Lấy thêm drafts từ Context
  const {
    setTotalUnreadCount,
    setLocalUnread,
    getLocalUnread,
    localUnreadMap,
    drafts = {}, // Lấy object chứa các tin nhắn nháp
  } = useChatContext() as any;

  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(
    () => getStyles(COLORS, isDarkMode),
    [isDarkMode, COLORS],
  );

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups">("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [showPinMenu, setShowPinMenu] = useState(false);
  const [selectedConvForPin, setSelectedConvForPin] = useState<any>(null);

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [showQRScanner, setShowQRScanner] = useState(false);
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    const totalUnread = Object.values(localUnreadMap).reduce(
      (sum: any, count: any) => sum + (count || 0),
      0,
    );
    setTotalUnreadCount(totalUnread);
  }, [localUnreadMap, setTotalUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.initialTab === "groups") {
        setActiveTab("groups");
        navigation.setParams({ initialTab: undefined });
      }
    }, [route?.params?.initialTab, navigation]),
  );

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

  const initializedConvsRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (Object.keys(localUnreadMap).length === 0) {
      initializedConvsRef.current.clear();
    }
  }, [localUnreadMap]);

  React.useEffect(() => {
    return () => {
      initializedConvsRef.current.clear();
    };
  }, []);

  const fetchConversations = async (pageNumber = 1, isRefresh = false) => {
    try {
      if (pageNumber === 1 && !isRefresh) setLoading(true);
      const response = await getConversations(pageNumber, 20);
      const newConversations = response.data.result || [];
      setHasMore(newConversations.length >= 20);

      if (isRefresh || pageNumber === 1) {
        setConversations(newConversations);

        let resolvedUserId = currentUserId;
        if (!resolvedUserId) {
          try {
            const token = await AsyncStorage.getItem("access_token");
            if (token) {
              const decoded: any = jwtDecode(token);
              resolvedUserId = decoded.user_id || decoded._id || decoded.id;
            }
          } catch { }
        }

        const pinned = new Set<string>();
        newConversations.forEach((conv: any) => {
          if (!conv._id) return;
          if (!initializedConvsRef.current.has(conv._id)) {
            initializedConvsRef.current.add(conv._id);
            setLocalUnread(conv._id, conv.unread_count || 0);
          }
          if (resolvedUserId) {
            const myMember = (conv.members || []).find(
              (m: any) => m.userId?.toString() === resolvedUserId,
            );
            if (myMember?.isPinned) pinned.add(conv._id);
          }
        });

        if (resolvedUserId) {
          setPinnedIds(pinned);
        }
      } else {
        setConversations((prev) => [...prev, ...newConversations]);
        newConversations.forEach((conv: any) => {
          if (!conv._id) return;
          if (!initializedConvsRef.current.has(conv._id)) {
            initializedConvsRef.current.add(conv._id);
            setLocalUnread(conv._id, conv.unread_count || 0);
          }
        });
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
    } catch { }
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
    if (diffMins < 1) return t.chatJustNow;
    if (diffMins < 60) return `${diffMins}p`;
    if (Math.floor(diffMins / 60) < 24 && date.getDate() === now.getDate())
      return `${Math.floor(diffMins / 60)}g`;
    return date.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getChatDetails = (item: any) => {
    let chatName = t.chatUserDefault;
    let chatAvatarUrl = "";
    let isOnline = false;
    let targetUserId = null;

    if (item.type === "group") {
      chatName = item.name || t.chatUnnamedGroup;
      chatAvatarUrl = item.avatarUrl || "";
    } else {
      if (item.participants?.length > 0 && currentUserId) {
        const partner = item.participants.find(
          (p: any) => p._id !== currentUserId,
        );
        if (partner) {
          chatName =
            partner.displayName ||
            partner.fullName ||
            partner.userName ||
            t.chatUserDefault;
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
      (m: any) =>
        (m.userId?.toString?.() || m.user_id?.toString?.()) === currentUserId,
    );
    return myMember?.hasMuted === true;
  };

  const handleLongPressConv = (item: any) => {
    setSelectedConvForPin(item);
    setShowPinMenu(true);
  };

  const handleTogglePin = async (item: any) => {
    const isCurrentlyPinned = pinnedIds.has(item._id);
    const newIsPinned = !isCurrentlyPinned;
    setShowPinMenu(false);
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (newIsPinned) next.add(item._id);
      else next.delete(item._id);
      return next;
    });
    try {
      await pinConversation(item._id, newIsPinned);
    } catch (e) {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (newIsPinned) next.delete(item._id);
        else next.add(item._id);
        return next;
      });
      Alert.alert(t.error, t.chatActionFailed);
    }
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

  const handleOpenQRScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          t.chatNotice,
          t.chatNeedCameraPermission,
        );
        return;
      }
    }
    scannedRef.current = false;
    setShowQRScanner(true);
  };

  const handleBarcodeScanned = async ({ type, data }: { type: string; data: string; }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    setShowQRScanner(false);

    if (data.startsWith("chatpulse://group/join/")) {
      const groupId = data.split("chatpulse://group/join/")[1];

      Alert.alert(
        t.chatJoinGroup,
        t.chatQrValidJoining,
        [
          {
            text: t.chatConfirm,
            onPress: async () => {
              try {
                setLoading(true);
                const res = await joinGroupByLink(groupId);
                Alert.alert(t.success, t.chatJoinedGroupSuccess);
                fetchConversations(1, true);
              } catch (error: any) {
                Alert.alert(t.error, t.chatJoinGroupFailed);
              } finally {
                setLoading(false);
              }
            }
          },
          {
            text: t.cancel,
            style: "cancel",
            onPress: () => { scannedRef.current = false; }
          }
        ]
      );
    } else {
      Alert.alert(t.chatInvalidQrTitle, t.chatInvalidQrMessage, [
        { text: "OK", onPress: () => { scannedRef.current = false; } }
      ]);
    }
  };

  const renderItem = ({ item }: any) => {
    const { chatName, chatAvatarUrl, isOnline } = getChatDetails(item);

    // --- LOGIC XỬ LÝ NỘI DUNG TIN NHẮN CUỐI CÙNG ---
    let messageContent = t.chatNoMessagesYet;
    if (item.lastMessage) {
      if (item.lastMessage.type === "image" || item.lastMessage.type === "media" || item.lastMessage.content?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
        messageContent = "[Hình ảnh]";
      } else if (item.lastMessage.type === "video" || item.lastMessage.content?.match(/\.(mp4|mov)(\?.*)?$/i)) {
        messageContent = "[Video]";
      } else if (item.lastMessage.type === "file") {
        messageContent = "[Tệp đính kèm]";
      } else if (item.lastMessage.type === "call") {
        messageContent = "[Cuộc gọi]";
      } else if (item.lastMessage.type === "revoked") {
        messageContent = t.messageRevoked || "Tin nhắn đã thu hồi";
      } else {
        messageContent = item.lastMessage.content || t.chatNoMessagesYet;
      }
    }
    // --- KẾT THÚC LOGIC ---

    const unread = getLocalUnread(item._id);
    const isPinned = pinnedIds.has(item._id);

    // Kiểm tra xem cuộc hội thoại này có tin nhắn nháp không
    const draftText = drafts[item._id];

    return (
      <TouchableOpacity
        style={styles.chatCard}
        onPress={() => navigateToChat(item)}
        onLongPress={() => handleLongPressConv(item)}
        delayLongPress={400}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarRing, { borderColor: COLORS.primary }]}>
            {chatAvatarUrl ? (
              <Image source={{ uri: chatAvatarUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: COLORS.accent }]}>
                <Text style={styles.avatarText}>
                  {chatName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          {isOnline && !isPinned && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {chatName}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {isMutedForItem(item) && (
                <Ionicons
                  name="notifications-off-outline"
                  size={13}
                  color={COLORS.textLight}
                />
              )}
              <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
                {formatTimeZalo(item.updated_at)}
              </Text>
            </View>
          </View>

          <View style={styles.chatFooter}>

            {/* 1. BÊN TRÁI: Luôn hiển thị nội dung tin nhắn gốc (lastMessage) */}
            <Text
              style={[styles.message, unread > 0 && styles.unreadMessage]}
              numberOfLines={1}
            >
              {messageContent}
            </Text>

            {/* 2. BÊN PHẢI: Cụm chứa chữ [Chưa gửi] và Badge/Pin */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>

              {/* Hiện chữ [Chưa gửi] màu đỏ nếu có nháp */}
              {draftText && draftText.trim() !== "" && (
                <Text style={{ color: COLORS.badge, fontSize: 12, fontWeight: "600", fontStyle: "italic" }}>
                  Chưa gửi
                </Text>
              )}

              {unread > 0 ? (
                <LinearGradient
                  colors={[COLORS.primary, COLORS.accent]}
                  style={styles.badge}
                >
                  <Text style={styles.badgeText}>
                    {unread > 9 ? "9+" : unread}
                  </Text>
                </LinearGradient>
              ) : isPinned ? (
                <Ionicons name="pin-outline" size={15} color={COLORS.textLight} />
              ) : null}
            </View>

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const validConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (c.type === "group") return true;
      const partner = c.participants?.find(
        (p: any) => p._id?.toString() !== currentUserId,
      );
      if (!partner) return true;
      return !blockedUserIds.has(partner._id?.toString() || "");
    });
  }, [conversations, blockedUserIds, currentUserId]);

  const displayConversations = useMemo(() => {
    let list = validConversations;

    if (activeTab === "unread") {
      list = validConversations.filter((c) => getLocalUnread(c._id) > 0);
    }

    if (activeTab === "groups") {
      list = validConversations.filter((c) => c.type === "group");
    }

    // ✅ SORTING LOGIC MỚI: 1. Pinned -> 2. Nháp -> 3. Thời gian mới nhất
    return [...list].sort((a, b) => {
      const aPinned = pinnedIds.has(a._id) ? 1 : 0;
      const bPinned = pinnedIds.has(b._id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned; // Pinned lên đầu

      const aDraft = drafts[a._id] && drafts[a._id].trim() !== "" ? 1 : 0;
      const bDraft = drafts[b._id] && drafts[b._id].trim() !== "" ? 1 : 0;
      if (aDraft !== bDraft) return bDraft - aDraft; // Nháp lên nhì

      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateB - dateA; // Mới nhất lên ba
    });
  }, [validConversations, activeTab, pinnedIds, drafts]); // <-- Nhớ add drafts vào dependency

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return validConversations;
    return validConversations.filter((c) => {
      const { chatName } = getChatDetails(c);
      return chatName.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [validConversations, searchQuery]);

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={COLORS.primary}
        translucent={false}
      />

      <View style={styles.heroContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          style={styles.heroGradient}
        >
          <SafeAreaView style={styles.safeHeader}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>{t.chatTitle}</Text>
                <Text style={styles.subtitle}>
                  {conversations.length} {t.chatConversations}
                </Text>
              </View>
              <View style={styles.headerIcons}>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={handleOpenQRScanner}
                >
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
                <Ionicons
                  name="search"
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={{ marginLeft: 10 }}
                />
                <Text style={styles.searchPlaceholderText}>
                  {t.chatSearchPlaceholder}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
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
              {t.chatAll}
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
              {t.chatUnread}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "groups" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("groups")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "groups" && styles.tabTextActive,
              ]}
            >
              {t.groups}
            </Text>
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

      <Modal
        visible={showSearchModal}
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={[styles.root, { backgroundColor: COLORS.background }]}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <View style={styles.searchModalHeader}>
              <TouchableOpacity
                onPress={() => setShowSearchModal(false)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={26} color={COLORS.text} />
              </TouchableOpacity>

              <View style={styles.searchModalInputWrapper}>
                <Ionicons
                  name="search"
                  size={20}
                  color={COLORS.textLight}
                  style={{ marginLeft: 10 }}
                />
                <TextInput
                  style={[styles.searchModalInput, { color: COLORS.text }]}
                  placeholder={t.chatSearchPlaceholder}
                  placeholderTextColor={COLORS.textLight}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={true}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={COLORS.textLight}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SafeAreaView>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <FlatList
              data={searchResults}
              renderItem={renderItem}
              keyExtractor={(item) => item._id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={COLORS.textLight}
                    style={{ marginBottom: 10, opacity: 0.5 }}
                  />
                  <Text style={styles.emptyText}>
                    {t.chatNoSearchResults}
                  </Text>
                </View>
              }
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal
        visible={showPinMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPinMenu(false)}
      >
        <TouchableOpacity
          style={styles.pinOverlay}
          activeOpacity={1}
          onPress={() => setShowPinMenu(false)}
        >
          <View
            style={[
              styles.pinMenuBox,
              { backgroundColor: COLORS.surface, borderColor: COLORS.border },
            ]}
          >
            <TouchableOpacity
              style={styles.pinMenuItem}
              onPress={() => handleTogglePin(selectedConvForPin)}
            >
              <Ionicons
                name={
                  pinnedIds.has(selectedConvForPin?._id) ? "pin-outline" : "pin"
                }
                size={20}
                color={COLORS.accent}
              />
              <Text style={[styles.pinMenuText, { color: COLORS.text }]}>
                {pinnedIds.has(selectedConvForPin?._id)
                  ? t.chatUnpinConversation
                  : t.chatPinConversation}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showQRScanner} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.qrHeader}>
              <TouchableOpacity onPress={() => setShowQRScanner(false)}>
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
              <Text style={styles.qrTitle}>{t.chatScanQr}</Text>
              <View style={{ width: 32 }} />
            </View>

            <View style={styles.qrCameraContainer}>
              {showQRScanner && (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                  }}
                />
              )}
              <View style={styles.qrTargetOverlay}>
                <View style={styles.qrTargetBox} />
              </View>
            </View>

            <View style={styles.qrFooter}>
              <Text
                style={{
                  color: "white",
                  textAlign: "center",
                  fontSize: 15,
                  opacity: 0.8,
                }}
              >
                {t.chatScanQrHint}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

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
    title: {
      fontSize: 30,
      fontWeight: "800",
      color: "#FFFFFF",
      marginLeft: 20,
    },
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

    qrHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    qrTitle: { color: "white", fontSize: 18, fontWeight: "bold" },
    qrCameraContainer: {
      flex: 1,
      borderRadius: 24,
      overflow: "hidden",
      marginHorizontal: 15,
      marginTop: 10,
      marginBottom: 20,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#222",
    },
    qrTargetOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    qrTargetBox: {
      width: 250,
      height: 250,
      borderWidth: 2,
      borderColor: "rgba(255, 255, 255, 0.5)",
      borderRadius: 24,
      backgroundColor: "transparent",
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
    emptyContainer: { alignItems: "center", marginTop: 40 },
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
    pinBadge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: COLORS.accent,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: COLORS.surface,
    },
    pinOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },
    pinMenuBox: {
      width: "75%",
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden",
    },
    pinMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 18,
      gap: 14,
    },
    pinMenuText: {
      fontSize: 16,
      fontWeight: "600",
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
    name: { color: COLORS.text, fontSize: 16, fontWeight: "700", flex: 1 },
    time: { color: COLORS.textLight, fontSize: 12 },
    unreadTime: { color: COLORS.primary, fontWeight: "700" },
    chatFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    message: {
      color: COLORS.textLight,
      fontSize: 14,
      flex: 1,
      marginRight: 10,
    },
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