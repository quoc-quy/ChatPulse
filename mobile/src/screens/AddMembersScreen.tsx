import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { api } from "../apis/api";
import { addMembers } from "../apis/chat.api";
import { useTheme } from "../contexts/ThemeContext"; // Import ThemeContext để đồng bộ app

// ── Colors ────────────────────────────────────────────────────────────────────
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
  white: "#11182D", // Màu tối dùng để làm nổi bật text/icon trên nền màu sáng (primary) ở dark mode
  border: "#1E2946",
  success: "#4ADE80",
  danger: "#F87171",
  card: "#11182D",
  searchBg: "#1E2946",
  searchFocusedBg: "#1E2040",
  sectionHeaderBg: "#0D1428",
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  size = 46,
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
export default function AddMemberScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { conversationId, existingMemberIds = [] } = route.params || {};

  // Sử dụng useTheme thay vì useColorScheme để đồng bộ với setting của App
  const { isDarkMode } = useTheme();
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Fetch danh sách bạn bè + lọc người đã trong nhóm
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const [friendsRes, convRes] = await Promise.all([
          api.get("/friends/list"),
          api.get(`/conversations/${conversationId}`),
        ]);

        const allFriends: any[] = friendsRes.data.result || [];
        const participants: any[] = convRes.data.result?.participants || [];
        const existingSet = new Set(participants.map((p: any) => p.toString()));

        setFriends(
          allFriends.filter((f) => !existingSet.has((f._id || "").toString())),
        );
      } catch {
        Alert.alert("Lỗi", "Không thể tải danh sách bạn bè.");
      } finally {
        setLoading(false);
      }
    };
    fetchFriends();
  }, [conversationId]);

  // Filter theo search
  const filtered = useMemo(() => {
    if (!searchText.trim()) return friends;
    const q = searchText.toLowerCase();
    return friends.filter((f) => {
      const name = (f.fullName || f.userName || "").toLowerCase();
      const phone = (f.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [friends, searchText]);

  // Toggle chọn
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Thêm thành viên
  const handleAdd = async () => {
    if (selectedIds.size === 0) return;
    setAdding(true);
    try {
      await addMembers(conversationId, Array.from(selectedIds));
      Alert.alert(
        "Thành công",
        `Đã thêm ${selectedIds.size} thành viên vào nhóm`,
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch {
      Alert.alert("Lỗi", "Không thể thêm thành viên. Vui lòng thử lại.");
    } finally {
      setAdding(false);
    }
  };

  // ── Render Item ───────────────────────────────────────────────────────────
  const renderItem = ({ item }: any) => {
    const id = (item._id || "").toString();
    const isSelected = selectedIds.has(id);
    const name = item.fullName || item.userName || "Người dùng";
    const sub = item.phone || item.bio || "";

    return (
      <TouchableOpacity
        style={[
          styles.item,
          {
            borderBottomColor: COLORS.border,
            backgroundColor: isSelected ? COLORS.searchFocusedBg : COLORS.card,
          },
        ]}
        onPress={() => toggleSelect(id)}
        activeOpacity={0.7}
      >
        <Avatar
          name={name}
          size={48}
          bgColor={isSelected ? COLORS.primary : COLORS.secondary}
        />

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: COLORS.foreground }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {sub ? (
            <Text
              style={[styles.sub, { color: COLORS.mutedDark }]}
              numberOfLines={1}
            >
              {sub}
            </Text>
          ) : null}
        </View>

        {/* Checkbox */}
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? COLORS.primary : COLORS.border,
              backgroundColor: isSelected ? COLORS.primary : "transparent",
            },
          ]}
        >
          {isSelected && (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          )}
        </View>
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

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: COLORS.foreground }]}>
            Thêm thành viên
          </Text>
          {selectedIds.size > 0 && (
            <Text style={[styles.headerSub, { color: COLORS.mutedDark }]}>
              Đã chọn {selectedIds.size}
            </Text>
          )}
        </View>

        {/* Nút xác nhận */}
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            {
              backgroundColor:
                selectedIds.size > 0 ? COLORS.primary : COLORS.muted,
            },
          ]}
          onPress={handleAdd}
          disabled={selectedIds.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text
              style={[
                styles.confirmText,
                {
                  color: selectedIds.size > 0 ? COLORS.white : COLORS.mutedDark,
                },
              ]}
            >
              Thêm
            </Text>
          )}
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
          <Ionicons name="search-outline" size={16} color={COLORS.mutedDark} />
          <TextInput
            placeholder="Tìm bạn bè..."
            placeholderTextColor={COLORS.mutedDark}
            style={[styles.searchInput, { color: COLORS.foreground }]}
            value={searchText}
            onChangeText={setSearchText}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons
                name="close-circle"
                size={16}
                color={COLORS.mutedDark}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Count */}
      <View style={[styles.countRow, { backgroundColor: COLORS.background }]}>
        <Text style={[styles.countText, { color: COLORS.primary }]}>
          Bạn bè ({filtered.length})
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={COLORS.primary}
          style={{ marginTop: 40 }}
          size="large"
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => (item._id || "").toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={COLORS.border} />
              <Text style={[styles.emptyText, { color: COLORS.mutedDark }]}>
                {searchText ? "Không tìm thấy" : "Tất cả bạn bè đã trong nhóm"}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  headerSub: { fontSize: 12, marginTop: 1 },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 60,
    alignItems: "center",
  },
  confirmText: { fontSize: 14, fontWeight: "600" },

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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: { fontSize: 13, fontWeight: "700" },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: "600" },
  sub: { fontSize: 13, marginTop: 2 },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },

  listContent: { paddingBottom: 24 },
  empty: { alignItems: "center", marginTop: 80, gap: 12 },
  emptyText: { fontSize: 15 },
});
