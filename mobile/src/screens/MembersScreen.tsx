import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
  useColorScheme,
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

// ── Colors ────────────────────────────────────────────────────────────────────
const lightColors = {
  background: "hsl(240, 30%, 98%)",
  foreground: "hsl(240, 10%, 15%)",
  card: "hsl(240, 30%, 100%)",
  primary: "hsl(230, 85%, 60%)",
  secondary: "hsl(270, 75%, 65%)",
  muted: "hsl(240, 15%, 90%)",
  mutedForeground: "hsl(240, 10%, 40%)",
  destructive: "hsl(0, 84%, 60%)",
  border: "hsl(240, 15%, 85%)",
  success: "#34C759",
  adminBg: "#EEF2FF",
  adminText: "hsl(230, 85%, 60%)",
  white: "#FFFFFF",
  searchBg: "hsl(240, 15%, 94%)",
};

const darkColors = {
  background: "hsl(240, 25%, 7%)",
  foreground: "hsl(240, 20%, 98%)",
  card: "hsl(240, 25%, 10%)",
  primary: "hsl(230, 85%, 65%)",
  secondary: "hsl(270, 75%, 60%)",
  muted: "hsl(240, 20%, 18%)",
  mutedForeground: "hsl(240, 10%, 65%)",
  destructive: "hsl(0, 62%, 55%)",
  border: "hsl(240, 20%, 18%)",
  success: "#34C759",
  adminBg: "hsl(230, 40%, 20%)",
  adminText: "hsl(230, 85%, 65%)",
  white: "#FFFFFF",
  searchBg: "hsl(240, 20%, 15%)",
};

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

  const isDarkMode = useColorScheme() === "dark";
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [memberList, setMemberList] = useState<any[]>(members);
  const [adminIdState, setAdminIdState] = useState<string>(adminId || "");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");

  // Fetch danh sách thành viên mới nhất từ API
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
        // fallback: giữ nguyên data cũ nếu fetch lỗi
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [conversationId],
  );

  // Fetch khi mount
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onRefresh = () => fetchMembers(true);

  // Sort + Filter: nhóm trưởng luôn đầu, còn lại A-Z
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

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleLongPress = (member: any) => {
    if (!currentUserIsAdmin) return;
    const memberId = (member._id || member.userId || "").toString();
    if (memberId === currentUserId) return;

    const name = member.fullName || member.userName || "Thành viên";
    // ✅ Dùng adminIdState — không cho kick/promote admin hiện tại
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
            fetchMembers(); // ✅ Refetch từ API
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
            fetchMembers(); // ✅ Refetch từ API
          } catch {
            Alert.alert("Lỗi", "Không thể thăng cấp.");
          }
        },
      },
    ]);
  };

  // ── Render Item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const memberId = (item._id || item.userId || "").toString();
    const isMe = memberId === currentUserId;
    // ✅ Chỉ dùng adminIdState làm source of truth — tránh 2 admin
    const isAdmin = memberId === adminIdState;
    const name =
      item.fullName || item.userName || item.username || "Thành viên";
    const roleText = isAdmin ? "Trưởng nhóm" : "Thành viên";

    return (
      <TouchableOpacity
        style={[styles.item, { borderBottomColor: COLORS.border }]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <Avatar
          name={name}
          size={50}
          bgColor={isAdmin ? COLORS.primary : COLORS.secondary}
        />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[styles.name, { color: COLORS.foreground }]}
              numberOfLines={1}
            >
              {name}
              {isMe ? " (Bạn)" : ""}
            </Text>
            {isAdmin && (
              <View
                style={[styles.adminBadge, { backgroundColor: COLORS.adminBg }]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={10}
                  color={COLORS.adminText}
                />
                <Text style={[styles.adminText, { color: COLORS.adminText }]}>
                  Admin
                </Text>
              </View>
            )}
          </View>
          {roleText ? (
            <Text
              style={[styles.sub, { color: COLORS.mutedForeground }]}
              numberOfLines={1}
            >
              {roleText}
            </Text>
          ) : null}
        </View>

        {/* Nút thêm bạn (nếu không phải bản thân) */}
        {!isMe && (
          <TouchableOpacity
            style={styles.addBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="person-add-outline"
              size={20}
              color={COLORS.mutedForeground}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.foreground }]}>
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
            color={COLORS.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: COLORS.searchBg }]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={COLORS.mutedForeground}
          />
          <TextInput
            placeholder="Tìm thành viên..."
            placeholderTextColor={COLORS.mutedForeground}
            style={[styles.searchInput, { color: COLORS.foreground }]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color={COLORS.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count */}
      <View style={[styles.countRow, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.countText, { color: COLORS.primary }]}>
          Thành viên ({filtered.length})
        </Text>
        {currentUserIsAdmin && (
          <Text style={[styles.hintText, { color: COLORS.mutedForeground }]}>
            Giữ để quản lý
          </Text>
        )}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={COLORS.primary}
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
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text
                style={[styles.emptyText, { color: COLORS.mutedForeground }]}
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
  addBtn: { padding: 4 },

  listContent: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
