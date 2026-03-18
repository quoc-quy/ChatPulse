import React, { useState, useEffect, useMemo } from "react";
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
import { useTheme } from "../contexts/ThemeContext";

const lightColors = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  card: "#FFFFFF",
  border: "#E2E8F0",
};

const darkColors = {
  primary: "#818CF8",
  secondary: "#C084FC",
  background: "#070B1A",
  foreground: "#F8FAFC",
  muted: "#64748B",
  card: "#11182D",
  border: "#1E2946",
};

export default function SentRequestsScreen({ navigation }: any) {
  const { isDarkMode } = useTheme();
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSentRequests = async () => {
    setLoading(true);
    try {
      const response = await friendApi.getPendingRequests();
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
      await friendApi.cancelRequest(id);
      setSentRequests((prev) =>
        prev.filter((req) => req._id !== id && req.id !== id),
      );
    } catch (error) {
      Alert.alert("Lỗi", "Không thể thu hồi lời mời lúc này.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
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
          <ChevronLeft size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.foreground }]}>
          Lời mời đã gửi
        </Text>
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
              <Text style={[styles.emptyText, { color: COLORS.muted }]}>
                Bạn chưa gửi lời mời nào
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },
  listContent: { paddingBottom: 20 },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { fontSize: 15 },
});
