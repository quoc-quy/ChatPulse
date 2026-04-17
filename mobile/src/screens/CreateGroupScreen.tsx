import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { friendApi } from "../apis/friends.api";
import * as ImagePicker from "expo-image-picker";
import { createGroup, uploadGroupAvatarApi } from "../apis/chat.api";
import { useTheme } from "../contexts/ThemeContext";

// ==========================================
// BẢNG MÀU ĐỒNG BỘ 100%
// ==========================================
const lightColors = {
  background: "#F5F7FB",
  surface: "#FFFFFF",
  surfaceSoft: "#EEF2FF",
  text: "#0F172A",
  textLight: "#64748B",
  border: "#E2E8F0",
  primary: "#6366F1",
  accent: "#711cc1",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
  mutedForeground: "#94A3B8",
};

const darkColors = {
  background: "#070B1A",
  surface: "#11182D",
  surfaceSoft: "#0D1428",
  text: "#F8FAFC",
  textLight: "#9CA3AF",
  border: "#1E2946",
  primary: "#1c0249",
  accent: "#711cc1",
  success: "#10B981",
  badge: "#EF4444",
  headerText: "#FFFFFF",
  mutedForeground: "#475569",
};

export default function CreateGroupScreen() {
  const navigation = useNavigation<any>();
  const { isDarkMode } = useTheme();

  // Chọn bộ màu dựa trên theme
  const colors = isDarkMode ? darkColors : lightColors;

  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await friendApi.getFriends();
        setFriends(res.data?.result || []);
      } catch {
        Alert.alert("Lỗi", "Không thể tải danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Thông báo", "Cần quyền truy cập thư viện ảnh");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      Alert.alert("Thông báo", "Vui lòng nhập tên nhóm");
      return;
    }
    if (selected.size < 1) {
      Alert.alert("Thông báo", "Vui lòng chọn ít nhất 1 thành viên");
      return;
    }

    setCreating(true);
    try {
      const res = await createGroup({
        name: trimmedName,
        member_ids: Array.from(selected),
        avatarUrl: "",
      });

      const newGroupId = res.data?.result?._id;
      if (newGroupId && avatarUri) {
        await uploadGroupAvatarApi(newGroupId, avatarUri);
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo nhóm");
    } finally {
      setCreating(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header - Sử dụng accent hoặc primary tùy phong cách app */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.accent, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>
            Nhóm mới
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.headerText, opacity: 0.8 },
            ]}
          >
            Đã chọn: {selected.size}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCreateGroup}
          disabled={creating || !groupName.trim() || selected.size === 0}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.headerText} />
          ) : (
            <Text
              style={[
                styles.createBtnText,
                {
                  color:
                    groupName.trim() && selected.size > 0
                      ? colors.headerText
                      : colors.mutedForeground,
                },
              ]}
            >
              TẠO
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Group Info - Input Row */}
      <View
        style={[
          styles.nameRow,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[styles.cameraIcon, { backgroundColor: colors.surfaceSoft }]}
          onPress={pickImage}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarPreview} />
          ) : (
            <Feather name="camera" size={20} color={colors.textLight} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.nameInput, { color: colors.text }]}
          placeholder="Đặt tên nhóm"
          placeholderTextColor={colors.mutedForeground}
          value={groupName}
          onChangeText={setGroupName}
        />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchRow, { backgroundColor: colors.surfaceSoft }]}>
        <Ionicons
          name="search"
          size={18}
          color={colors.mutedForeground}
          style={{ marginLeft: 12 }}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Tìm tên hoặc số điện thoại"
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
      ) : (
        <FlatList
          data={friends.filter((f) =>
            f.userName.toLowerCase().includes(searchQuery.toLowerCase()),
          )}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.friendRow, { borderBottomColor: colors.border }]}
              onPress={() => toggleSelect(item._id)}
            >
              <View
                style={[
                  styles.checkbox,
                  selected.has(item._id) && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                  { borderColor: colors.border },
                ]}
              >
                {selected.has(item._id) && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Image
                source={{
                  uri: item.avatar || "https://via.placeholder.com/40",
                }}
                style={styles.avatar}
              />
              <Text style={[styles.friendName, { color: colors.text }]}>
                {item.userName}
              </Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
  },
  headerTitleContainer: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSubtitle: { fontSize: 12 },
  createBtnText: { fontWeight: "700", fontSize: 14 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cameraIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarPreview: { width: 48, height: 48, borderRadius: 24 },
  nameInput: { flex: 1, fontSize: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    borderRadius: 20,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 14, marginLeft: 8 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  friendName: { fontSize: 16, fontWeight: "500" },
});
