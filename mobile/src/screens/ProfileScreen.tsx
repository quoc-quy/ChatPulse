import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Input } from "../components/ui";
import { getMeApi, updateMeApi } from "../apis/user.api";
import { clearAuthData } from "../utils/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../apis/api";

interface Props {
  navigation: any;
  onLogout: () => void;
}

const ProfileScreen = ({ navigation, onLogout }: Props) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    displayName: "",
    userName: "",
    bio: "",
    avatar: "https://via.placeholder.com/150",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await getMeApi();
      if (res.data.result) {
        setProfile(res.data.result);
      }
    } catch (error) {
      console.error("Lỗi load profile:", error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfile({ ...profile, avatar: result.assets[0].uri });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMeApi(profile);
      Alert.alert("Thành công", "Đã cập nhật Profile!");
    } catch (error) {
      Alert.alert("Lỗi", "Cập nhật thất bại!");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      try {
        console.log("Bắt đầu quá trình Logout...");
        const accessToken = await AsyncStorage.getItem("access_token");
        const refreshToken = await AsyncStorage.getItem("refresh_token");

        console.log("Tokens:", { accessToken, refreshToken });

        const response = await api.post("/auth/logout", {
          refresh_token: refreshToken,
        });

        console.log("Logout API Response:", response.data);
      } catch (e: any) {
        console.error("Lỗi Logout API:", e.response?.data || e.message);
      } finally {
        await clearAuthData();
        onLogout();
      }
    };

    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: doLogout },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header & Avatar Wrapper */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          <Image source={{ uri: profile.avatar }} style={styles.avatar} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.nameText}>
          {profile.displayName || "User Name"}
        </Text>
        <Text style={styles.handleText}>@{profile.userName || "username"}</Text>
      </View>

      {/* Stats Section */}
      <View style={styles.statsRow}>
        <Card style={styles.statBox}>
          <Text style={styles.statCount}>248</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </Card>
        <Card style={styles.statBox}>
          <Text style={styles.statCount}>12</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </Card>
      </View>

      {/* Input Section */}
      <View style={styles.form}>
        <Input
          label="Display Name"
          value={profile.displayName}
          onChangeText={(text) => setProfile({ ...profile, displayName: text })}
        />
        <Input
          label="Bio"
          value={profile.bio}
          onChangeText={(text) => setProfile({ ...profile, bio: text })}
          multiline
        />
        <Button title="Save Profile" onPress={handleSave} loading={loading} />
      </View>

      {/* Menu List Section */}
      <View style={styles.menuList}>
        <MenuOption icon="notifications-outline" label="Notifications" />
        <MenuOption
          icon="shield-checkmark-outline"
          label="Privacy & Security"
        />
        <MenuOption
          icon="log-out-outline"
          label="Log Out"
          color="#ef4444"
          onPress={handleLogout} // ✅ This now works because MenuOption accepts & uses onPress
        />
      </View>
    </ScrollView>
  );
};

// ✅ FIX: Added `onPress` to props and passed it to TouchableOpacity
const MenuOption = ({ icon, label, color = "#1e293b", onPress }: any) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuLeft}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", marginTop: 50 },
  header: { alignItems: "center", paddingVertical: 30 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#6366f1",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#6366f1",
    padding: 6,
    borderRadius: 15,
  },
  nameText: { fontSize: 22, fontWeight: "bold", marginTop: 10 },
  handleText: { color: "#64748b", fontSize: 14 },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 15 },
  statBox: { flex: 1, alignItems: "center" },
  statCount: { fontSize: 18, fontWeight: "bold", color: "#6366f1" },
  statLabel: { color: "#64748b", fontSize: 12 },
  form: { padding: 20 },
  menuList: { paddingHorizontal: 20, paddingBottom: 40 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 15 },
  menuLabel: { fontSize: 16, fontWeight: "500" },
});

export default ProfileScreen;
