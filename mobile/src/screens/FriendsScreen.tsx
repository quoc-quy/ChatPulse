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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";
import { useNavigation } from "@react-navigation/native";

interface Friend {
  _id: string;
  userName: string; // Khớp với field từ Backend
  fullName?: string;
  avatar?: string;
  [key: string]: any;
}

export default function FriendsScreen({ navigation }: any) {
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
        api.get("/friends/requests/received"),
      ]);
      setFriends(friendsRes.data.result || []);
      setRequests(requestsRes.data.result || []);
    } catch (error: any) {
      const serverError = error.response?.data;
      console.log("Lỗi chi tiết từ Server:", serverError);

      // Kiểm tra nếu thông báo lỗi là 'jwt expired'
      const isExpired =
        serverError?.errors?.authorization?.msg === "jwt expired";

      if (error.response?.status === 422 && isExpired) {
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại.");
        await AsyncStorage.removeItem("access_token"); // Xóa token cũ
        navigation.replace("Login"); // Quay lại trang Login
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  // 2. Xử lý Đăng xuất
  // src/screens/FriendsScreen.tsx

  const handleLogout = async () => {
    try {
      // 1. Xóa token và các thông tin liên quan trong máy
      await AsyncStorage.removeItem("access_token");
      // Nếu bạn có lưu user_info hay refresh_token thì xóa luôn ở đây
      // await AsyncStorage.clear(); // Hoặc xóa sạch toàn bộ nếu muốn

      console.log("Logged out successfully");

      // 2. Điều hướng về trang Login
      // Sử dụng .replace để ghi đè stack, không cho quay lại Main
      navigation.replace("Login");
    } catch (error) {
      console.error("Lỗi khi đăng xuất:", error);
    }
  };
  // 3. Xử lý Chấp nhận/Từ chối lời mời
  const handleAction = useCallback(
    async (id: string, action: "accept" | "decline") => {
      // Optimistic UI: Xóa khỏi danh sách ngay lập tức
      setRequests((prev) => prev.filter((item) => item._id !== id));

      try {
        await api.post(`/friends/${action}`, { friendId: id });
        if (action === "accept") {
          fetchData(); // Tải lại để cập nhật danh sách bạn bè mới
        }
      } catch (error) {
        Alert.alert("Thông báo", "Thao tác thất bại. Vui lòng thử lại.");
        fetchData(); // Rollback dữ liệu nếu lỗi
      }
    },
    [],
  );

  // 4. Lọc danh sách an toàn (tránh lỗi toLowerCase trên undefined)
  const filteredData = (activeTab === "friends" ? friends : requests).filter(
    (item) => {
      const name = item?.userName || item?.fullName || "Người dùng";
      return name.toLowerCase().includes(searchText.toLowerCase());
    },
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
      {/* Header section tích hợp Logout */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contacts</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm..."
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
            Bạn bè ({friends.length})
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
  container: { flex: 1, backgroundColor: "#f4f4f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  headerTitle: { fontSize: 28, fontWeight: "bold", color: "#09090b" },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  logoutText: { color: "#ef4444", fontWeight: "600", fontSize: 14 },
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
    backgroundColor: "#ef4444",
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
