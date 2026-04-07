import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  StatusBar,
  Modal,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Button, Input } from "../components/ui";
import { getMeApi, updateMeApi, uploadAvatarApi } from "../apis/user.api";
import { clearAuthData } from "../utils/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../apis/api";
import { friendApi } from "../apis/friends.api";
import { getConversations } from "../apis/chat.api";
import { useFocusEffect } from "@react-navigation/native";
import { profileStatsEvents } from "../utils/profileStats.events";

// BƯỚC QUAN TRỌNG: Import useTheme từ Context
import { useTheme } from "../contexts/ThemeContext";

// ✅ FIX BADGE: Import useChatContext để reset badge khi logout
import { useChatContext } from "../contexts/ChatContext";

interface Props {
  navigation: any;
  onLogout: () => void;
}

const darkTheme = {
  background: "#070B1A",
  card: "#11182D",
  cardSoft: "#0D1428",
  border: "#1E2946",
  textPrimary: "#F8FAFC",
  textSecondary: "#9CA3AF",
  accent: "#7C3AED",
  accentAlt: "#A855F7",
  danger: "#EF4444",
};

const lightTheme = {
  background: "#F5F7FB",
  card: "#FFFFFF",
  cardSoft: "#EEF2FF",
  border: "#E2E8F0",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  accent: "#6366F1",
  accentAlt: "#8B5CF6",
  danger: "#EF4444",
};

const ProfileScreen = ({ navigation, onLogout }: Props) => {
  // Lấy trạng thái Theme từ Global Context thay vì useState
  const { isDarkMode, setIsDarkMode } = useTheme();

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [profile, setProfile] = useState({
    displayName: "",
    userName: "",
    bio: "",
    avatar: "https://via.placeholder.com/150",
    date_of_birth: "",
    show_date_of_birth: true,
  });
  const [editDraft, setEditDraft] = useState({
    userName: "",
    bio: "",
    avatar: "https://via.placeholder.com/150",
    dateOfBirth: "",
    showDateOfBirth: true,
  });
  const [stats, setStats] = useState({
    friends: 0,
    groups: 0,
  });

  const colors = useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode],
  );
  // ✅ FIX BADGE: Lấy hàm reset từ ChatContext
  const { resetChatContext } = useChatContext();

  const formatDate = (date: Date) => {
    const day = `${date.getDate()}`.padStart(2, "0");
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const toIsoDate = (value?: string) => {
    if (!value) return undefined;
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return undefined;
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd)).toISOString();
  };

  const formatDateFromApi = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return formatDate(date);
  };

  const applyProfileFromApi = (data: any) => {
    if (!data) return;
    const nextProfile = {
      displayName: data.displayName || "",
      userName: data.userName || "",
      bio: data.bio || "",
      avatar: data.avatar || "https://via.placeholder.com/150",
      date_of_birth: data.date_of_birth || "",
      show_date_of_birth: data.show_date_of_birth ?? true,
    };
    setProfile(nextProfile);
    setEditDraft({
      userName: nextProfile.userName,
      bio: nextProfile.bio,
      avatar: nextProfile.avatar,
      dateOfBirth: formatDateFromApi(nextProfile.date_of_birth),
      showDateOfBirth: nextProfile.show_date_of_birth,
    });
  };

  const fetchGroupCount = async () => {
    const limit = 50;
    let page = 1;
    let totalGroups = 0;

    while (true) {
      const res = await getConversations(page, limit);
      const conversations = Array.isArray(res.data?.result)
        ? res.data.result
        : [];

      totalGroups += conversations.filter(
        (item: any) => item?.type === "group",
      ).length;

      if (conversations.length < limit) {
        break;
      }
      page += 1;
      if (page > 20) {
        break;
      }
    }

    return totalGroups;
  };

  const fetchData = useCallback(async () => {
    try {
      const [meRes, friendsRes, groupsCount] = await Promise.all([
        getMeApi(),
        friendApi.getFriends(),
        fetchGroupCount(),
      ]);

      const user = meRes.data?.result || meRes.data?.user;
      const friends = Array.isArray(friendsRes.data?.result)
        ? friendsRes.data.result
        : [];

      if (user) {
        applyProfileFromApi(user);
      }

      setStats({
        friends: friends.length,
        groups: groupsCount,
      });
    } catch (error) {
      console.error("Lỗi load profile:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  useEffect(() => {
    const unsubscribe = profileStatsEvents.subscribe((event) => {
      if (event.type === "friends_delta") {
        setStats((prev) => ({
          ...prev,
          friends: Math.max(0, prev.friends + event.delta),
        }));
        return;
      }

      if (event.type === "groups_delta") {
        setStats((prev) => ({
          ...prev,
          groups: Math.max(0, prev.groups + event.delta),
        }));
        return;
      }

      if (event.type === "stats_refresh") {
        fetchData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  const pickImage = async (target: "profile" | "edit" = "profile") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      try {
        setUploadingAvatar(true);
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append("avatar", {
          uri: asset.uri,
          name: asset.fileName || `avatar-${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        } as any);

        const uploadRes = await uploadAvatarApi(formData);
        const avatarUrl =
          uploadRes.data?.result?.avatar || uploadRes.data?.avatar;

        if (!avatarUrl) {
          throw new Error("Không lấy được URL avatar sau khi upload");
        }

        await updateMeApi({ avatar: avatarUrl });

        setProfile((prev: any) => ({ ...prev, avatar: avatarUrl }));
        setEditDraft((prev) => ({ ...prev, avatar: avatarUrl }));

        if (target === "profile") {
          Alert.alert("Thành công", "Đã cập nhật ảnh đại diện");
        }
      } catch (error) {
        console.error("Lỗi upload avatar:", error);
        const errMsg =
          (error as any)?.response?.data?.message ||
          "Upload ảnh thất bại, vui lòng thử lại";
        Alert.alert("Lỗi", errMsg);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleSave = async (payload?: any) => {
    setLoading(true);
    try {
      const finalPayload = payload || profile;
      const body = {
        userName: finalPayload.userName,
        bio: finalPayload.bio,
        avatar: finalPayload.avatar,
        ...(finalPayload.dateOfBirth
          ? { date_of_birth: toIsoDate(finalPayload.dateOfBirth) }
          : {}),
        show_date_of_birth:
          finalPayload.showDateOfBirth ?? profile.show_date_of_birth,
      };

      const res = await updateMeApi(body);
      const user = res.data?.result || res.data?.user;
      if (user) {
        applyProfileFromApi(user);
      }
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
        resetChatContext();
        onLogout();
      }
    };

    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn thoát không?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: doLogout },
    ]);
  };

  const openEditModal = () => {
    setEditDraft({
      userName: profile.userName || "",
      bio: profile.bio || "",
      avatar: profile.avatar || "https://via.placeholder.com/150",
      dateOfBirth: formatDateFromApi(profile.date_of_birth),
      showDateOfBirth: profile.show_date_of_birth,
    });
    setShowDatePicker(false);
    setShowEditModal(true);
  };

  const toggleDobVisibility = async () => {
    const nextVisibility = !profile.show_date_of_birth;
    setProfile((prev) => ({ ...prev, show_date_of_birth: nextVisibility }));
    setEditDraft((prev) => ({ ...prev, showDateOfBirth: nextVisibility }));

    try {
      await updateMeApi({ show_date_of_birth: nextVisibility });
    } catch (error) {
      setProfile((prev) => ({ ...prev, show_date_of_birth: !nextVisibility }));
      setEditDraft((prev) => ({ ...prev, showDateOfBirth: !nextVisibility }));
      Alert.alert("Lỗi", "Không cập nhật được quyền hiển thị ngày sinh");
    }
  };

  const handleSaveFromModal = async () => {
    Keyboard.dismiss();
    const nextProfile = {
      ...profile,
      userName: editDraft.userName,
      bio: editDraft.bio,
      avatar: editDraft.avatar,
      dateOfBirth: editDraft.dateOfBirth,
      showDateOfBirth: editDraft.showDateOfBirth,
    };
    await handleSave(nextProfile);
    setShowDatePicker(false);
    setShowEditModal(false);
  };

  const parseDateString = (value: string) => {
    const match = value?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return new Date();
    const [, dd, mm, yyyy] = match;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(date.getTime()) ? new Date() : date;
  };

  const openDatePicker = () => {
    setTempDate(parseDateString(editDraft.dateOfBirth));
    setShowDatePicker(true);
  };

  const onChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "set" && selectedDate) {
      setTempDate(selectedDate);
      setEditDraft((prev) => ({
        ...prev,
        dateOfBirth: formatDate(selectedDate),
      }));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View
        style={[
          styles.hero,
          { backgroundColor: isDarkMode ? "#080D1F" : "#EDE9FE" },
        ]}
      >
        <View
          style={[
            styles.heroGlowOne,
            {
              backgroundColor: colors.accent,
              opacity: isDarkMode ? 0.35 : 0.2,
            },
          ]}
        />
        <View
          style={[
            styles.heroGlowTwo,
            {
              backgroundColor: colors.accentAlt,
              opacity: isDarkMode ? 0.28 : 0.2,
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => pickImage("profile")}
            style={styles.avatarContainer}
          >
            <View style={[styles.avatarRing, { borderColor: colors.accent }]}>
              <Image source={{ uri: profile.avatar }} style={styles.avatar} />
            </View>
            <View
              style={[
                styles.cameraBadge,
                { backgroundColor: colors.accentAlt },
              ]}
            >
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.nameText, { color: colors.textPrimary }]}>
            {profile.userName || "alexmorgan"}
          </Text>
          <Text style={[styles.handleText, { color: colors.textSecondary }]}>
            @{profile.userName || "alexmorgan"}
          </Text>
          <Text style={[styles.bioText, { color: colors.textSecondary }]}>
            {profile.bio || "Living the dream ✨"}
          </Text>
          <View style={styles.birthRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textSecondary}
            />
            <Text style={[styles.birthText, { color: colors.textSecondary }]}>
              {profile.show_date_of_birth
                ? formatDateFromApi(profile.date_of_birth) ||
                  "Chưa cập nhật ngày sinh"
                : "Ngày sinh đã ẩn"}
            </Text>
            <TouchableOpacity
              onPress={toggleDobVisibility}
              style={styles.birthEyeBtn}
            >
              <Ionicons
                name={
                  profile.show_date_of_birth ? "eye-outline" : "eye-off-outline"
                }
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: colors.cardSoft, borderColor: colors.border },
            ]}
            onPress={openEditModal}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={colors.accentAlt}
            />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={[
              styles.statBox,
              { backgroundColor: colors.cardSoft, borderColor: colors.border },
            ]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Contacts")}
          >
            <Text style={[styles.statCount, { color: colors.accentAlt }]}>
              {stats.friends}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.statBox,
              { backgroundColor: colors.cardSoft, borderColor: colors.border },
            ]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Chat", { initialTab: "groups" })}
          >
            <Text style={[styles.statCount, { color: colors.accentAlt }]}>
              {stats.groups}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Groups
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.darkModeCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.menuLeft}>
            <View
              style={[styles.iconBadge, { backgroundColor: colors.cardSoft }]}
            >
              <Ionicons
                name="moon-outline"
                size={18}
                color={colors.accentAlt}
              />
            </View>
            <View>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>
                Dark Mode
              </Text>
              <Text
                style={[styles.menuSubLabel, { color: colors.textSecondary }]}
              >
                {isDarkMode ? "Currently dark" : "Currently light"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={setIsDarkMode} // Kích hoạt đổi Global Theme
            trackColor={{ false: "#94A3B8", true: colors.accentAlt }}
            thumbColor={isDarkMode ? "#0F172A" : "#FFFFFF"}
          />
        </View>

        <View
          style={[
            styles.menuList,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <MenuOption
            icon="log-out-outline"
            label="Log Out"
            subtitle="Sign out from this device"
            color={colors.danger}
            subtitleColor={colors.textSecondary}
            iconBg={colors.cardSoft}
            iconColor={colors.danger}
            borderColor={colors.border}
            onPress={handleLogout}
            isLast
          />
        </View>
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowDatePicker(false);
          setShowEditModal(false);
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            Keyboard.dismiss();
            setShowDatePicker(false);
            setShowEditModal(false);
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKeyboardWrap}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Pressable
                style={[
                  styles.modalCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
                onPress={() => Keyboard.dismiss()}
              >
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowDatePicker(false);
                    setShowEditModal(false);
                  }}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                <Text style={[styles.modalTitle, { color: colors.accentAlt }]}>
                  Edit Profile
                </Text>

                <TouchableOpacity
                  style={styles.modalAvatarWrap}
                  onPress={() => pickImage("edit")}
                >
                  <View
                    style={[
                      styles.modalAvatarRing,
                      { borderColor: colors.accent },
                    ]}
                  >
                    <Image
                      source={{ uri: editDraft.avatar }}
                      style={styles.modalAvatar}
                    />
                  </View>
                  <View
                    style={[
                      styles.modalCameraBadge,
                      {
                        backgroundColor: colors.accentAlt,
                        borderColor: colors.card,
                      },
                    ]}
                  >
                    {uploadingAvatar ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={15} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>

                <Input
                  label="Username"
                  value={editDraft.userName}
                  onChangeText={(text) =>
                    setEditDraft((prev) => ({ ...prev, userName: text }))
                  }
                  labelStyle={[
                    styles.modalLabel,
                    { color: colors.textPrimary },
                  ]}
                  inputStyle={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.cardSoft,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Your username"
                  placeholderTextColor={colors.textSecondary}
                />

                <Input
                  label="Bio"
                  value={editDraft.bio}
                  onChangeText={(text) =>
                    setEditDraft((prev) => ({ ...prev, bio: text }))
                  }
                  labelStyle={[
                    styles.modalLabel,
                    { color: colors.textPrimary },
                  ]}
                  inputStyle={[
                    styles.modalInput,
                    styles.modalBioInput,
                    {
                      backgroundColor: colors.cardSoft,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />

                <View style={styles.dateBlock}>
                  <Text
                    style={[styles.modalLabel, { color: colors.textPrimary }]}
                  >
                    Date of Birth
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dateInputWrap,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.cardSoft,
                      },
                    ]}
                    onPress={openDatePicker}
                    activeOpacity={0.85}
                  >
                    <TextInput
                      value={editDraft.dateOfBirth}
                      placeholder="dd/mm/yyyy"
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.dateInput, { color: colors.textPrimary }]}
                      editable={false}
                      pointerEvents="none"
                    />
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.visibilityRow}>
                  <View style={styles.visibilityLabelWrap}>
                    <Ionicons
                      name={
                        editDraft.showDateOfBirth
                          ? "eye-outline"
                          : "eye-off-outline"
                      }
                      size={18}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.visibilityLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Hiển thị ngày sinh cho người khác
                    </Text>
                  </View>
                  <Switch
                    value={editDraft.showDateOfBirth}
                    onValueChange={(value) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        showDateOfBirth: value,
                      }))
                    }
                    trackColor={{ false: "#CBD5E1", true: colors.accentAlt }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {showDatePicker && Platform.OS === "ios" && (
                  <View
                    style={[
                      styles.inlineDatePickerWrap,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.inlineDatePickerHeader,
                        {
                          backgroundColor: colors.card,
                          borderBottomColor: colors.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text
                          style={[
                            styles.datePickerText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          Hủy
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditDraft((prev) => ({
                            ...prev,
                            dateOfBirth: formatDate(tempDate),
                          }));
                          setShowDatePicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.datePickerText,
                            styles.datePickerDone,
                            { color: colors.accentAlt },
                          ]}
                        >
                          Xong
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={tempDate}
                      mode="date"
                      display="spinner"
                      onChange={(_, selectedDate) => {
                        if (selectedDate) setTempDate(selectedDate);
                      }}
                      maximumDate={new Date()}
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSaveFromModal}
                  activeOpacity={0.9}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[colors.accent, colors.accentAlt, "#D946EF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveButton}
                  >
                    <Text style={styles.modalSaveText}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Pressable>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {showDatePicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};

const MenuOption = ({
  icon,
  label,
  subtitle,
  color = "#1e293b",
  subtitleColor = "#64748b",
  iconBg = "#EEF2FF",
  iconColor = "#6366f1",
  borderColor = "#f1f5f9",
  onPress,
  isLast = false,
}: any) => (
  <TouchableOpacity
    style={[
      styles.menuItem,
      { borderBottomColor: borderColor },
      isLast && { borderBottomWidth: 0 },
    ]}
    onPress={onPress}
  >
    <View style={styles.menuLeft}>
      <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        {!!subtitle && (
          <Text style={[styles.menuSubLabel, { color: subtitleColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroGlowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    top: 10,
    right: 10,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: 70,
    left: -20,
  },
  container: { flex: 1 },
  content: { paddingTop: 46, paddingBottom: 28 },
  header: { alignItems: "center", paddingVertical: 18, paddingHorizontal: 18 },
  avatarContainer: { position: "relative" },
  avatarRing: {
    borderWidth: 2,
    borderRadius: 58,
    padding: 3,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    padding: 6,
    borderRadius: 15,
  },
  nameText: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 12,
    letterSpacing: 0.2,
  },
  handleText: { fontSize: 16, marginTop: 2 },
  bioText: {
    fontSize: 15,
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 14,
  },
  birthRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  birthText: {
    fontSize: 13,
  },
  birthEyeBtn: {
    marginLeft: 4,
    padding: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 18,
  },
  actionButton: {
    flex: 1,
    height: 58,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionText: { fontSize: 17, fontWeight: "700" },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 12,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 14,
  },
  statCount: { fontSize: 30, fontWeight: "800", lineHeight: 34 },
  statLabel: { fontSize: 14, marginTop: 4 },
  darkModeCard: {
    marginTop: 12,
    marginHorizontal: 18,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuList: {
    marginHorizontal: 18,
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 16, fontWeight: "700" },
  menuSubLabel: { fontSize: 13, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  modalKeyboardWrap: {
    width: "100%",
  },
  modalCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 26,
    padding: 20,
  },
  closeButton: {
    position: "absolute",
    right: 14,
    top: 12,
    zIndex: 2,
    padding: 4,
  },
  modalTitle: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
    color: "#7C3AED",
    marginTop: 6,
    marginBottom: 12,
  },
  modalAvatarWrap: {
    alignSelf: "center",
    marginBottom: 12,
    position: "relative",
  },
  modalAvatarRing: {
    borderWidth: 3,
    borderColor: "#4F46E5",
    padding: 2,
    borderRadius: 45,
  },
  modalAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  modalCameraBadge: {
    position: "absolute",
    right: -4,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#A855F7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F8FAFC",
  },
  modalLabel: {
    color: "#1F2937",
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: "#F3F4F6",
    borderColor: "#D1D5DB",
    color: "#111827",
    borderRadius: 24,
    height: 54,
    fontSize: 16,
  },
  modalBioInput: {
    height: 120,
    textAlignVertical: "top",
    paddingTop: 14,
    paddingBottom: 12,
  },
  dateBlock: {
    marginTop: 2,
    marginBottom: 6,
  },
  visibilityRow: {
    marginTop: 8,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visibilityLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 12,
  },
  visibilityLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
  },
  dateInputWrap: {
    height: 54,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateInput: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    paddingVertical: 0,
  },
  inlineDatePickerWrap: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  inlineDatePickerHeader: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  datePickerText: {
    fontSize: 16,
    color: "#6B7280",
  },
  datePickerDone: {
    color: "#7C3AED",
    fontWeight: "700",
  },
  modalSaveButton: {
    marginTop: 6,
    borderRadius: 28,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
});

export default ProfileScreen;
