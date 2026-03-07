import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  Edit3,
  Bell,
  Settings,
  ChevronRight,
  Camera,
  UserSearch,
  LogOut,
  ShieldCheck,
  MessageSquare,
  HelpCircle,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../apis/api";

const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  foreground: "#1E293B",
  muted: "#94A3B8",
  white: "#FFFFFF",
  destructive: "#EF4444",
};

interface Props {
  navigation: any;
  onLogout: () => void;
}

export default function ProfileScreen({ navigation, onLogout }: Props) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ friends: 0, groups: 0, media: 0 });
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [userRes, friendsRes] = await Promise.all([
        api.get("/users/profile"),
        api.get("/friends/list"),
      ]);
      setUser(userRes.data.result);
      setStats({
        friends: friendsRes.data.result?.length || 0,
        groups: 12, // Dữ liệu giả lập theo ảnh mẫu
        media: 1200, // Dữ liệu giả lập theo ảnh mẫu
      });
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            // Gọi API với timeout ngắn để tránh chờ đợi lâu
            await api.post("/auth/logout", {}, { timeout: 3000 });
          } catch (e) {
            console.log("Logout API failed, forcing local logout...");
          } finally {
            // CỰC KỲ QUAN TRỌNG: Xóa sạch bộ nhớ và gọi callback điều hướng
            await AsyncStorage.clear();
            if (onLogout) onLogout();
          }
        },
      },
    ]);
  };
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  // - Tìm đến dòng định nghĩa initials trong ProfileScreen.tsx
  const initials = user?.fullName
    ? user.fullName.trim().charAt(0).toUpperCase()
    : "U"; // Mặc định là U nếu chưa load xong
  const MenuItem = ({
    icon: Icon,
    title,
    subtitle,
    onPress,
    isDestructive,
    hasSwitch,
  }: any) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      disabled={hasSwitch}
    >
      <View
        style={[
          styles.menuIconBox,
          isDestructive && { backgroundColor: "#FEE2E2" },
        ]}
      >
        <Icon
          size={20}
          color={isDestructive ? COLORS.destructive : COLORS.primary}
        />
      </View>
      <View style={styles.menuContent}>
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
      {hasSwitch ? (
        <Switch value={isDarkMode} onValueChange={setIsDarkMode} />
      ) : (
        <ChevronRight size={18} color={COLORS.muted} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <Edit3 size={22} color={COLORS.muted} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Bell size={22} color={COLORS.muted} />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarGradient}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <TouchableOpacity style={styles.cameraBtn}>
              <Camera size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.fullName || "Alex Morgan"}</Text>
          <Text style={styles.userHandle}>
            @{user?.userName || "alexmorgan"}
          </Text>
          <Text style={styles.userBio}>
            {user?.bio || "Living the dream ✨"}
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn}>
            <Edit3 size={18} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <UserSearch size={18} color={COLORS.primary} />
            <Text style={styles.actionBtnText}>Find Users</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.friends}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.groups}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.media >= 1000
                ? (stats.media / 1000).toFixed(1) + "K"
                : stats.media}
            </Text>
            <Text style={styles.statLabel}>Media</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon={Settings}
            title="Dark Mode"
            subtitle="Currently light"
            hasSwitch
          />
          <MenuItem
            icon={Bell}
            title="Notifications"
            subtitle="Message & call alerts"
          />
          <MenuItem
            icon={ShieldCheck}
            title="Privacy & Security"
            subtitle="Blocked users, 2FA"
          />
          <MenuItem
            icon={MessageSquare}
            title="Chat Settings"
            subtitle="Wallpaper, font size"
          />
          <MenuItem
            icon={HelpCircle}
            title="Help & Support"
            subtitle="FAQ, contact us"
          />
          <MenuItem
            icon={LogOut}
            title="Log Out"
            subtitle="Sign out of your account"
            isDestructive
            onPress={handleLogout}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: COLORS.secondary },
  headerIcons: { flexDirection: "row", gap: 15 },
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.destructive,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileInfo: { alignItems: "center", paddingVertical: 20 },
  avatarWrapper: { position: "relative" },
  avatarGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  avatarText: { fontSize: 28, fontWeight: "bold", color: COLORS.white },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginTop: 10,
  },
  userHandle: { fontSize: 14, color: COLORS.muted, marginBottom: 4 },
  userBio: { fontSize: 14, color: COLORS.muted },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 45,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 1,
  },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.foreground },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 15,
    marginBottom: 25,
  },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingVertical: 15,
    borderRadius: 20,
    alignItems: "center",
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: "bold", color: COLORS.secondary },
  statLabel: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
  menuSection: {
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 25,
    paddingVertical: 10,
    marginBottom: 30,
    elevation: 1,
  },
  menuItem: { flexDirection: "row", alignItems: "center", padding: 15 },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 16, fontWeight: "600", color: COLORS.foreground },
  menuSubtitle: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
