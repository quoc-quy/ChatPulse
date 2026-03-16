import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { api } from "../apis/api";
import { addMembers } from "../apis/chat.api";

// ── Colors ────────────────────────────────────────────────────────────────────
const lightColors = {
  background: "hsl(240, 30%, 98%)",
  foreground: "hsl(240, 10%, 15%)",
  card: "hsl(240, 30%, 100%)",
  primary: "hsl(230, 85%, 60%)",
  secondary: "hsl(270, 75%, 65%)",
  muted: "hsl(240, 15%, 90%)",
  mutedForeground: "hsl(240, 10%, 40%)",
  border: "hsl(240, 15%, 85%)",
  white: "#FFFFFF",
  searchBg: "hsl(240, 15%, 94%)",
  selectedBg: "#EEF2FF",
  checkColor: "hsl(230, 85%, 60%)",
};

const darkColors = {
  background: "hsl(240, 25%, 7%)",
  foreground: "hsl(240, 20%, 98%)",
  card: "hsl(240, 25%, 10%)",
  primary: "hsl(230, 85%, 65%)",
  secondary: "hsl(270, 75%, 60%)",
  muted: "hsl(240, 20%, 18%)",
  mutedForeground: "hsl(240, 10%, 65%)",
  border: "hsl(240, 20%, 18%)",
  white: "#FFFFFF",
  searchBg: "hsl(240, 20%, 15%)",
  selectedBg: "hsl(230, 40%, 18%)",
  checkColor: "hsl(230, 85%, 65%)",
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

  const isDarkMode = useColorScheme() === "dark";
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
        // Fetch song song: friends list + conversation detail
        const [friendsRes, convRes] = await Promise.all([
          api.get("/friends/list"),
          api.get(`/conversations/${conversationId}`),
        ]);

        const allFriends: any[] = friendsRes.data.result || [];

        // Lấy participants từ API — đây là source of truth chính xác nhất
        // participants là array ObjectId string
        const participants: any[] = convRes.data.result?.participants || [];
        const existingSet = new Set(participants.map((p: any) => p.toString()));

        // friends/list trả về flat object: { _id, userName, ... }
        // _id ở root, không nested
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
    // friends/list trả về flat: { _id, userName, avatar, email }
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
            backgroundColor: isSelected ? COLORS.selectedBg : COLORS.card,
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
              style={[styles.sub, { color: COLORS.mutedForeground }]}
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
              borderColor: isSelected ? COLORS.checkColor : COLORS.border,
              backgroundColor: isSelected ? COLORS.checkColor : "transparent",
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
            <Text style={[styles.headerSub, { color: COLORS.mutedForeground }]}>
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
                  color:
                    selectedIds.size > 0
                      ? COLORS.white
                      : COLORS.mutedForeground,
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
          <Ionicons
            name="search-outline"
            size={16}
            color={COLORS.mutedForeground}
          />
          <TextInput
            placeholder="Tìm bạn bè..."
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
              <Text
                style={[styles.emptyText, { color: COLORS.mutedForeground }]}
              >
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
