import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import {
  Search,
  UserPlus,
  Users,
  UserCheck,
  ChevronRight,
} from "lucide-react-native";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";
import { useFocusEffect } from "@react-navigation/native";

// Giữ nguyên bảng màu chủ đạo của bạn
const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  white: "#FFFFFF",
  border: "#E2E8F0",
};

export default function FriendsScreen({ navigation }: any) {
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefreshing = false) => {
    // Nếu là refresh bằng tay thì không hiện loading to giữa màn hình
    if (!isRefreshing) setLoading(true);

    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/friends/list"),
        api.get("/friends/requests/received"),
      ]);
      setFriends(friendsRes.data.result || []);
      setRequests(requestsRes.data.result || []);
    } catch (error) {
      console.log("Lỗi tải dữ liệu:", error);
    } finally {
      setLoading(false);
      setRefreshing(false); // Tắt biểu tượng refresh sau khi xong
    }
  };

  // 3. Hàm xử lý khi người dùng vuốt xuống
  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  // Thay thế useEffect cũ bằng useFocusEffect này
  // Nó sẽ chạy mỗi khi màn hình này được hiển thị lên (kể cả khi goBack về)
  useFocusEffect(
    React.useCallback(() => {
      fetchData(); // Gọi lại API để cập nhật Badge lời mời và danh sách bạn bè
    }, []),
  );

  // Hàm xử lý phân nhóm Alphabet giống Zalo
  const groupedFriends = useMemo(() => {
    const filtered = friends.filter((f) =>
      (f.fullName || f.userName || "")
        .toLowerCase()
        .includes(searchText.toLowerCase()),
    );

    const groups: { [key: string]: any[] } = {};
    filtered.forEach((friend) => {
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
  }, [friends, searchText]);

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

      <TouchableOpacity style={styles.menuItem}>
        <View style={[styles.iconBox, { backgroundColor: "#F3E8FF" }]}>
          <Users size={22} color={COLORS.secondary} />
        </View>
        <Text style={styles.menuText}>Danh sách chặn</Text>
        <ChevronRight size={18} color={COLORS.muted} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header tích hợp Search giống Zalo */}
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search size={18} color={COLORS.muted} />
          <TextInput
            placeholder="Tìm kiếm bạn bè..."
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity style={styles.addBtn}>
          <UserPlus size={24} color={COLORS.foreground} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 20 }} />
      ) : (
        <SectionList
          sections={groupedFriends}
          keyExtractor={(item) => item._id}
          ListHeaderComponent={StaticMenu}
          stickySectionHeadersEnabled={true}
          // 4. THÊM ĐOẠN NÀY VÀO SECTIONLIST
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]} // Màu cho Android
              tintColor={COLORS.primary} // Màu cho iOS
            />
          }
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => <FriendItem item={item} type="friend" />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không tìm thấy bạn bè</Text>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
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
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15 },
  addBtn: { marginLeft: 15 },
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
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    height: 18,
    justifyContent: "center",
    marginLeft: 8,
  },
  badgeText: { color: COLORS.white, fontSize: 11, fontWeight: "bold" },
  sectionHeader: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.muted },
  listContent: { paddingBottom: 20 },
  emptyText: { textAlign: "center", color: COLORS.muted, marginTop: 40 },
});
