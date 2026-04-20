import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

// Import các API
import { friendApi } from "../apis/friends.api";
import { getConversations, forwardMessage } from "../apis/chat.api";

interface TargetItem {
  _id: string;
  name: string;
  avatar?: string;
  targetType: "user" | "group";
}

const lightColors = {
  background: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF2FF",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
  primary: "#6366F1",
  accent: "#8B5CF6",
  headerText: "#0F172A",
};

const darkColors = {
  background: "#070B1A",
  surface: "#11182D",
  surfaceSoft: "#0D1428",
  text: "#F8FAFC",
  textLight: "#9CA3AF",
  border: "#1E2946",
  primary: "#7C3AED",
  accent: "#A855F7",
  headerText: "#F8FAFC",
};

export default function ForwardMessageScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const messageId = route.params?.messageId;

  const { isDarkMode } = useTheme();
  const COLORS = isDarkMode ? darkColors : lightColors;
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);

  const [data, setData] = useState<TargetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [friendsRes, convsRes] = await Promise.all([
        friendApi.getFriends(),
        getConversations(),
      ]);
      const friendsData = friendsRes.data?.result || friendsRes.data || [];
      const convsData = convsRes.data?.result || convsRes.data || [];

      const formattedFriends: TargetItem[] = friendsData.map((f: any) => ({
        _id: f._id,
        name: f.userName || f.fullName,
        avatar: f.avatar,
        targetType: "user",
      }));

      const formattedGroups: TargetItem[] = convsData
        .filter((c: any) => c.type === "group")
        .map((g: any) => ({
          _id: g._id,
          name: g.name,
          avatar: g.avatar || g.avatarUrl,
          targetType: "group",
        }));

      setData([...formattedGroups, ...formattedFriends]);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  const displayData = useMemo(() => {
    if (!searchQuery) return data;
    const lowerQuery = searchQuery.toLowerCase();
    return data.filter((item) => item.name?.toLowerCase().includes(lowerQuery));
  }, [data, searchQuery]);

  const toggleSelect = (item: TargetItem) => {
    setSelectedTargets((prev) => {
      const isSelected = prev.some((t) => t._id === item._id);
      if (isSelected) return prev.filter((t) => t._id !== item._id);
      return [...prev, item];
    });
  };

  const handleSend = async () => {
    if (selectedTargets.length === 0 || !messageId) return;
    setSending(true);
    try {
      const targetUserIds = selectedTargets
        .filter((t) => t.targetType === "user")
        .map((t) => t._id);
      const targetGroupIds = selectedTargets
        .filter((t) => t.targetType === "group")
        .map((t) => t._id);
      await forwardMessage(messageId, targetUserIds, targetGroupIds);
      Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message ||
          "Không thể chuyển tiếp tin nhắn lúc này.",
      );
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: TargetItem }) => {
    const isSelected = selectedTargets.some((t) => t._id === item._id);
    return (
      <TouchableOpacity
        onPress={() => toggleSelect(item)}
        style={styles.itemContainer}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatarRing, { borderColor: COLORS.primary }]}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: COLORS.accent }]}>
                <Text style={styles.avatarText}>
                  {item.name ? item.name.charAt(0).toUpperCase() : "?"}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText}>{item.name}</Text>
          <Text style={styles.subText}>
            {item.targetType === "group" ? "Nhóm" : "Bạn bè"}
          </Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Custom Header thay thế cho navigation header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển tiếp</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm bạn bè hoặc nhóm..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
            style={{ marginTop: 20 }}
          />
        ) : (
          <FlatList
            data={displayData}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Không tìm thấy kết quả.</Text>
            }
          />
        )}

        {selectedTargets.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Gửi ({selectedTargets.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (COLORS: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 15,
      height: 56,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.text },
    headerBtn: {
      width: 40,
      height: 40,
      justifyContent: "center",
      alignItems: "center",
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: COLORS.surface,
      margin: 15,
      paddingHorizontal: 12,
      borderRadius: 12,
      height: 46,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: COLORS.text },
    itemContainer: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 15,
      backgroundColor: COLORS.surface,
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.border,
    },
    avatarWrapper: { position: "relative", marginRight: 12 },
    avatarRing: { borderWidth: 2, borderRadius: 25, padding: 2 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      textAlign: "center",
      lineHeight: 40,
    },
    infoContainer: { flex: 1 },
    nameText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
    subText: { fontSize: 13, color: COLORS.textLight, marginTop: 2 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: COLORS.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 15,
      paddingBottom: Platform.OS === "ios" ? 20 : 15,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      backgroundColor: COLORS.surface,
    },
    sendButton: {
      backgroundColor: COLORS.primary,
      height: 50,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sendButtonDisabled: { opacity: 0.6 },
    sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
    emptyText: {
      textAlign: "center",
      color: COLORS.textLight,
      marginTop: 40,
      fontSize: 15,
    },
  });
