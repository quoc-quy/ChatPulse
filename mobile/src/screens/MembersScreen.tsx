import React, { useMemo, useState } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { kickMember, promoteAdmin } from "../apis/chat.api";

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

  const [searchText, setSearchText] = useState("");
  const [memberList, setMemberList] = useState<any[]>(members);

  // Filter theo search
  const filtered = useMemo(() => {
    const getName = (m: any) =>
      (m.fullName || m.userName || m.username || "").toLowerCase();
    const sorted = [...memberList].sort((a, b) => {
      const aIsAdmin =
        a.role === "admin" || (a._id || a.userId || "").toString() === adminId;
      const bIsAdmin =
        b.role === "admin" || (b._id || b.userId || "").toString() === adminId;
      // Admin luôn lên đầu
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      // Còn lại sắp xếp A-Z theo tên
      return getName(a).localeCompare(getName(b), "vi");
    });

    if (!searchText.trim()) return sorted;
    const q = searchText.toLowerCase();
    return sorted.filter((m) => {
      const name = getName(m);
      const phone = (m.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [memberList, searchText, adminId]);

  const currentUserIsAdmin = adminId === currentUserId;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleLongPress = (member: any) => {
    if (!currentUserIsAdmin) return;
    const memberId = (member._id || member.userId || "").toString();
    if (memberId === currentUserId) return;

    const name = member.fullName || member.userName || "Thành viên";
    const role = member.role;

    const options: any[] = [];
    if (role !== "admin") {
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
            setMemberList((prev) =>
              prev.filter(
                (m) => (m._id || m.userId || "").toString() !== memberId,
              ),
            );
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
            // Cập nhật role local
            setMemberList((prev) =>
              prev.map((m) =>
                (m._id || m.userId || "").toString() === memberId
                  ? { ...m, role: "admin" }
                  : m,
              ),
            );
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
    const isAdmin = item.role === "admin" || memberId === adminId;
    const name =
      item.fullName || item.userName || item.username || "Thành viên";
    const sub = isAdmin ? "Trưởng nhóm" : "";

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
          {sub ? (
            <Text
              style={[styles.sub, { color: COLORS.mutedForeground }]}
              numberOfLines={1}
            >
              {sub}
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
      <FlatList
        data={filtered}
        keyExtractor={(item, index) =>
          (item._id || item.userId || index).toString()
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={COLORS.border} />
            <Text style={[styles.emptyText, { color: COLORS.mutedForeground }]}>
              Không tìm thấy thành viên
            </Text>
          </View>
        }
      />
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
