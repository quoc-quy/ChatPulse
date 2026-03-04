import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api"; //

interface Friend {
  _id: string;
  fullName: string;
  email?: string;
  [key: string]: any;
}

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Hàm lấy dữ liệu từ Backend
  const fetchData = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        api.get("/friends/list"),
        api.get("/friends/requests"),
      ]);

      // Giả định backend trả về object có field 'result' chứa mảng
      setFriends(friendsRes.data.result || []);
      setRequests(requestsRes.data.result || []);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
      Alert.alert("Lỗi", "Không thể kết nối đến máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Xử lý Chấp nhận/Từ chối lời mời
  const handleAction = useCallback(
    async (id: string, action: "accept" | "decline") => {
      // Optimistic UI: Xóa khỏi danh sách ngay lập tức để tạo cảm giác mượt mà
      setRequests((prev) => prev.filter((item) => item._id !== id));

      try {
        await api.post(`/friends/${action}`, { friendId: id });

        if (action === "accept") {
          // Nếu chấp nhận, tải lại danh sách bạn bè để cập nhật tab kia
          const res = await api.get("/friends/list");
          setFriends(res.data.result || []);
        }
      } catch (error) {
        Alert.alert("Thông báo", "Thao tác thất bại. Vui lòng thử lại.");
        fetchData(); // Tải lại dữ liệu gốc nếu có lỗi
      }
    },
    [requests],
  );

  // 3. Lọc danh sách theo ô tìm kiếm
  const filteredData = (activeTab === "friends" ? friends : requests).filter(
    (item) => item.fullName.toLowerCase().includes(searchText.toLowerCase()),
  );

  const renderItem = ({ item }: { item: Friend }) => (
    <FriendItem
      item={item}
      type={activeTab === "friends" ? "friend" : "request"}
      onAccept={(id) => handleAction(id, "accept")}
      onDecline={(id) => handleAction(id, "decline")}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header section */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Text style={{ fontSize: 20 }}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="#a1a1aa"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
      </View>

      {/* Tab Navigator */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "friends" && styles.activeTab]}
          onPress={() => setActiveTab("friends")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "friends" && styles.activeTabText,
            ]}
          >
            Bạn bè
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "requests" && styles.activeTab]}
          onPress={() => setActiveTab("requests")}
        >
          <View style={styles.row}>
            <Text
              style={[
                styles.tabText,
                activeTab === "requests" && styles.activeTabText,
              ]}
            >
              Lời mời
            </Text>
            {requests.length > 0 && <View style={styles.badge} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* List content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#18181b" />
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Không có dữ liệu hiển thị</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f4f5" }, // Đồng bộ màu nền dự án
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#09090b" },
  iconButton: { padding: 5 },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e4e4e7",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f4f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: "#09090b" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e4e4e7",
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#18181b" },
  tabText: { color: "#71717a", fontWeight: "500" },
  activeTabText: { color: "#18181b", fontWeight: "bold" },
  listContent: { flexGrow: 1 },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444", // Màu đỏ lỗi đồng bộ
    marginLeft: 4,
  },
  row: { flexDirection: "row", alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: { color: "#71717a" },
});
