// src/screens/SentRequestsScreen.tsx
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

// Bảng màu mapping từ index.css
const COLORS = {
  primary: "#4F46E5", // --primary: hsl(230 85% 60%)
  secondary: "#A855F7", // --secondary: hsl(270 75% 65%)
  background: "#F8FAFC", // --background: hsl(240 30% 98%)
  foreground: "#1E293B", // --foreground: hsl(240 10% 15%)
  muted: "#94A3B8", // --muted: hsl(240 15% 90% -> foreground)
  white: "#FFFFFF", // --card
  border: "#E2E8F0", // --border: hsl(240 15% 85%)
};

export default function SentRequestsScreen({ navigation }: any) {
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSentRequests = async () => {
    setLoading(true);
    try {
      // Gọi API lấy danh sách pending
      const response = await friendApi.getPendingRequests();
      // Bóc tách mảng "sent" từ response
      const sentArray = response.data?.result || [];
      setSentRequests(sentArray);
    } catch (error) {
      console.log("Lỗi tải lời mời đã gửi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSentRequests();
  }, []);

  const handleCancel = async (id: string) => {
    try {
      // Gọi API hủy lời mời
      await friendApi.cancelRequest(id);

      // Xóa item khỏi danh sách ngay lập tức để UI mượt mà
      setSentRequests((prev) =>
        prev.filter((req) => req._id !== id && req.id !== id),
      );
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thu hồi lời mời lúc này.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lời mời đã gửi</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sentRequests}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) => (
            <FriendItem item={item} type="sent" onCancel={handleCancel} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Bạn chưa gửi lời mời nào</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600", color: COLORS.foreground },
  listContent: { paddingBottom: 20 },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { color: COLORS.muted, fontSize: 15 },
});
