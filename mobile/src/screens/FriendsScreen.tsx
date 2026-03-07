import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Search, UserPlus, Bell, Edit3, QrCode } from "lucide-react-native";
import { FriendItem } from "../components/friends/FriendItem";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";

const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  white: "#FFFFFF",
};

export default function FriendsScreen() {
  // 1. Quản lý tab đang chọn (All Friends hoặc Requests)
  const [activeFilter, setActiveFilter] = useState<
    "All Friends" | "Requests" | "Blocked"
  >("All Friends");
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Gọi cả 2 API cùng lúc
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
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Logic lọc dữ liệu hiển thị theo Tab
  const getDisplayData = () => {
    if (activeFilter === "Requests") return requests;
    if (activeFilter === "Blocked") return []; // Giả lập chưa có blocked
    return friends;
  };
  const handleAccept = async (id: string) => {
    try {
      await friendApi.acceptRequest(id);
      Alert.alert("Thành công", "Đã chấp nhận lời mời kết bạn");
      fetchData(); // Tải lại danh sách để cập nhật UI
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    }
  };
  const handleDecline = async (id: string) => {
    try {
      await friendApi.declineRequest(id);
      Alert.alert("Thông báo", "Đã từ chối lời mời");
      fetchData(); // Tải lại danh sách
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thực hiện thao tác");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <Text style={styles.logoSmallText}>CP</Text>
          </View>
          <Text style={styles.headerTitle}>Contacts</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <Search size={22} color={COLORS.foreground} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Edit3 size={22} color={COLORS.foreground} />
          </TouchableOpacity>
          <View>
            <TouchableOpacity>
              <Bell size={22} color={COLORS.foreground} />
            </TouchableOpacity>
            <View style={styles.redDot} />
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Search size={20} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              placeholder="Search conversations..."
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton}>
            <UserPlus size={20} color={COLORS.secondary} />
            <Text style={styles.actionText}>Add Friend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <QrCode size={20} color={COLORS.secondary} />
            <Text style={styles.actionText}>QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Filter Bar */}
        <View style={styles.filterContainer}>
          {(["All Friends", "Requests", "Blocked"] as const).map((filter) => (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[
                styles.filterTab,
                activeFilter === filter && styles.activeFilterTab,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  activeFilter === filter && styles.activeFilterText,
                ]}
              >
                {filter}
              </Text>
              {filter === "Requests" && requests.length > 0 && (
                <View style={styles.requestBadge}>
                  <Text style={styles.requestBadgeText}>{requests.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.listContainer}>
          {loading ? (
            <ActivityIndicator
              color={COLORS.secondary}
              style={{ marginTop: 20 }}
            />
          ) : (
            getDisplayData().map((item: any) => (
              <FriendItem
                key={item._id}
                item={item}
                // Truyền type dựa trên tab đang chọn để FriendItem hiển thị nút phù hợp
                type={activeFilter === "Requests" ? "request" : "friend"}
                onAccept={handleAccept} // TRUYỀN THÊM DÒNG NÀY
                onDecline={handleDecline} // TRUYỀN THÊM DÒNG NÀY
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.white,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logoBox: {
    width: 32,
    height: 32,
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoSmallText: { fontSize: 10, fontWeight: "bold", color: COLORS.primary },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.secondary },
  headerIcons: { flexDirection: "row", gap: 18 },
  redDot: {
    position: "absolute",
    right: -2,
    top: -2,
    width: 8,
    height: 8,
    backgroundColor: "#EF4444",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  searchSection: { padding: 16, backgroundColor: COLORS.white },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.foreground },
  actionRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginVertical: 15,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    height: 50,
    borderRadius: 25,
    gap: 8,
    elevation: 1,
  },
  actionText: { fontSize: 15, fontWeight: "600", color: COLORS.foreground },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    borderRadius: 25,
    marginHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
  },
  activeFilterTab: { backgroundColor: COLORS.white, elevation: 2 },
  filterTabText: { color: COLORS.muted, fontWeight: "500", fontSize: 13 },
  activeFilterText: { color: COLORS.foreground, fontWeight: "bold" },
  requestBadge: {
    backgroundColor: "#EF4444",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  requestBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: "bold" },
  listContainer: { flex: 1, paddingHorizontal: 4 },
});
