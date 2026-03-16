import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  useColorScheme,
  Switch,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";

// ==========================================
// 1. BẢNG MÀU TỪ INDEX.CSS (Hỗ trợ Light/Dark)
// ==========================================
const lightColors = {
  background: "hsl(240, 30%, 98%)",
  foreground: "hsl(240, 10%, 15%)",
  card: "hsl(240, 30%, 100%)",
  primary: "hsl(230, 85%, 60%)",
  secondary: "hsl(270, 75%, 65%)",
  muted: "hsl(240, 15%, 90%)",
  mutedForeground: "hsl(240, 10%, 40%)",
  destructive: "hsl(0, 84%, 60%)",
  border: "hsl(240, 15%, 85%)",
};

const darkColors = {
  background: "hsl(240, 25%, 7%)",
  foreground: "hsl(240, 20%, 98%)",
  card: "hsl(240, 25%, 10%)",
  primary: "hsl(230, 85%, 65%)",
  secondary: "hsl(270, 75%, 60%)",
  muted: "hsl(240, 20%, 18%)",
  mutedForeground: "hsl(240, 10%, 65%)",
  destructive: "hsl(0, 62%, 40%)",
  border: "hsl(240, 20%, 18%)",
};

const ChatDetailsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Nhận params truyền từ MessageScreen sang
  const { conversationId, chatName, isGroup } = route.params || {};

  const isDarkMode = useColorScheme() === "dark";
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);

  const [isMuted, setIsMuted] = useState(false);

  // Fake dữ liệu avatar
  const avatarLetter = chatName ? chatName.charAt(0).toUpperCase() : "U";

  // Component Item cho danh sách Menu
  const MenuItem = ({
    icon,
    title,
    subtitle,
    color,
    isDestructive = false,
    onPress,
    showToggle,
    toggleValue,
    onToggle,
  }: any) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={showToggle}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <Ionicons
          name={icon}
          size={22}
          color={
            isDestructive ? COLORS.destructive : color || COLORS.mutedForeground
          }
        />
        <View style={styles.menuTextContainer}>
          <Text
            style={[
              styles.menuTitle,
              isDestructive && { color: COLORS.destructive },
            ]}
          >
            {title}
          </Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.muted, true: COLORS.primary }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <Feather
          name="chevron-right"
          size={20}
          color={COLORS.mutedForeground}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tùy chọn</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* THÔNG TIN CHUNG (Avatar + Tên + Hành động nhanh) */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.avatarBig,
              isGroup && { backgroundColor: COLORS.secondary },
            ]}
          >
            <Text style={styles.avatarBigText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.chatName}>{chatName || "Trò chuyện"}</Text>

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconBg}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={COLORS.foreground}
                />
              </View>
              <Text style={styles.actionLabel}>Tìm tin nhắn</Text>
            </TouchableOpacity>

            {!isGroup && (
              <TouchableOpacity style={styles.actionBtn}>
                <View style={styles.actionIconBg}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={COLORS.foreground}
                  />
                </View>
                <Text style={styles.actionLabel}>Trang cá nhân</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setIsMuted(!isMuted)}
            >
              <View style={styles.actionIconBg}>
                <Ionicons
                  name={
                    isMuted
                      ? "notifications-off-outline"
                      : "notifications-outline"
                  }
                  size={20}
                  color={COLORS.foreground}
                />
              </View>
              <Text style={styles.actionLabel}>
                {isMuted ? "Đã tắt" : "Tắt TB"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn}>
              <View style={styles.actionIconBg}>
                <Ionicons
                  name={isGroup ? "person-add-outline" : "people-outline"}
                  size={20}
                  color={COLORS.foreground}
                />
              </View>
              <Text style={styles.actionLabel}>
                {isGroup ? "Thêm người" : "Tạo nhóm"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* NHÓM QUẢN LÝ NHÓM (Chỉ hiện khi isGroup = true) */}
        {isGroup && (
          <View style={styles.section}>
            <MenuItem
              icon="people-outline"
              title="Xem thành viên"
              subtitle="12 thành viên"
            />
            <MenuItem
              icon="person-add-outline"
              title="Thêm thành viên"
              color={COLORS.primary}
            />
            <MenuItem icon="link-outline" title="Link mời vào nhóm" />
            <MenuItem icon="settings-outline" title="Cài đặt nhóm" />
          </View>
        )}

        {/* NHÓM MEDIA (Ảnh, File, Link) */}
        <View style={styles.section}>
          <MenuItem icon="image-outline" title="Ảnh, video, file đã gửi" />
          <MenuItem icon="link-outline" title="Link đã chia sẻ" />
        </View>

        {/* CÁ NHÂN HÓA TRÒ CHUYỆN */}
        <View style={styles.section}>
          <MenuItem icon="color-palette-outline" title="Đổi hình nền" />

          <MenuItem icon="text-outline" title="Biệt danh" />
        </View>

        {/* QUYỀN RIÊNG TƯ (Chỉ hiện cho chat Cá nhân) */}
        {!isGroup && (
          <View style={styles.section}>
            <MenuItem
              icon="ban-outline"
              title="Chặn người dùng"
              isDestructive
              onPress={() =>
                Alert.alert(
                  "Xác nhận",
                  "Bạn có chắc chắn muốn chặn người này không?",
                )
              }
            />
          </View>
        )}

        {/* KHU VỰC NGUY HIỂM */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          {isGroup ? (
            <MenuItem
              icon="log-out-outline"
              title="Rời nhóm"
              isDestructive
              onPress={() =>
                Alert.alert("Xác nhận", "Bạn có muốn rời nhóm này?")
              }
            />
          ) : (
            <>
              <MenuItem
                icon="trash-outline"
                title="Xóa lịch sử trò chuyện"
                isDestructive
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ==========================================
// 2. STYLES ĐỘNG TÙY BIẾN THEO THEME
// ==========================================
const getStyles = (COLORS: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: COLORS.card,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: COLORS.foreground,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    sectionHeader: {
      backgroundColor: COLORS.card,
      alignItems: "center",
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    avatarBig: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: COLORS.primary,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarBigText: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#FFFFFF",
    },
    chatName: {
      fontSize: 20,
      fontWeight: "700",
      color: COLORS.foreground,
      marginBottom: 20,
    },
    quickActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 24,
    },
    actionBtn: {
      alignItems: "center",
      width: 70,
    },
    actionIconBg: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.muted,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    },
    actionLabel: {
      fontSize: 12,
      color: COLORS.mutedForeground,
      textAlign: "center",
    },
    section: {
      backgroundColor: COLORS.card,
      marginTop: 8,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: COLORS.border,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 0.5,
      borderBottomColor: COLORS.border,
    },
    menuLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    menuTextContainer: {
      marginLeft: 14,
      flex: 1,
    },
    menuTitle: {
      fontSize: 16,
      color: COLORS.foreground,
    },
    menuSubtitle: {
      fontSize: 13,
      color: COLORS.mutedForeground,
      marginTop: 2,
    },
  });

export default ChatDetailsScreen;
