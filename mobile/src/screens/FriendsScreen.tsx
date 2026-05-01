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
import { useTranslation } from "../hooks/useTranslation";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isPhoneNumber(text: string): boolean {
  const trimmed = text.trim();
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
    const { colors } = useTheme();
    const { t } = useTranslation();
    const initials = (user.userName || "U").charAt(0).toUpperCase();
    const isSending = sendingId === user._id;

    const renderButton = () => {
      switch (user.friendStatus) {
        case "friend":
          return (
            <View
              style={[
                searchStyles.btnFriend,
                { backgroundColor: colors.accent },
              ]}
            >
              <UserCheck size={14} color={colors.accentForeground} />
              <Text
                style={[
                  searchStyles.btnFriendText,
                  { color: colors.accentForeground },
                ]}
              >
                {t.friends}
              </Text>
            </View>
          );
        case "pending_sent":
          return (
            <TouchableOpacity
              style={[
                searchStyles.btnPending,
                { backgroundColor: colors.muted },
              ]}
              onPress={() => onCancelRequest(user._id, user.userName)}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.mutedForeground}
                />
              ) : (
                <Text
                  style={[
                    searchStyles.btnPendingText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t.friendsSent}
                </Text>
              )}
            </TouchableOpacity>
          );
        case "pending_received":
          return (
            <View
              style={[
                searchStyles.btnPending,
                { backgroundColor: colors.muted },
              ]}
            >
              <Text
                style={[
                  searchStyles.btnPendingText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t.friendsWantsToConnect}
              </Text>
            </View>
          );
        default:
          return (
            <TouchableOpacity
              style={[
                searchStyles.btnAdd,
                { backgroundColor: colors.primary },
                isSending && { opacity: 0.6 },
              ]}
              onPress={() => onAddFriend(user._id, user.userName)}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.primaryForeground}
                />
              ) : (
                <>
                  <UserPlus size={14} color={colors.primaryForeground} />
                  <Text
                    style={[
                      searchStyles.btnAddText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {t.friendsAdd}
                  </Text>
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
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[searchStyles.avatar, { backgroundColor: colors.secondary }]}
        >
          <Text style={searchStyles.avatarText}>{initials}</Text>
        </View>
        <View style={searchStyles.info}>
          <Text
            style={[searchStyles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {user.userName}
          </Text>
          {user.phone ? (
            <Text
              style={[searchStyles.sub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {user.phone}
            </Text>
          ) : user.bio ? (
            <Text
              style={[searchStyles.sub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
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
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
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
      setPhoneSearchResults([]);
      setPhoneSearchError("");
    }
  }, [searchText]);

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

  useEffect(() => {
    if (searchMode !== "phone" || !debouncedSearch.trim()) {
      setPhoneSearchResults([]);
      setPhoneSearchError("");
      return;
    }

    const doPhoneSearch = async () => {
      const term = debouncedSearch.trim();
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
        const exactMatchUsers = users.filter((u) => u.phone === term);
        setPhoneSearchResults(exactMatchUsers);
        if (exactMatchUsers.length === 0)
          setPhoneSearchError(t.friendsNoUserByPhone);
      } catch {
        setPhoneSearchError(t.friendsGenericError);
      } finally {
        setPhoneSearchLoading(false);
      }
    };

    doPhoneSearch();
  }, [debouncedSearch, searchMode, computeFriendStatus]);

  const filteredFriends = useMemo(() => {
    if (searchMode !== "friends" || !searchText.trim()) return [];
    const q = searchText.trim().toLowerCase();
    return friends.filter((f) =>
      (f.fullName || f.userName || "").toLowerCase().includes(q),
    );
  }, [friends, searchText, searchMode]);

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
        t.error,
        err.response?.data?.message || t.friendsInviteFailed,
      );
    } finally {
      setSendingId(null);
    }
  };

  const handleCancelFromSearch = async (userId: string, _userName: string) => {
    const req = sentRequests.find(
      (r) =>
        r.receiver_id === userId ||
        r.receiver?._id === userId ||
        r.receiver === userId,
    );
    if (!req) {
      Alert.alert(t.error, t.friendsCancelNotFound);
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
        t.error,
        err.response?.data?.message || t.friendsCancelFailed,
      );
    } finally {
      setSendingId(null);
    }
  };

  const clearSearch = () => {
    setSearchText("");
    setPhoneSearchResults([]);
    setPhoneSearchError("");
    setSearchMode("friends");
    setIsSearchFocused(false);
    Keyboard.dismiss();
  };

  const handleDeleteFriend = (friendId: string, name: string) => {
    Alert.alert(
      t.friendsDeleteTitle,
      `${t.friendsDeleteConfirmPrefix} ${name} ${t.friendsDeleteConfirmSuffix}`,
      [
        { text: t.cancel, style: "cancel" },
        {
          text: t.friendsDelete,
          style: "destructive",
          onPress: async () => {
            try {
              await friendApi.deleteFriend(friendId);
              profileStatsEvents.emit({ type: "friends_delta", delta: -1 });
              Alert.alert(
                t.success,
                `${t.friendsDeletedPrefix} ${name} ${t.friendsDeletedSuffix}`,
              );
              fetchData(true);
            } catch {
              Alert.alert(t.error, t.friendsDeleteFailed);
            }
          },
        },
      ],
    );
  };

  const handleOpenFriendProfile = (payload: {
    userId: string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    userAvatar?: string;
    userBio?: string;
  }) => {
    navigation.navigate("UserProfile", {
      userId: payload.userId,
      userName: payload.userName,
      userPhone: payload.userPhone || "",
      userEmail: payload.userEmail || "",
      userAvatar: payload.userAvatar || "",
      userBio: payload.userBio || "",
    });
  };

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
    <View style={[styles.staticMenu, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("FriendRequests")}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
          <UserPlus size={22} color={colors.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: colors.foreground }]}>
            {t.friendsRequests}
          </Text>
          {requests.length > 0 && (
            <View
              style={[styles.badge, { backgroundColor: colors.destructive }]}
            >
              <Text style={styles.badgeText}>{requests.length}</Text>
            </View>
          )}
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("SentRequest")}
      >
        <View style={[styles.iconBox, { backgroundColor: "#DCFCE7" }]}>
          <Send size={22} color="#10B981" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: colors.foreground }]}>
            {t.friendsSentRequests}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate("BlockedUsers")}
      >
        <View style={[styles.iconBox, { backgroundColor: colors.accent }]}>
          <Users size={22} color={colors.secondary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuText, { color: colors.foreground }]}>
            {t.friendsBlockedList}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  // ── Render search panel ───────────────────────────────────────────────────
  const renderSearchPanel = () => {
    if (searchMode === "phone") {
      return (
        <KeyboardAvoidingView
          style={[styles.searchPanel, { backgroundColor: colors.background }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            style={[styles.phoneBanner, { backgroundColor: colors.accent }]}
          >
            <Phone size={14} color={colors.primary} />
            <Text style={[styles.phoneBannerText, { color: colors.primary }]}>
              {t.friendsSearchByPhone}
            </Text>
          </View>

          {phoneSearchLoading && (
            <View style={styles.searchPlaceholder}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text
                style={[
                  styles.searchLoadingText,
                  { color: colors.mutedForeground },
                ]}
              >
                {t.friendsSearching}
              </Text>
            </View>
          )}

          {!phoneSearchLoading &&
            phoneSearchError !== "" &&
            searchText.trim().length >= 10 && (
              <View style={styles.searchPlaceholder}>
                <UserCircle size={44} color={colors.border} />
                <Text
                  style={[
                    styles.searchPlaceholderText,
                    { color: colors.mutedForeground },
                  ]}
                >
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
              <Text
                style={[styles.resultHeader, { color: colors.mutedForeground }]}
              >
                {phoneSearchResults.length} {t.friendsResults}
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

    return (
      <KeyboardAvoidingView
        style={[styles.searchPanel, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {!searchText.trim() && (
          <View style={styles.searchPlaceholder}>
            <Search size={40} color={colors.border} />
            <Text
              style={[
                styles.searchPlaceholderText,
                { color: colors.mutedForeground },
              ]}
            >
              {t.friendsSearchHint}
            </Text>
          </View>
        )}

        {searchText.trim() !== "" && (
          <>
            {filteredFriends.length > 0 ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.searchResultsContent}
              >
                <Text
                  style={[
                    styles.resultHeader,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {filteredFriends.length} {t.friends}
                </Text>
                {filteredFriends.map((friend) => (
                  <FriendItem
                    key={friend._id}
                    item={friend}
                    type="friend"
                    onDelete={handleDeleteFriend}
                    onViewProfile={handleOpenFriendProfile}
                  />
                ))}
              </ScrollView>
            ) : (
              <View style={styles.searchPlaceholder}>
                <UserCircle size={44} color={colors.border} />
                <Text
                  style={[
                    styles.searchPlaceholderText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  {t.friendsNoFriendNamed} "{searchText}"
                </Text>
                <Text
                  style={[styles.searchHint, { color: colors.mutedForeground }]}
                >
                  {t.friendsSearchPhoneHint}
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View
          style={[
            styles.searchBar,
            { backgroundColor: colors.input },
            isSearchFocused && {
              backgroundColor: colors.accent,
              borderColor: colors.primary,
            },
          ]}
        >
          {searchMode === "phone" ? (
            <Phone size={18} color={colors.primary} />
          ) : (
            <Search
              size={18}
              color={isSearchFocused ? colors.primary : colors.mutedForeground}
            />
          )}

          <TextInput
            ref={inputRef}
            placeholder={t.friendsSearchInputPlaceholder}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
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
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {isSearchFocused ? (
          <TouchableOpacity style={styles.cancelBtn} onPress={clearSearch}>
            <Text style={[styles.cancelText, { color: colors.primary }]}>
              {t.cancel}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.addBtn}>
            <UserPlus size={24} color={colors.foreground} />
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
              color={colors.secondary}
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
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              renderSectionHeader={({ section: { title } }) => (
                <View
                  style={[
                    styles.sectionHeader,
                    { backgroundColor: colors.background },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <FriendItem
                  item={item}
                  type="friend"
                  onDelete={handleDeleteFriend}
                  onViewProfile={handleOpenFriendProfile}
                />
              )}
              ListEmptyComponent={
                <Text
                  style={[styles.emptyText, { color: colors.mutedForeground }]}
                >
                  {t.friendsNoFriendsYet}
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
  searchPlaceholderText: { fontSize: 14, textAlign: "center" },
  searchLoadingText: { fontSize: 14, marginTop: 8 },
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
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "bold" },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 2 },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: "center",
  },
  btnAddText: { fontSize: 13, fontWeight: "600" },
  btnPending: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    alignItems: "center",
  },
  btnPendingText: { fontSize: 13, fontWeight: "600" },
  btnFriend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 80,
    justifyContent: "center",
  },
  btnFriendText: { fontSize: 13, fontWeight: "600" },
});
