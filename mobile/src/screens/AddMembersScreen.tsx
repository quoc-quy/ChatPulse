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
import { useTheme } from "../contexts/ThemeContext";

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

  const { colors } = useTheme();

  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const filtered = useMemo(() => {
    if (!searchText.trim()) return friends;
    const q = searchText.toLowerCase();
    return friends.filter((f) => {
      const name = (f.fullName || f.userName || "").toLowerCase();
      const phone = (f.phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [friends, searchText]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
            borderBottomColor: colors.border,
            backgroundColor: isSelected ? colors.accent : colors.card,
          },
        ]}
        onPress={() => toggleSelect(id)}
        activeOpacity={0.7}
      >
        <Avatar
          name={name}
          size={48}
          bgColor={isSelected ? colors.primary : colors.secondary}
        />

        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          {sub ? (
            <Text
              style={[styles.sub, { color: colors.mutedForeground }]}
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
              borderColor: isSelected ? colors.primary : colors.border,
              backgroundColor: isSelected ? colors.primary : "transparent",
            },
          ]}
        >
          {isSelected && (
            <Ionicons
              name="checkmark"
              size={14}
              color={colors.primaryForeground}
            />
          )}
        </View>
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

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            Thêm thành viên
          </Text>
          {selectedIds.size > 0 && (
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Đã chọn {selectedIds.size}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.confirmBtn,
            {
              backgroundColor:
                selectedIds.size > 0 ? colors.primary : colors.muted,
            },
          ]}
          onPress={handleAdd}
          disabled={selectedIds.size === 0 || adding}
        >
          {adding ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.confirmText,
                {
                  color:
                    selectedIds.size > 0
                      ? colors.primaryForeground
                      : colors.mutedForeground,
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
            placeholder="Tìm bạn bè..."
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
          Bạn bè ({filtered.length})
        </Text>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator
          color={colors.primary}
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
              <Ionicons name="people-outline" size={48} color={colors.border} />
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
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

  countRow: { paddingHorizontal: 16, paddingVertical: 10 },
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
