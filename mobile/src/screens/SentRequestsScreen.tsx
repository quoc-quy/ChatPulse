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
import { useTheme } from "../contexts/ThemeContext";

export default function SentRequestsScreen({ navigation }: any) {
  const { colors } = useTheme();

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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Lời mời đã gửi
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={sentRequests}
          keyExtractor={(item) => item.id || item._id}
          renderItem={({ item }) => (
            <FriendItem item={item} type="sent" onCancel={handleCancel} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
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
