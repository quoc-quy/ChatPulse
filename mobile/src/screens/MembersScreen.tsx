import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import {
  kickMember,
  promoteAdmin,
  getConversationDetail,
} from "../apis/chat.api";
import { friendApi } from "../apis/friends.api";
import { useTheme } from "../contexts/ThemeContext";

// ── Types ─────────────────────────────────────────────────────────────────────
type FriendStatus = "friend" | "pending" | "none";
type FriendStatusMap = Record<string, FriendStatus>;
type PendingRequestIdMap = Record<string, string>;

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  size = 48,
  bgColor,
}: {
  name: string;
  size?: number;
  bgColor: string;
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#FFF", fontSize: size * 0.38, fontWeight: "bold" }}>
      {(name || "?").charAt(0).toUpperCase()}
    </Text>
  </View>
);

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MembersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const {
    conversationId,
    members = [],
    adminId,
    currentUserId,
  } = route.params || {};

  const { colors } = useTheme();

  const [memberList, setMemberList] = useState<any[]>(members);
  const [adminIdState, setAdminIdState] = useState<string>(adminId || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [friendStatusMap, setFriendStatusMap] = useState<FriendStatusMap>({});
  const [pendingRequestIdMap, setPendingRequestIdMap] =
    useState<PendingRequestIdMap>({});
  const [loadingFriendIds, setLoadingFriendIds] = useState<Set<string>>(
    new Set(),
  );

  // ── Fetch trạng thái bạn bè ────────────────────────────────────────────────
  const fetchFriendData = useCallback(async () => {
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        friendApi.getFriends(),
        friendApi.getPendingRequests(),
      ]);

      const newStatusMap: FriendStatusMap = {};
      const newPendingMap: PendingRequestIdMap = {};

      const friends: any[] = friendsRes.data?.result || friendsRes.data || [];
      friends.forEach((f: any) => {
        const fId = (f._id || f.userId || f.friend_id || "").toString();
        if (fId) newStatusMap[fId] = "friend";
      });

      const pending: any[] = pendingRes.data?.result || pendingRes.data || [];
      pending.forEach((req: any) => {
        const senderId = (req.sender_id || req.from || "").toString();
        const receiverId = (req.receiver_id || req.to || "").toString();
        const reqId = (req._id || req.id || "").toString();

        if (senderId === currentUserId && receiverId) {
          if (!newStatusMap[receiverId]) {
            newStatusMap[receiverId] = "pending";
            newPendingMap[receiverId] = reqId;
          }
        }
      });

      setFriendStatusMap(newStatusMap);
      setPendingRequestIdMap(newPendingMap);
    } catch {
      // Silent fail
    }
  }, [currentUserId]);

  // ── Fetch members ──────────────────────────────────────────────────────────
  const fetchMembers = useCallback(
    async (isRefreshing = false) => {
      if (!conversationId) return;
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getConversationDetail(conversationId);
        const conv = res.data.result;
        const infos: any[] = conv?.participants_info || [];
        const membersMeta: any[] = conv?.members || [];
        const newAdminId = conv?.admin_id?.toString?.() || "";
        setAdminIdState(newAdminId);
        setMemberList(
          infos.map((p: any) => {
            const pid = (p._id || "").toString();
            const meta = membersMeta.find(
              (m: any) =>
                (m.userId?.toString?.() || m._id?.toString?.()) === pid,
            );
            return {
              ...p,
              role: meta?.role || (pid === newAdminId ? "admin" : "member"),
            };
          }),
        );
      } catch {
        // fallback giữ data cũ
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [conversationId],
  );

  useEffect(() => {
    fetchMembers();
    fetchFriendData();
  }, [fetchMembers, fetchFriendData]);

  const onRefresh = async () => {
    await Promise.all([fetchMembers(true), fetchFriendData()]);
  };

  // ── Sort + Filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const getName = (m: any) =>
      (m.fullName || m.userName || m.username || "").toLowerCase();

    const sorted = [...memberList].sort((a, b) => {
      const aIsAdmin = (a._id || a.userId || "").toString() === adminIdState;
      const bIsAdmin = (b._id || b.userId || "").toString() === adminIdState;
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;
      return getName(a).localeCompare(getName(b), "vi");
    });

    if (!searchText.trim()) return sorted;
    const q = searchText.toLowerCase();
    return sorted.filter((m) => {
      const name = getName(m);
      const phone = (m.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [memberList, searchText, adminIdState]);

  const currentUserIsAdmin = adminIdState === currentUserId;

  // ── Admin Actions ──────────────────────────────────────────────────────────
  const handleLongPress = (member: any) => {
    if (!currentUserIsAdmin) return;
    const memberId = (member._id || member.userId || "").toString();
    if (memberId === currentUserId) return;

    const name = member.fullName || member.userName || "Thành viên";
    const isTargetAdmin = memberId === adminIdState;

    const options: any[] = [];
    if (!isTargetAdmin) {
      options.push({
        text: "👑 Thăng lên Admin",
        onPress: () => handlePromote(memberId),
      });
      options.push({
        text: "🗑 Xóa khỏi nhóm",
        style: "destructive",
        onPress: () => handleKick(memberId, name),
      });
    }

    if (options.length > 0) {
      Alert.alert(name, "Chọn hành động", [
        ...options,
        { text: "Hủy", style: "cancel" },
      ]);
    }
  };

  const handleKick = (memberId: string, memberName: string) => {
    Alert.alert("Xóa thành viên", `Xóa ${memberName} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await kickMember(conversationId, memberId);
            fetchMembers();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa thành viên.");
          }
        },
      },
    ]);
  };

  const handlePromote = (memberId: string) => {
    Alert.alert("Thăng Admin", "Thăng thành viên này lên Admin?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thăng cấp",
        onPress: async () => {
          try {
            await promoteAdmin(conversationId, memberId);
            fetchMembers();
          } catch {
            Alert.alert("Lỗi", "Không thể thăng cấp.");
          }
        },
      },
    ]);
  };

  // ── Friend Actions ─────────────────────────────────────────────────────────
  const handleFriendButton = useCallback(
    async (memberId: string, memberName: string) => {
      const status = friendStatusMap[memberId] || "none";
      if (loadingFriendIds.has(memberId)) return;

      if (status === "none") {
        Alert.alert("Kết bạn", `Gửi lời mời kết bạn đến ${memberName}?`, [
          { text: "Hủy", style: "cancel" },
          {
            text: "Gửi lời mời",
            onPress: async () => {
              setFriendStatusMap((prev) => ({
                ...prev,
                [memberId]: "pending",
              }));
              setLoadingFriendIds((prev) => new Set(prev).add(memberId));
              try {
                const res = await friendApi.sendFriendRequest(memberId);
                const requestId = (
                  res.data?.result?._id ||
                  res.data?._id ||
                  ""
                ).toString();
                if (requestId) {
                  setPendingRequestIdMap((prev) => ({
                    ...prev,
                    [memberId]: requestId,
                  }));
                }
              } catch {
                setFriendStatusMap((prev) => ({ ...prev, [memberId]: "none" }));
                Alert.alert("Lỗi", "Không thể gửi lời mời kết bạn.");
              } finally {
                setLoadingFriendIds((prev) => {
                  const next = new Set(prev);
                  next.delete(memberId);
                  return next;
                });
              }
            },
          },
        ]);
      } else if (status === "pending") {
        const requestId = pendingRequestIdMap[memberId];
        Alert.alert(
          "Hủy lời mời",
          `Hủy lời mời kết bạn đã gửi đến ${memberName}?`,
          [
            { text: "Không", style: "cancel" },
            {
              text: "Hủy lời mời",
              style: "destructive",
              onPress: async () => {
                setFriendStatusMap((prev) => ({ ...prev, [memberId]: "none" }));
                setLoadingFriendIds((prev) => new Set(prev).add(memberId));
                try {
                  if (requestId) await friendApi.cancelRequest(requestId);
                  setPendingRequestIdMap((prev) => {
                    const next = { ...prev };
                    delete next[memberId];
                    return next;
                  });
                } catch {
                  setFriendStatusMap((prev) => ({
                    ...prev,
                    [memberId]: "pending",
                  }));
                  Alert.alert("Lỗi", "Không thể hủy lời mời.");
                } finally {
                  setLoadingFriendIds((prev) => {
                    const next = new Set(prev);
                    next.delete(memberId);
                    return next;
                  });
                }
              },
            },
          ],
        );
      }
    },
    [friendStatusMap, pendingRequestIdMap, loadingFriendIds],
  );

  // ── Render Item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const memberId = (item._id || item.userId || "").toString();
    const isMe = memberId === currentUserId;
    const isAdmin = memberId === adminIdState;
    const name =
      item.fullName || item.userName || item.username || "Thành viên";
    const roleText = isAdmin ? "Trưởng nhóm" : "Thành viên";

    const friendStatus: FriendStatus = friendStatusMap[memberId] || "none";
    const isFriend = friendStatus === "friend";
    const isPending = friendStatus === "pending";
    const isFriendLoading = loadingFriendIds.has(memberId);

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: colors.border }]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <Avatar
          name={name}
          size={50}
          bgColor={isAdmin ? colors.primary : colors.secondary}
        />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {name}
              {isMe ? " (Bạn)" : ""}
            </Text>
            {isAdmin && (
              <View
                style={[styles.adminBadge, { backgroundColor: colors.accent }]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={colors.primary}
                />
                <Text style={[styles.adminText, { color: colors.primary }]}>
                  Admin
                </Text>
              </View>
            )}
          </View>
          {roleText ? (
            <Text
              style={[styles.sub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {roleText}
            </Text>
          ) : null}
        </View>

        {!isMe && !isFriend && (
          <TouchableOpacity
            style={[styles.addBtn, isPending && { opacity: 0.75 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => handleFriendButton(memberId, name)}
            disabled={isFriendLoading}
          >
            {isFriendLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons
                name={isPending ? "time-outline" : "person-add-outline"}
                size={20}
                color={isPending ? colors.primary : colors.mutedForeground}
              />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Thành viên
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("AddMemberScreen", { conversationId })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="person-add-outline"
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.input }]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colors.mutedForeground}
          />
          <TextInput
            placeholder="Tìm thành viên..."
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count */}
      <View style={[styles.countRow, { backgroundColor: colors.background }]}>
        <Text style={[styles.countText, { color: colors.primary }]}>
          Thành viên ({filtered.length})
        </Text>
        {currentUserIsAdmin && (
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Giữ để quản lý
          </Text>
        )}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          size="large"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) =>
            (item._id || item.userId || index).toString()
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Không tìm thấy thành viên
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: { fontSize: 13, fontWeight: "700" },
  hintText: { fontSize: 12 },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  info: { flex: 1, marginLeft: 14 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 2 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminText: { fontSize: 11, fontWeight: "600" },
  addBtn: { padding: 4, minWidth: 28, alignItems: "center" },

  listContent: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
