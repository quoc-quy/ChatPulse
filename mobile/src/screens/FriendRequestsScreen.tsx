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
import { ChevronLeft } from "lucide-react-native";
import { friendApi } from "../apis/friends.api";
import { FriendItem } from "../components/friends/FriendItem";

const COLORS = {
  foreground: "#1E293B",
  secondary: "#A855F7",
  white: "#FFFFFF",
  border: "#E2E8F0",
  muted: "#94A3B8",
};

export default function FriendRequestsScreen({ navigation }: any) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await friendApi.getRequests(); //
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
      const response = await friendApi.acceptRequest(id); //
      if (response.status === 200) {
        setRequests((prev) => prev.filter((req) => req._id !== id));
        Alert.alert("Thành công", "Đã trở thành bạn bè");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      // Gọi API decline đã định nghĩa
      await friendApi.declineRequest(id);

      // Cập nhật lại danh sách hiển thị trên UI
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (error) {
      Alert.alert("Lỗi", "Không thể từ chối lời mời lúc này");
    }
  };
  const handleCancelRequest = async (requestId: string) => {
    try {
      // Gọi API cancel theo đúng Postman
      const response = await friendApi.cancelRequest(requestId);

      if (response.status === 200) {
        Alert.alert("Thành công", "Đã thu hồi lời mời kết bạn");
        // Logic để cập nhật lại danh sách trên UI sau khi xóa
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể hủy lời mời");
    }
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendItem
              item={item}
              type="request"
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          )}
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
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { color: COLORS.muted },
});
