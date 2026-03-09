import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ChevronLeft, UserCheck, UserMinus } from "lucide-react-native";
import { friendApi } from "../apis/friends.api";
import { api } from "../apis/api";

const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  white: "#FFFFFF",
  border: "#E2E8F0",
};
interface FriendRequest {
  _id: string;
  fullName?: string;
  userName?: string;
  // ... các trường khác nếu có
}

export default function FriendRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await friendApi.getRequests(); // PATCH /friends/requests/received
      setRequests(response.data.result || []);
    } catch (error) {
      console.log("Lỗi tải lời mời:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAccept = async (id: string) => {
    try {
      const response = await friendApi.acceptRequest(id);

      if (response.status === 200) {
        // ✅ CẬP NHẬT TẠI ĐÂY: Loại bỏ người vừa đồng ý khỏi danh sách hiển thị
        setRequests((prevRequests) =>
          prevRequests.filter((req) => req._id !== id),
        );

        Alert.alert("Thành công", "Đã trở thành bạn bè", [
          {
            text: "OK",
            onPress: () => {
              // Tùy chọn: Nếu danh sách trống thì quay về trang trước
              // navigation.goBack();
            },
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    }
  };
  const handleDecline = async (id: string) => {
    try {
      await friendApi.declineRequest(id); // DELETE /friends/requests/:id/decline
      fetchRequests();
    } catch (error) {
      Alert.alert("Lỗi", "Thao tác thất bại");
    }
  };

  const renderItem = ({ item }: any) => {
    const displayName = item.fullName || item.userName || "User";
    const initials = displayName.charAt(0).toUpperCase();

    return (
      <View style={styles.requestItem}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.message} numberOfLines={1}>
            Muốn kết bạn với bạn
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={() => handleAccept(item._id)}
            >
              <Text style={styles.btnTextWhite}>Đồng ý</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDecline}
              onPress={() => handleDecline(item._id)}
            >
              <Text style={styles.btnTextBlack}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Không có lời mời nào</Text>
            </View>
          }
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.foreground },
  list: { paddingVertical: 8 },
  requestItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: COLORS.white, fontSize: 20, fontWeight: "bold" },
  content: { flex: 1, marginLeft: 16 },
  name: { fontSize: 16, fontWeight: "bold", color: COLORS.foreground },
  message: { fontSize: 14, color: COLORS.muted, marginVertical: 4 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  btnAccept: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnDecline: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  btnTextWhite: { color: COLORS.white, fontWeight: "600" },
  btnTextBlack: { color: COLORS.foreground, fontWeight: "600" },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { color: COLORS.muted },
});
