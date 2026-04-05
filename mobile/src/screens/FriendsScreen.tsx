import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  SectionList,
  RefreshControl,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  ChevronRight,
  Send,
  X,
  UserCircle,
  Phone,
} from "lucide-react-native";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { profileStatsEvents } from "../utils/profileStats.events";
import { createDirectConversation } from "../apis/chat.api";

const lightColors = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  mutedDark: "#64748B",
  white: "#FFFFFF",
  border: "#E2E8F0",
  success: "#22C55E",
  danger: "#EF4444",
  card: "#FFFFFF",
  searchBg: "#F1F5F9",
  searchFocusedBg: "#EEF2FF",
  sectionHeaderBg: "#F8FAFC",
};

const darkColors = {
  primary: "#818CF8",
  secondary: "#C084FC",
  background: "#070B1A",
  foreground: "#F8FAFC",
  muted: "#64748B",
  mutedDark: "#94A3B8",
  white: "#11182D",
  border: "#1E2946",
  success: "#4ADE80",
  danger: "#F87171",
  card: "#11182D",
  searchBg: "#1E2946",
  searchFocusedBg: "#1E2040",
  sectionHeaderBg: "#0D1428",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Kiểm tra input có phải số điện thoại không (toàn số, ít nhất 9 ký tự) */
function isPhoneNumber(text: string): boolean {
  const trimmed = text.trim();
  // Nếu nhập từ 1 chữ số trở lên và toàn là số, coi như đang tìm theo SĐT
  return /^[0-9+]+$/.test(trimmed) && trimmed.length > 0;
}

// ─── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Search Result Item ───────────────────────────────────────────────────────
interface SearchUser {
  _id: string;
  userName: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  friendStatus?: "friend" | "pending_sent" | "pending_received" | "none";
}

interface SearchResultItemProps {
  user: SearchUser;
  onAddFriend: (userId: string, userName: string) => void;
  onCancelRequest: (userId: string, userName: string) => void;
  sendingId: string | null;
}

const SearchResultItem = React.memo(
  ({
    user,
    onAddFriend,
    onCancelRequest,
    sendingId,
  }: SearchResultItemProps) => {
    const { isDarkMode } = useTheme();
    const COLORS = isDarkMode ? darkColors : lightColors;
    const initials = (user.userName || "U").charAt(0).toUpperCase();
    const isSending = sendingId === user._id;

    const renderButton = () => {
      switch (user.friendStatus) {
        case "friend":
          return (
            <View style={searchStyles.btnFriend}>
              <UserCheck size={14} color={COLORS.success} />
              <Text style={searchStyles.btnFriendText}>Bạn bè</Text>
            </View>
          );
        case "pending_sent":
          return (
            <TouchableOpacity
              style={searchStyles.btnPending}
              onPress={() => onCancelRequest(user._id, user.userName)}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={COLORS.mutedDark} />
              ) : (
                <Text style={searchStyles.btnPendingText}>Đã gửi</Text>
              )}
            </TouchableOpacity>
          );
        case "pending_received":
          return (
            <View style={searchStyles.btnPending}>
              <Text style={searchStyles.btnPendingText}>Muốn kết bạn</Text>
            </View>
          );
        default:
          return (
            <TouchableOpacity
              style={[searchStyles.btnAdd, isSending && { opacity: 0.6 }]}
              onPress={() => onAddFriend(user._id, user.userName)}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <UserPlus size={14} color="#FFFFFF" />
                  <Text style={searchStyles.btnAddText}>Kết bạn</Text>
                </>
              )}
            </TouchableOpacity>
          );
      }
    };

    return (
      <View
        style={[
          searchStyles.item,
          { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
        ]}
      >
        <View style={searchStyles.avatar}>
          <Text style={searchStyles.avatarText}>{initials}</Text>
        </View>
        <View style={searchStyles.info}>
          <Text
            style={[searchStyles.name, { color: COLORS.foreground }]}
            numberOfLines={1}
          >
            {user.userName}
          </Text>
          {user.phone ? (
            <Text style={searchStyles.sub} numberOfLines={1}>
              {user.phone}
            </Text>
          ) : user.bio ? (
            <Text style={searchStyles.sub} numberOfLines={1}>
              {user.bio}
            </Text>
          ) : null}
        </View>
        {renderButton()}
      </View>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen({ navigation }: any) {
  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? darkColors : lightColors;

  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /**
   * searchMode:
   *  "friends" → lọc bạn bè local theo tên (không gọi API)
   *  "phone"   → gọi API tìm người lạ bằng SĐT
   */
  const [searchMode, setSearchMode] = useState<"friends" | "phone">("friends");

  const [phoneSearchResults, setPhoneSearchResults] = useState<SearchUser[]>(
    [],
  );
  const [phoneSearchLoading, setPhoneSearchLoading] = useState(false);
  const [phoneSearchError, setPhoneSearchError] = useState("");

  const [sendingId, setSendingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchText, 400);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isPhoneNumber(searchText)) {
      setSearchMode("phone");
    } else {
      setSearchMode("friends");
      // Khi quay về mode friends, xóa kết quả tìm kiếm phone cũ
      setPhoneSearchResults([]);
      setPhoneSearchError("");
    }
  }, [searchText]);
  // ── Fetch main data ────────────────────────────────────────────────────────
  const fetchData = async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    try {
      const [friendsRes, requestsRes, sentRes] = await Promise.all([
        api.get("/friends/list"),
        api.get("/friends/requests/received"),
        api.get("/friends/requests/pending"),
      ]);
      setFriends(friendsRes.data.result || []);
      setRequests(requestsRes.data.result || []);
      setSentRequests(sentRes.data.result || []);
    } catch (error) {
      console.log("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, []),
  );

  // ── Tính friendStatus từ dữ liệu local ────────────────────────────────────
  const computeFriendStatus = useCallback(
    (userId: string): SearchUser["friendStatus"] => {
      if (friends.some((f) => (f._id || f.user?._id) === userId))
        return "friend";
      if (
        sentRequests.some(
          (r) => (r.receiver_id || r.receiver?._id || r.receiver) === userId,
        )
      )
        return "pending_sent";
      if (
        requests.some(
          (r) => (r.sender_id || r.sender?._id || r.sender) === userId,
        )
      )
        return "pending_received";
      return "none";
    },
    [friends, sentRequests, requests],
  );

  // ── Chuyển chế độ search tự động khi input thay đổi ───────────────────────
  // Tìm đến đoạn useEffect gọi API khi đang ở chế độ phone
  useEffect(() => {
    // 1. Chỉ chạy nếu ở chế độ phone và có giá trị search
    if (searchMode !== "phone" || !debouncedSearch.trim()) {
      setPhoneSearchResults([]);
      setPhoneSearchError("");
      return;
    }

    const doPhoneSearch = async () => {
      const term = debouncedSearch.trim();

      // 2. CHỈNH SỬA TẠI ĐÂY: Chỉ gọi API nếu nhập đủ số (ví dụ ít nhất 10 số)
      // Nếu chưa đủ số, chúng ta xóa kết quả cũ và không báo lỗi để người dùng nhập tiếp
      if (term.length < 10) {
        setPhoneSearchResults([]);
        setPhoneSearchError("");
        return;
      }

      setPhoneSearchLoading(true);
      setPhoneSearchError("");
      try {
        const res = await friendApi.searchUsers(term);
        const users: SearchUser[] = (res.data.result?.users || []).map(
          (u: any) => ({ ...u, friendStatus: computeFriendStatus(u._id) }),
        );

        // 3. CHỈNH SỬA TẠI ĐÂY: Lọc thủ công một lần nữa để chắc chắn
        // chỉ lấy user có số điện thoại khớp hoàn toàn (Exact Match)
        const exactMatchUsers = users.filter((u) => u.phone === term);

        setPhoneSearchResults(exactMatchUsers);

        if (exactMatchUsers.length === 0)
          setPhoneSearchError(
            "Không tìm thấy người dùng với số điện thoại này",
          );
      } catch {
        setPhoneSearchError("Có lỗi xảy ra, vui lòng thử lại");
      } finally {
        setPhoneSearchLoading(false);
      }
    };

    doPhoneSearch();
  }, [debouncedSearch, searchMode, computeFriendStatus]);

  // ── Lọc bạn bè local (chế độ "friends") ──────────────────────────────────
  const filteredFriends = useMemo(() => {
    if (searchMode !== "friends" || !searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return friends.filter((f) =>
      (f.fullName || f.userName || "").toLowerCase().includes(q),
    );
  }, [friends, searchText, searchMode]);

  // ── Gửi lời mời kết bạn ───────────────────────────────────────────────────
  const handleAddFriend = async (userId: string, _userName: string) => {
    setSendingId(userId);
    try {
      await friendApi.sendFriendRequest(userId);
      setPhoneSearchResults((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, friendStatus: "pending_sent" } : u,
        ),
      );
      const sentRes = await api.get("/friends/requests/pending");
      setSentRequests(sentRes.data.result || []);
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể gửi lời mời kết bạn",
      );
    } finally {
      setSendingId(null);
    }
  };

  // ── Hủy lời mời ───────────────────────────────────────────────────────────
  const handleCancelFromSearch = async (userId: string, _userName: string) => {
    const req = sentRequests.find(
      (r) =>
        r.receiver_id === userId ||
        r.receiver?._id === userId ||
        r.receiver === userId,
    );
    if (!req) {
      Alert.alert("Lỗi", "Không tìm thấy lời mời để hủy");
      return;
    }
    setSendingId(userId);
    try {
      await friendApi.cancelRequest(req._id || req.id);
      setPhoneSearchResults((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, friendStatus: "none" } : u,
        ),
      );
      const sentRes = await api.get("/friends/requests/pending");
      setSentRequests(sentRes.data.result || []);
    } catch (err: any) {
      Alert.alert(
        "Lỗi",
        err.response?.data?.message || "Không thể hủy lời mời",
      );
    } finally {
      setSendingId(null);
    }
  };

  // ── Clear search ──────────────────────────────────────────────────────────
  const clearSearch = () => {
    setSearchText("");
    setPhoneSearchResults([]);
    setPhoneSearchError("");
    setSearchMode("friends");
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  // ── Xóa bạn ──────────────────────────────────────────────────────────────
  const handleDeleteFriend = (friendId: string, name: string) => {
    Alert.alert(
      "Xóa bạn bè",
      `Bạn có chắc chắn muốn xóa ${name} khỏi danh sách bạn bè không?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await friendApi.deleteFriend(friendId);
              profileStatsEvents.emit({ type: "friends_delta", delta: -1 });
              Alert.alert("Thành công", `Đã xóa ${name} khỏi danh sách bạn bè`);
              fetchData(true);
            } catch {
              Alert.alert(
                "Lỗi",
                "Không thể xóa bạn lúc này. Vui lòng thử lại sau.",
              );
            }
          },
        },
      ],
    );
  };

  // ── Mở chat ───────────────────────────────────────────────────────────────
  const handleOpenChat = async (userId: string, userName: string) => {
    try {
      const res = await createDirectConversation(userId);
      const conversation = res.data.result;
      navigation.navigate("MessageScreen", {
        id: conversation._id,
        name: userName,
        isGroup: false,
        targetUserId: userId,
        unreadCount: 0,
      });
    } catch {
      Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  // ── Grouped friends A-Z ───────────────────────────────────────────────────
  const groupedFriends = useMemo(() => {
    if (isSearchFocused) return [];
    const groups: { [key: string]: any[] } = {};
    friends.forEach((friend) => {
      const name = friend.fullName || friend.userName || "U";
      const firstLetter = name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(friend);
    });
    return Object.keys(groups)
      .sort()
      .map((letter) => ({
        title: letter,
        data: groups[letter].sort((a, b) =>
          (a.fullName || a.userName).localeCompare(b.fullName || b.userName),
        ),
      }));
  }, [friends, isSearchFocused]);

  // ── Static Menu ───────────────────────────────────────────────────────────
  const StaticMenu = () => (
    <View style={[styles.staticMenu, { backgroundColor: COLORS.card }]}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("FriendRequests")}
      >
        <View style={[styles.iconBox, { backgroundColor: "#E0E7FF" }]}>
          <UserPlus size={22} color={COLORS.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: COLORS.foreground }]}>
            Lời mời kết bạn
          </Text>
          {requests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </View>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("SentRequest")}
      >
        <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
          <Send size={22} color="#10B981" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: COLORS.foreground }]}>
            Lời mời đã gửi
          </Text>
        </View>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("BlockedUsers")}
      >
        <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
          <Users size={22} color={COLORS.secondary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: COLORS.foreground }]}>
            Danh sách chặn
          </Text>
        </View>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>
    </View>
  );

  // ── Render search panel ───────────────────────────────────────────────────
  const renderSearchPanel = () => {
    // Chế độ SĐT: tìm người lạ qua API
    if (searchMode === "phone") {
      return (
        <KeyboardAvoidingView
          style={[styles.searchPanel, { backgroundColor: COLORS.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[
              styles.phoneBanner,
              { backgroundColor: COLORS.searchFocusedBg },
            ]}
          >
            <Phone size={14} color={COLORS.primary} />
            <Text style={[styles.phoneBannerText, { color: COLORS.primary }]}>
              Tìm kiếm bằng số điện thoại
            </Text>
          </View>

          {phoneSearchLoading && (
            <View style={styles.searchPlaceholder}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.searchLoadingText}>Đang tìm kiếm...</Text>
            </View>
          )}

          {!phoneSearchLoading &&
            phoneSearchError !== "" &&
            searchText.trim().length >= 10 && (
              <View style={styles.searchPlaceholder}>
                <UserCircle size={44} color={COLORS.border} />
                <Text style={styles.searchPlaceholderText}>
                  {phoneSearchError}
                </Text>
              </View>
            )}

          {!phoneSearchLoading && phoneSearchResults.length > 0 && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsContent}
            >
              <Text style={[styles.resultHeader, { color: COLORS.muted }]}>
                {phoneSearchResults.length} kết quả
              </Text>
              {phoneSearchResults.map((user) => (
                <SearchResultItem
                  key={user._id}
                  user={user}
                  onAddFriend={handleAddFriend}
                  onCancelRequest={handleCancelFromSearch}
                  sendingId={sendingId}
                />
              ))}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      );
    }

    // Chế độ tên: lọc bạn bè local
    return (
      <KeyboardAvoidingView
        style={[styles.searchPanel, { backgroundColor: COLORS.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Chưa nhập gì */}
        {!searchText.trim() && (
          <View style={styles.searchPlaceholder}>
            <Search size={40} color={COLORS.border} />
            <Text style={styles.searchPlaceholderText}>
              Nhập tên để tìm bạn bè{"\n"}hoặc số điện thoại để kết bạn mới
            </Text>
          </View>
        )}

        {/* Đang nhập tên */}
        {searchText.trim() !== "" && (
          <>
            {filteredFriends.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchResultsContent}
              >
                <Text style={[styles.resultHeader, { color: COLORS.muted }]}>
                  {filteredFriends.length} bạn bè
                </Text>
                {filteredFriends.map((friend) => (
                  <FriendItem
                    key={friend._id}
                    item={friend}
                    type="friend"
                    onDelete={handleDeleteFriend}
                    onChat={handleOpenChat}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.searchPlaceholder}>
                <UserCircle size={44} color={COLORS.border} />
                <Text style={styles.searchPlaceholderText}>
                  Không tìm thấy bạn bè tên "{searchText}"
                </Text>
                <Text style={[styles.searchHint, { color: COLORS.muted }]}>
                  Nhập số điện thoại để tìm và kết bạn mới
                </Text>
              </View>
            )}
          </>
        )}
      </KeyboardAvoidingView>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: COLORS.searchBg },
            isSearchFocused && {
              backgroundColor: COLORS.searchFocusedBg,
              borderColor: COLORS.primary,
            },
          ]}
        >
          {/* Icon thay đổi theo chế độ */}
          {searchMode === "phone" ? (
            <Phone size={18} color={COLORS.primary} />
          ) : (
            <Search
              size={18}
              color={isSearchFocused ? COLORS.primary : COLORS.muted}
            />
          )}

          <TextInput
            ref={inputRef}
            placeholder="Tìm tên bạn bè hoặc số điện thoại..."
            placeholderTextColor={COLORS.muted}
            style={[styles.searchInput, { color: COLORS.foreground }]}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            keyboardType="default"
            returnKeyType="search"
          />

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {isSearchFocused ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={clearSearch}>
            <Text style={[styles.cancelText, { color: COLORS.primary }]}>
              Hủy
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addBtn}>
            <UserPlus size={24} color={COLORS.foreground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Body */}
      {isSearchFocused ? (
        renderSearchPanel()
      ) : (
        <>
          {loading ? (
            <ActivityIndicator
              color={COLORS.secondary}
              style={{ marginTop: 20 }}
            />
          ) : (
            <SectionList
              sections={groupedFriends}
              keyExtractor={(item) => item._id}
              ListHeaderComponent={StaticMenu}
              stickySectionHeadersEnabled={true}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              renderSectionHeader={({ section: { title } }) => (
                <View
                  style={[
                    styles.sectionHeader,
                    { backgroundColor: COLORS.sectionHeaderBg },
                  ]}
                >
                  <Text style={[styles.sectionTitle, { color: COLORS.muted }]}>
                    {title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <FriendItem
                  item={item}
                  type="friend"
                  onDelete={handleDeleteFriend}
                  onChat={handleOpenChat}
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: COLORS.muted }]}>
                  Chưa có bạn bè nào
                </Text>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  addBtn: { marginLeft: 12 },
  cancelBtn: { marginLeft: 12 },
  cancelText: { fontSize: 15, fontWeight: "600" },

  staticMenu: { paddingVertical: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuTextContainer: { flex: 1, flexDirection: "row", alignItems: "center" },
  menuText: { fontSize: 16, fontWeight: "500" },
  badge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 18,
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "bold" },

  sectionHeader: { paddingHorizontal: 16, paddingVertical: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingBottom: 20 },
  emptyText: { textAlign: "center", marginTop: 40 },

  searchPanel: { flex: 1 },
  searchResultsContent: { paddingBottom: 32 },
  searchPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
    paddingHorizontal: 32,
  },
  searchPlaceholderText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  searchLoadingText: { fontSize: 14, color: "#64748B", marginTop: 8 },
  searchHint: { fontSize: 12, textAlign: "center", marginTop: 4 },
  resultHeader: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  phoneBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  phoneBannerText: { fontSize: 13, fontWeight: "600" },
});

const searchStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#A855F7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: "center",
  },
  btnAddText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  btnPending: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  btnPendingText: { color: "#64748B", fontSize: 13, fontWeight: "600" },
  btnFriend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: "center",
  },
  btnFriendText: { color: "#22C55E", fontSize: 13, fontWeight: "600" },
});
