import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { friendApi } from "../apis/friends.api";

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  size = 48,
  bgColor,
}: {
  name: string;
  size?: number;
  bgColor: string;
}) => (
  <View
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <Text style={{ color: "#FFF", fontSize: size * 0.36, fontWeight: "bold" }}>
      {(name || "?").charAt(0).toUpperCase()}
    </Text>
  </View>
);

export default function BlockedUsersScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const fetchBlockedUsers = useCallback(async (isRefreshing = false) => {
    try {
      if (isRefreshing) setRefreshing(true);
      else setLoading(true);
      const res = await friendApi.getBlockedUsers();
      setBlockedUsers(res.data?.result || []);
    } catch {
      Alert.alert("Lỗi", "Không thể tải danh sách chặn.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = (userId: string, userName: string) => {
    Alert.alert(
      "Bỏ chặn",
      `Bỏ chặn ${userName}? Họ có thể gửi tin nhắn cho bạn trở lại.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bỏ chặn",
          onPress: async () => {
            setUnblockingId(userId);
            try {
              await friendApi.unblockUser(userId);
              setBlockedUsers((prev) =>
                prev.filter(
                  (u) => (u._id || u.userId || "").toString() !== userId,
                ),
              );
            } catch {
              Alert.alert("Lỗi", "Không thể bỏ chặn lúc này.");
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: any) => {
    const userId = (item._id || item.userId || "").toString();
    const userName =
      item.fullName || item.userName || item.username || "Người dùng";
    const isUnblocking = unblockingId === userId;

    return (
      <View
        style={[
          styles.itemRow,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <Avatar name={userName} size={48} bgColor={colors.secondary} />
        <View style={styles.itemInfo}>
          <Text
            style={[styles.itemName, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {userName}
          </Text>
          {item.phone && (
            <Text
              style={[styles.itemSub, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {item.phone}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.unblockBtn, { borderColor: colors.primary }]}
          onPress={() => handleUnblock(userId, userName)}
          disabled={isUnblocking}
        >
          {isUnblocking ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.unblockText, { color: colors.primary }]}>
              Bỏ chặn
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
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
          <Feather name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Danh sách chặn
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => (item._id || item.userId || "").toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBlockedUsers(true)}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            blockedUsers.length > 0 ? (
              <Text
                style={[styles.listHeader, { color: colors.mutedForeground }]}
              >
                {blockedUsers.length} người bị chặn
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="shield-checkmark-outline"
                size={56}
                color={colors.muted}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Chưa chặn ai
              </Text>
              <Text
                style={[styles.emptySub, { color: colors.mutedForeground }]}
              >
                Những người bạn chặn sẽ xuất hiện ở đây
              </Text>
            </View>
          }
          contentContainerStyle={
            blockedUsers.length === 0 && styles.emptyContainer
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  listHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  itemInfo: { flex: 1, marginLeft: 14 },
  itemName: { fontSize: 16, fontWeight: "600" },
  itemSub: { fontSize: 13, marginTop: 2 },

  unblockBtn: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  unblockText: { fontSize: 13, fontWeight: "600" },

  emptyContainer: { flexGrow: 1 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingBottom: 80,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  emptySub: { fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
});
