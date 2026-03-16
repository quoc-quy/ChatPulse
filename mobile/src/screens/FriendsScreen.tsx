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
} from "lucide-react-native";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";
import { useFocusEffect } from "@react-navigation/native";

const COLORS = {
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
};

// ─── Debounce hook ───────────────────────────────────────────────────────────
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
  // friendStatus được tính ở frontend dựa trên danh sách bạn bè & pending requests
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
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <UserPlus size={14} color={COLORS.white} />
                  <Text style={searchStyles.btnAddText}>Kết bạn</Text>
                </>
              )}
            </TouchableOpacity>
          );
      }
    };

    return (
      <View style={searchStyles.item}>
        {/* Avatar */}
        <View style={searchStyles.avatar}>
          <Text style={searchStyles.avatarText}>{initials}</Text>
        </View>

        {/* Info */}
        <View style={searchStyles.info}>
          <Text style={searchStyles.name} numberOfLines={1}>
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

        {/* Action Button */}
        {renderButton()}
      </View>
    );
  },
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FriendsScreen({ navigation }: any) {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Search states
  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchText, 400);
  const inputRef = useRef<TextInput>(null);

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

  // ── Search logic ───────────────────────────────────────────────────────────
  // Tính friendStatus dựa trên dữ liệu local đã fetch
  const computeFriendStatus = useCallback(
    (userId: string): SearchUser["friendStatus"] => {
      const isFriend = friends.some((f) => (f._id || f.user?._id) === userId);
      if (isFriend) return "friend";

      const hasSent = sentRequests.some(
        (r) => (r.receiver_id || r.receiver?._id || r.receiver) === userId,
      );
      if (hasSent) return "pending_sent";

      const hasReceived = requests.some(
        (r) => (r.sender_id || r.sender?._id || r.sender) === userId,
      );
      if (hasReceived) return "pending_received";

      return "none";
    },
    [friends, sentRequests, requests],
  );

  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const doSearch = async () => {
      setSearchLoading(true);
      setSearchError("");
      try {
        const res = await friendApi.searchUsers(debouncedSearch.trim());
        const users: SearchUser[] = (res.data.result?.users || []).map(
          (u: any) => ({
            ...u,
            friendStatus: computeFriendStatus(u._id),
          }),
        );
        setSearchResults(users);
        if (users.length === 0) setSearchError("Không tìm thấy người dùng");
      } catch (err) {
        setSearchError("Có lỗi xảy ra, vui lòng thử lại");
      } finally {
        setSearchLoading(false);
      }
    };

    doSearch();
  }, [debouncedSearch, computeFriendStatus]);

  // ── Add / Cancel friend from search ───────────────────────────────────────
  const handleAddFriend = async (userId: string, userName: string) => {
    setSendingId(userId);
    try {
      await friendApi.sendFriendRequest(userId);
      // Cập nhật status ngay lập tức trong kết quả tìm kiếm
      setSearchResults((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, friendStatus: "pending_sent" } : u,
        ),
      );
      // Reload sent requests để đồng bộ
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

  const handleCancelFromSearch = async (userId: string, userName: string) => {
    // Tìm requestId từ sentRequests
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
      setSearchResults((prev) =>
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

  // ── Clear search ───────────────────────────────────────────────────────────
  const clearSearch = () => {
    setSearchText("");
    setSearchResults([]);
    setSearchError("");
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  // ── Delete friend ──────────────────────────────────────────────────────────
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
              Alert.alert("Thành công", `Đã xóa ${name} khỏi danh sách bạn bè`);
              fetchData(true);
            } catch (error: any) {
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

  // ── Grouped friends (A-Z) ──────────────────────────────────────────────────
  const groupedFriends = useMemo(() => {
    // Khi đang search, không cần groupedFriends
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

  // ── Static Menu ────────────────────────────────────────────────────────────
  const StaticMenu = () => (
    <View style={styles.staticMenu}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("FriendRequests")}
      >
        <View style={[styles.iconBox, { backgroundColor: "#E0E7FF" }]}>
          <UserPlus size={22} color={COLORS.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuText}>Lời mời kết bạn</Text>
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
          <Text style={styles.menuText}>Lời mời đã gửi</Text>
        </View>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.menuItem}>
        <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
          <Users size={22} color={COLORS.secondary} />
        </View>
        <Text style={styles.menuText}>Danh sách chặn</Text>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* Header — luôn hiển thị, không bao giờ bị che */}
      <View style={styles.header}>
        <View
          style={[styles.searchBar, isSearchFocused && styles.searchBarFocused]}
        >
          <Search
            size={18}
            color={isSearchFocused ? COLORS.primary : COLORS.muted}
          />
          <TextInput
            ref={inputRef}
            placeholder="Tìm kiếm bạn bè..."
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            returnKeyType="search"
          />
          {/* Nút X clear — chỉ xóa text, không thoát search */}
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Hủy — thoát hẳn search mode */}
        {isSearchFocused ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={clearSearch}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addBtn}>
            <UserPlus size={24} color={COLORS.foreground} />
          </TouchableOpacity>
        )}
      </View>

      {/*
        Dùng flex layout: header cố định trên cùng,
        phần body bên dưới switch giữa search panel và friend list.
        KHÔNG dùng absolute để tránh che header.
      */}

      {/* ── Search Panel ── */}
      {isSearchFocused ? (
        <KeyboardAvoidingView
          style={styles.searchPanel}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          {/* Chưa nhập gì */}
          {!searchText.trim() && (
            <View style={styles.searchPlaceholder}>
              <Search size={40} color={COLORS.border} />
              <Text style={styles.searchPlaceholderText}>
                Nhập tên hoặc số điện thoại để tìm kiếm
              </Text>
            </View>
          )}

          {/* Đang tìm kiếm */}
          {searchText.trim() !== "" && searchLoading && (
            <View style={styles.searchPlaceholder}>
              <ActivityIndicator color={COLORS.primary} size="large" />
              <Text style={styles.searchLoadingText}>Đang tìm kiếm...</Text>
            </View>
          )}

          {/* Không tìm thấy */}
          {searchText.trim() !== "" && !searchLoading && searchError !== "" && (
            <View style={styles.searchPlaceholder}>
              <UserCircle size={44} color={COLORS.border} />
              <Text style={styles.searchPlaceholderText}>{searchError}</Text>
            </View>
          )}

          {/* Kết quả */}
          {!searchLoading && searchResults.length > 0 && (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.searchResultsContent}
            >
              <Text style={styles.resultHeader}>
                {searchResults.length} kết quả
              </Text>
              {searchResults.map((user) => (
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
      ) : (
        /* ── Friend List Panel ── */
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
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{title}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <FriendItem
                  item={item}
                  type="friend"
                  onDelete={handleDeleteFriend}
                />
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Chưa có bạn bè nào</Text>
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
  container: { flex: 1, backgroundColor: COLORS.white },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  searchBarFocused: {
    borderColor: COLORS.primary,
    backgroundColor: "#EEF2FF",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.foreground,
  },
  addBtn: { marginLeft: 12 },
  cancelBtn: { marginLeft: 12 },
  cancelText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Static menu
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
  menuText: { fontSize: 16, fontWeight: "500", color: COLORS.foreground },
  badge: {
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 18,
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: "bold" },

  // Section list
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  listContent: { paddingBottom: 20 },
  emptyText: { textAlign: "center", color: COLORS.muted, marginTop: 40 },

  // Search panel (flex, nằm dưới header)
  searchPanel: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  searchResultsContent: {
    paddingBottom: 32,
  },
  searchPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  searchPlaceholderText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  searchLoadingText: {
    fontSize: 14,
    color: COLORS.mutedDark,
    marginTop: 8,
  },
  resultHeader: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

// Search result item styles
const searchStyles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  info: {
    flex: 1,
    marginLeft: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  sub: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  // Buttons
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: "center",
  },
  btnAddText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  btnPending: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  btnPendingText: {
    color: COLORS.mutedDark,
    fontSize: 13,
    fontWeight: "600",
  },
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
  btnFriendText: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: "600",
  },
});
