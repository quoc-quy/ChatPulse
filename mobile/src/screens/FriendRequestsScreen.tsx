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
import { profileStatsEvents } from "../utils/profileStats.events";

export default function FriendRequestsScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await friendApi.getRequests();
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
        setRequests((prev) => prev.filter((req) => req._id !== id));
        profileStatsEvents.emit({ type: "friends_delta", delta: 1 });
        Alert.alert("Thành công", "Đã trở thành bạn bè");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể chấp nhận lời mời");
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await friendApi.declineRequest(id);
      setRequests((prev) => prev.filter((req) => req._id !== id));
    } catch (error) {
      Alert.alert("Lỗi", "Không thể từ chối lời mời lúc này");
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Lời mời kết bạn
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.secondary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id || item._id}
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
              <Text
                style={[styles.emptyText, { color: colors.mutedForeground }]}
              >
                Không có lời mời nào
              </Text>
            </View>
          }
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
  headerTitle: { fontSize: 18, fontWeight: "600" },
  empty: { marginTop: 100, alignItems: "center" },
  emptyText: { fontSize: 15 },
});
