import React, { useState, useEffect, useCallback, useMemo } from "react";
import QRCode from "react-native-qrcode-svg";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
  Modal,
  FlatList,
  TextInput,
  Linking,
  Pressable,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../contexts/ThemeContext";
import { profileStatsEvents } from "../utils/profileStats.events";

import {
  getConversationDetail,
  leaveGroup,
  kickMember,
  promoteAdmin,
  muteConversation,
  getMediaFiles,
  getSharedLinks,
  renameGroup,
  updateGroupAvatar,
  uploadGroupAvatarApi,
  disbandGroup,
} from "../apis/chat.api";
import { friendApi } from "../apis/friends.api";

// ── Color Palettes (đồng nhất với ChatScreen) ────────────────────────────────
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
  sectionBg: "hsl(240, 20%, 96%)",
  success: "#34C759",
  adminBadgeBg: "#EEF2FF",
  adminBadgeText: "hsl(230, 85%, 60%)",
  white: "#FFFFFF",
};

const darkColors = {
  background: "hsl(240, 25%, 7%)",
  foreground: "hsl(240, 20%, 98%)",
  card: "hsl(240, 25%, 10%)",
  primary: "hsl(230, 85%, 65%)",
  secondary: "hsl(270, 75%, 60%)",
  muted: "hsl(240, 20%, 18%)",
  mutedForeground: "hsl(240, 10%, 65%)",
  destructive: "hsl(0, 62%, 55%)",
  border: "hsl(240, 20%, 18%)",
  sectionBg: "hsl(240, 25%, 5%)",
  success: "#34C759",
  adminBadgeBg: "hsl(230, 40%, 20%)",
  adminBadgeText: "hsl(230, 85%, 65%)",
  white: "#FFFFFF",
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  size = 52,
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

// ── MemberItem ────────────────────────────────────────────────────────────────
const MemberItem = ({
  member,
  isCurrentUser,
  currentUserIsAdmin,
  COLORS,
  onKick,
  onPromote,
}: any) => {
  const name =
    member.fullName || member.userName || member.username || "Thành viên";
  const role = member.role;

  const handleLongPress = () => {
    if (!currentUserIsAdmin || isCurrentUser || role === "admin") return;
    Alert.alert(name, "Chọn hành động", [
      {
        text: "Thăng lên Admin",
        onPress: () => onPromote(member._id || member.userId),
      },
      {
        text: "Xóa khỏi nhóm",
        style: "destructive",
        onPress: () => onKick(member._id || member.userId, name),
      },
      { text: "Hủy", style: "cancel" },
    ]);
  };

  return (
    <TouchableOpacity
      style={[styles.memberItem, { borderBottomColor: COLORS.border }]}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <Avatar name={name} size={44} bgColor={COLORS.secondary} />
      <View style={styles.memberInfo}>
        <Text
          style={[styles.memberName, { color: COLORS.foreground }]}
          numberOfLines={1}
        >
          {name}
          {isCurrentUser ? " (Bạn)" : ""}
        </Text>
        {member.phone && (
          <Text style={[styles.memberSub, { color: COLORS.mutedForeground }]}>
            {member.phone}
          </Text>
        )}
      </View>
      {role === "admin" && (
        <View
          style={[styles.adminBadge, { backgroundColor: COLORS.adminBadgeBg }]}
        >
          <Ionicons
            name="shield-checkmark"
            size={11}
            color={COLORS.adminBadgeText}
          />
          <Text
            style={[styles.adminBadgeText, { color: COLORS.adminBadgeText }]}
          >
            Admin
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── MenuRow ───────────────────────────────────────────────────────────────────
const MenuRow = ({
  iconName,
  iconLib = "ionicons",
  label,
  onPress,
  danger = false,
  rightElement,
  COLORS,
}: {
  iconName: string;
  iconLib?: "ionicons" | "feather";
  label: string;
  onPress?: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
  COLORS: any;
}) => {
  const iconColor = danger ? COLORS.destructive : COLORS.mutedForeground;
  const IconComponent = iconLib === "feather" ? Feather : Ionicons;

  return (
    <TouchableOpacity
      style={[styles.menuRow, { borderTopColor: COLORS.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuRowLeft}>
        <IconComponent name={iconName as any} size={22} color={iconColor} />
        <Text
          style={[
            styles.menuRowLabel,
            { color: danger ? COLORS.destructive : COLORS.foreground },
          ]}
        >
          {label}
        </Text>
      </View>
      {rightElement !== undefined ? (
        rightElement
      ) : (
        <Feather
          name="chevron-right"
          size={20}
          color={COLORS.mutedForeground}
        />
      )}
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ConversationDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id: conversationId, name: routeName, isGroup } = route.params || {};

  const { isDarkMode } = useTheme();
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [muteEnabled, setMuteEnabled] = useState(false);
  const [muteSaving, setMuteSaving] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [leavingAfterTransfer, setLeavingAfterTransfer] = useState(false);
  const [showGroupQRModal, setShowGroupQRModal] = useState(false);

  // ── Đổi tên nhóm ──
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // ── Avatar nhóm ──
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // ── Media & Links ──
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showLinksModal, setShowLinksModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [sharedLinks, setSharedLinks] = useState<any[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [linksLoading, setLinksLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("access_token").then((token) => {
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          const uid = decoded.user_id || decoded._id || decoded.id || "";
          setCurrentUserId(uid);
        } catch {}
      }
    });
  }, []);

  const fetchDetail = useCallback(
    async (isRefreshing = false) => {
      try {
        if (isRefreshing) setRefreshing(true);
        else setLoading(true);
        const res = await getConversationDetail(conversationId);
        const conv = res.data.result;
        setConversation(conv);
      } catch {
        Alert.alert("Lỗi", "Không thể tải thông tin hội thoại");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [conversationId, currentUserId],
  );

  const onRefresh = useCallback(() => fetchDetail(true), [fetchDetail]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Sync trạng thái mute
  useEffect(() => {
    if (!conversation || !currentUserId) return;
    const myMeta = (conversation.members || []).find(
      (m: any) => m.userId?.toString() === currentUserId,
    );
    if (myMeta?.hasMuted !== undefined) {
      setMuteEnabled(myMeta.hasMuted);
    }
  }, [conversation, currentUserId]);

  // Sync avatar từ conversation
  useEffect(() => {
    if (conversation?.avatarUrl) {
      setGroupAvatar(conversation.avatarUrl);
    }
  }, [conversation]);

  // Derived
  const isGroupChat = conversation?.type === "group" || isGroup;
  const chatName = isGroupChat
    ? conversation?.name || routeName || "Nhóm"
    : routeName || "Người dùng";
  const members: any[] = useMemo(() => {
    const infos: any[] = conversation?.participants_info || [];
    const membersMeta: any[] = conversation?.members || [];
    return infos.map((p: any) => {
      const pid = (p._id || "").toString();
      const meta = membersMeta.find(
        (m: any) => (m.userId?.toString?.() || m._id?.toString?.()) === pid,
      );
      return {
        ...p,
        role:
          meta?.role ||
          (pid === conversation?.admin_id?.toString?.() ? "admin" : "member"),
      };
    });
  }, [conversation]);
  const adminId = conversation?.admin_id?.toString?.() || "";
  const currentUserIsAdmin = adminId === currentUserId;

  // ── Actions ──────────────────────────────────────────────────────────────

  const doLeaveGroup = useCallback(async () => {
    try {
      await leaveGroup(conversationId);
      profileStatsEvents.emit({ type: "groups_delta", delta: -1 });
      navigation.popToTop();
    } catch {
      Alert.alert("Lỗi", "Không thể rời nhóm lúc này.");
    }
  }, [conversationId, navigation]);

  const handleTransferAndLeave = useCallback(
    async (newAdminId: string) => {
      setTransferring(true);
      try {
        await promoteAdmin(conversationId, newAdminId);
        setShowTransferModal(false);
        setLeavingAfterTransfer(true);
        await new Promise((r) => setTimeout(r, 400));
        await doLeaveGroup();
      } catch {
        Alert.alert("Lỗi", "Không thể chuyển quyền nhóm trưởng.");
      } finally {
        setTransferring(false);
        setLeavingAfterTransfer(false);
      }
    },
    [conversationId, doLeaveGroup],
  );

  const handleLeaveGroup = () => {
    if (currentUserIsAdmin) {
      const otherMembers = members.filter(
        (m: any) => (m._id || m.userId || "").toString() !== currentUserId,
      );
      if (otherMembers.length === 0) {
        Alert.alert(
          "Rời nhóm",
          "Bạn là thành viên duy nhất. Rời nhóm sẽ xóa nhóm này.",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Rời & Xóa nhóm",
              style: "destructive",
              onPress: doLeaveGroup,
            },
          ],
        );
      } else {
        Alert.alert(
          "Chuyển quyền nhóm trưởng",
          "Bạn là nhóm trưởng. Vui lòng chọn 1 thành viên để chuyển quyền trước khi rời nhóm.",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Chọn thành viên",
              onPress: () => setShowTransferModal(true),
            },
          ],
        );
      }
    } else {
      Alert.alert("Rời nhóm", "Bạn có chắc muốn rời khỏi nhóm này không?", [
        { text: "Hủy", style: "cancel" },
        { text: "Rời nhóm", style: "destructive", onPress: doLeaveGroup },
      ]);
    }
  };
  const handleDisbandGroup = () => {
    Alert.alert(
      "Giải tán nhóm",
      "Toàn bộ tin nhắn và dữ liệu nhóm sẽ bị xóa vĩnh viễn. Bạn có chắc chắn?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Giải tán",
          style: "destructive",
          onPress: async () => {
            try {
              await disbandGroup(conversationId);
              profileStatsEvents.emit({ type: "groups_delta", delta: -1 });
              navigation.popToTop();
            } catch {
              Alert.alert("Lỗi", "Không thể giải tán nhóm lúc này.");
            }
          },
        },
      ],
    );
  };

  const handleKickMember = (memberId: string, memberName: string) => {
    Alert.alert("Xóa thành viên", `Xóa ${memberName} khỏi nhóm?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await kickMember(conversationId, memberId);
            fetchDetail();
          } catch {
            Alert.alert("Lỗi", "Không thể xóa thành viên.");
          }
        },
      },
    ]);
  };

  const handlePromoteAdmin = (memberId: string) => {
    Alert.alert("Thăng Admin", "Thăng thành viên này lên Admin?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Thăng cấp",
        onPress: async () => {
          try {
            await promoteAdmin(conversationId, memberId);
            fetchDetail();
          } catch {
            Alert.alert("Lỗi", "Không thể thăng cấp.");
          }
        },
      },
    ]);
  };

  // ── Tắt/bật thông báo ────────────────────────────────────────────────────
  const handleToggleMute = async (value: boolean) => {
    setMuteEnabled(value);
    setMuteSaving(true);
    try {
      await muteConversation(conversationId, value);
    } catch {
      setMuteEnabled(!value);
      Alert.alert("Lỗi", "Không thể thay đổi cài đặt thông báo.");
    } finally {
      setMuteSaving(false);
    }
  };

  // ── Đổi tên nhóm ────────────────────────────────────────────────────────
  const openRenameModal = () => {
    setRenameText(conversation?.name || "");
    setShowRenameModal(true);
  };

  const handleRenameGroup = async () => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      Alert.alert("Lỗi", "Tên nhóm không được để trống.");
      return;
    }
    if (trimmed === conversation?.name) {
      setShowRenameModal(false);
      return;
    }
    setRenameLoading(true);
    try {
      await renameGroup(conversationId, trimmed);
      setShowRenameModal(false);
      fetchDetail();
    } catch {
      Alert.alert("Lỗi", "Không thể đổi tên nhóm.");
    } finally {
      setRenameLoading(false);
    }
  };

  const handleChangeAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    setAvatarUploading(true);
    try {
      // Upload file lên S3 và update avatar nhóm trong 1 request
      const res = await uploadGroupAvatarApi(
        conversationId,
        result.assets[0].uri,
      );
      //const newAvatarUrl = res.data?.result?.avatarUrl;
      const newAvatarUrl = res.data?.result?.avatarUrl;

      // Thêm dòng này để xem response trả về gì
      console.log("Avatar upload response:", JSON.stringify(res.data));
      setGroupAvatar(newAvatarUrl);
      await fetchDetail();
      Alert.alert("Thành công", "Đã cập nhật ảnh nhóm");
    } catch {
      Alert.alert("Lỗi", "Không thể cập nhật ảnh nhóm");
    } finally {
      setAvatarUploading(false);
    }
  };
  // ── Ảnh/Video/File ───────────────────────────────────────────────────────
  const openMediaModal = async () => {
    setShowMediaModal(true);
    if (mediaFiles.length > 0) return;
    setMediaLoading(true);
    try {
      const res = await getMediaFiles(conversationId);
      setMediaFiles(res.data?.result || []);
    } catch {
      Alert.alert("Lỗi", "Không thể tải danh sách media.");
    } finally {
      setMediaLoading(false);
    }
  };

  // ── Link đã chia sẻ ──────────────────────────────────────────────────────
  const openLinksModal = async () => {
    setShowLinksModal(true);
    if (sharedLinks.length > 0) return;
    setLinksLoading(true);
    try {
      const res = await getSharedLinks(conversationId);
      setSharedLinks(res.data?.result || []);
    } catch {
      Alert.alert("Lỗi", "Không thể tải danh sách link.");
    } finally {
      setLinksLoading(false);
    }
  };

  const extractUrl = (text: string): string => {
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : text;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: COLORS.background }]}
      >
        <View
          style={[
            styles.headerBar,
            {
              backgroundColor: COLORS.card,
              borderBottomColor: COLORS.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Feather name="arrow-left" size={24} color={COLORS.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: COLORS.foreground }]}>
            Tùy chọn
          </Text>
          <View style={{ width: 32 }} />
        </View>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: COLORS.background }]}
    >
      {/* Header */}
      <View
        style={[
          styles.headerBar,
          { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: COLORS.foreground }]}>
          Tùy chọn
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── Hero ── */}
        <View
          style={[
            styles.heroSection,
            {
              backgroundColor: COLORS.card,
              borderBottomColor: COLORS.border,
            },
          ]}
        >
          {/* Avatar — tất cả thành viên trong nhóm đều có thể nhấn để đổi ảnh */}
          <TouchableOpacity
            onPress={isGroupChat ? handleChangeAvatar : undefined}
            activeOpacity={isGroupChat ? 0.8 : 1}
            disabled={avatarUploading}
          >
            <View style={{ position: "relative" }}>
              {isGroupChat && groupAvatar ? (
                <Image
                  source={{ uri: groupAvatar }}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                />
              ) : (
                <Avatar
                  name={chatName}
                  size={80}
                  bgColor={isGroupChat ? COLORS.secondary : COLORS.primary}
                />
              )}

              {/* Icon camera overlay — hiện với tất cả thành viên nhóm */}
              {isGroupChat && (
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    backgroundColor: avatarUploading
                      ? COLORS.mutedForeground
                      : COLORS.primary,
                    borderRadius: 12,
                    width: 24,
                    height: 24,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 2,
                    borderColor: COLORS.card,
                  }}
                >
                  {avatarUploading ? (
                    <ActivityIndicator size={10} color="#FFF" />
                  ) : (
                    <Ionicons name="camera" size={12} color="#FFF" />
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.heroName, { color: COLORS.foreground }]}>
            {chatName}
          </Text>
          {isGroupChat && (
            <Text style={[styles.heroSub, { color: COLORS.mutedForeground }]}>
              {members.length} thành viên
            </Text>
          )}
        </View>

        {/* ── Quick Actions ── */}
        <View
          style={[
            styles.quickActions,
            {
              backgroundColor: COLORS.card,
              borderBottomColor: COLORS.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() =>
              navigation.navigate("MessageSearchScreen", {
                conversationId,
                conversationName: chatName,
                isGroup: isGroupChat,
              })
            }
          >
            <View style={[styles.quickIcon, { backgroundColor: COLORS.muted }]}>
              <Ionicons
                name="search-outline"
                size={20}
                color={COLORS.foreground}
              />
            </View>
            <Text
              style={[styles.quickLabel, { color: COLORS.mutedForeground }]}
            >
              Tìm tin{"\n"}nhắn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => handleToggleMute(!muteEnabled)}
          >
            <View style={[styles.quickIcon, { backgroundColor: COLORS.muted }]}>
              <Ionicons
                name={
                  muteEnabled
                    ? "notifications-off-outline"
                    : "notifications-outline"
                }
                size={20}
                color={COLORS.foreground}
              />
            </View>
            <Text
              style={[styles.quickLabel, { color: COLORS.mutedForeground }]}
            >
              {muteEnabled ? "Đã tắt" : "Tắt TB"}
            </Text>
          </TouchableOpacity>

          {isGroupChat ? (
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() =>
                navigation.navigate("AddMemberScreen", {
                  conversationId,
                  existingMemberIds: members.map((m: any) =>
                    (m._id || m.userId || "").toString(),
                  ),
                })
              }
            >
              <View
                style={[styles.quickIcon, { backgroundColor: COLORS.muted }]}
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={COLORS.foreground}
                />
              </View>
              <Text
                style={[styles.quickLabel, { color: COLORS.mutedForeground }]}
              >
                Thêm{"\n"}người
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.quickBtn}
              onPress={() => {
                const otherUser = members.find(
                  (m: any) =>
                    (m._id || m.userId || "").toString() !== currentUserId,
                );
                if (otherUser) {
                  navigation.navigate("UserProfile", {
                    userId: (
                      otherUser._id ||
                      otherUser.userId ||
                      ""
                    ).toString(),
                    userName:
                      otherUser.fullName ||
                      otherUser.userName ||
                      otherUser.username ||
                      "Người dùng",
                    userPhone: otherUser.phone || "",
                    userEmail: otherUser.email || "",
                  });
                }
              }}
            >
              <View
                style={[styles.quickIcon, { backgroundColor: COLORS.muted }]}
              >
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.foreground}
                />
              </View>
              <Text
                style={[styles.quickLabel, { color: COLORS.mutedForeground }]}
              >
                Trang{"\n"}cá nhân
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Thành viên (chỉ group) ── */}
        {isGroupChat && (
          <>
            <View style={[styles.section, { backgroundColor: COLORS.card }]}>
              <TouchableOpacity
                style={[
                  styles.sectionHeaderRow,
                  { borderBottomColor: COLORS.border },
                ]}
                onPress={() =>
                  navigation.navigate("MembersScreen", {
                    conversationId,
                    members,
                    adminId,
                    currentUserId,
                  })
                }
              >
                <View style={styles.menuRowLeft}>
                  <Ionicons
                    name="people-outline"
                    size={22}
                    color={COLORS.mutedForeground}
                  />
                  <Text
                    style={[styles.menuRowLabel, { color: COLORS.foreground }]}
                  >
                    Xem thành viên ({members.length})
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={COLORS.mutedForeground}
                />
              </TouchableOpacity>

              {members.length > 3 && (
                <TouchableOpacity
                  style={[styles.viewAllBtn, { borderTopColor: COLORS.border }]}
                  onPress={() =>
                    navigation.navigate("MembersScreen", {
                      conversationId,
                      members,
                      adminId,
                      currentUserId,
                    })
                  }
                ></TouchableOpacity>
              )}
            </View>

            <View
              style={[styles.divider, { backgroundColor: COLORS.sectionBg }]}
            />

            <View style={[styles.section, { backgroundColor: COLORS.card }]}>
              {/* <MenuRow
                iconName="person-add-outline"
                label="Thêm thành viên"
                COLORS={COLORS}
                onPress={() =>
                  navigation.navigate("AddMemberScreen", {
                    conversationId,
                    existingMemberIds: members.map((m: any) =>
                      (m._id || m.userId || "").toString(),
                    ),
                  })
                }
              /> */}
              <MenuRow
                iconName="pencil-outline"
                label="Đổi tên nhóm"
                COLORS={COLORS}
                onPress={openRenameModal}
              />
            </View>

            <View
              style={[styles.divider, { backgroundColor: COLORS.sectionBg }]}
            />
          </>
        )}

        {/* ── Media & Files ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          {/* ✅ Thêm điều kiện isGroupChat ở đây */}
          {isGroupChat && (
            <MenuRow
              iconName="qr-code-outline"
              label="Mã QR nhóm"
              COLORS={COLORS}
              onPress={() => setShowGroupQRModal(true)}
            />
          )}

          <MenuRow
            iconName="image-outline"
            label="Ảnh, video, file đã gửi"
            COLORS={COLORS}
            onPress={openMediaModal}
          />
          <MenuRow
            iconName="link-outline"
            label="Link đã chia sẻ"
            COLORS={COLORS}
            onPress={openLinksModal}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Thông báo ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <MenuRow
            iconName="notifications-outline"
            label="Tắt thông báo"
            COLORS={COLORS}
            rightElement={
              <Switch
                value={muteEnabled}
                onValueChange={handleToggleMute}
                disabled={muteSaving}
                trackColor={{ false: COLORS.muted, true: COLORS.primary }}
                thumbColor={COLORS.white}
              />
            }
          />
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Nguy hiểm ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          {isGroupChat ? (
            <>
              <MenuRow
                iconName="log-out-outline"
                label="Rời nhóm"
                danger
                COLORS={COLORS}
                onPress={handleLeaveGroup}
                rightElement={null}
              />
              {currentUserIsAdmin && (
                <MenuRow
                  iconName="trash-outline"
                  label="Giải tán nhóm"
                  danger
                  COLORS={COLORS}
                  onPress={handleDisbandGroup}
                  rightElement={null}
                />
              )}
            </>
          ) : (
            <MenuRow
              iconName="ban-outline"
              label="Chặn người dùng"
              danger
              COLORS={COLORS}
              onPress={() => {
                const otherUser = members.find(
                  (m: any) =>
                    (m._id || m.userId || "").toString() !== currentUserId,
                );
                if (!otherUser) return;
                const otherUserId = (
                  otherUser._id ||
                  otherUser.userId ||
                  ""
                ).toString();
                const otherUserName =
                  otherUser.fullName || otherUser.userName || "người này";
                Alert.alert(
                  "Chặn người dùng",
                  `Bạn có chắc muốn chặn ${otherUserName}? Họ sẽ không thể gửi tin nhắn cho bạn.`,
                  [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Chặn",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await friendApi.blockUser(otherUserId);
                          Alert.alert(
                            "Đã chặn",
                            `Bạn đã chặn ${otherUserName}.`,
                            [
                              {
                                text: "OK",
                                onPress: () => {
                                  navigation.popToTop();
                                  navigation.navigate("BlockedUsers");
                                },
                              },
                            ],
                          );
                        } catch {
                          Alert.alert(
                            "Lỗi",
                            "Không thể chặn người dùng lúc này.",
                          );
                        }
                      },
                    },
                  ],
                );
              }}
              rightElement={null}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Modal: Đổi tên nhóm ──────────────────────────────────────────────── */}
      <Modal
        visible={showRenameModal}
        animationType="fade"
        transparent
        onRequestClose={() => !renameLoading && setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: COLORS.card }]}>
            <Text style={[styles.modalTitle, { color: COLORS.foreground }]}>
              Đổi tên nhóm
            </Text>
            <TextInput
              style={[
                styles.renameInput,
                {
                  color: COLORS.foreground,
                  backgroundColor: COLORS.background,
                  borderColor: COLORS.border,
                },
              ]}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Nhập tên nhóm mới..."
              placeholderTextColor={COLORS.mutedForeground}
              maxLength={50}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: COLORS.border }]}
                onPress={() => setShowRenameModal(false)}
                disabled={renameLoading}
              >
                <Text
                  style={{ color: COLORS.mutedForeground, fontWeight: "500" }}
                >
                  Hủy
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalBtnPrimary,
                  { backgroundColor: COLORS.primary },
                ]}
                onPress={handleRenameGroup}
                disabled={renameLoading}
              >
                {renameLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: "#FFF", fontWeight: "600" }}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal: Ảnh/Video/File ─────────────────────────────────────────────── */}
      <Modal
        visible={showMediaModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMediaModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: COLORS.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}
            >
              <TouchableOpacity onPress={() => setShowMediaModal(false)}>
                <Feather name="x" size={22} color={COLORS.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.foreground }]}>
                Ảnh, video, file đã gửi
              </Text>
              <View style={{ width: 22 }} />
            </View>

            {mediaLoading ? (
              <ActivityIndicator
                color={COLORS.primary}
                size="large"
                style={{ marginTop: 40 }}
              />
            ) : (
              <FlatList
                data={mediaFiles}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 32 }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="image-outline"
                      size={48}
                      color={COLORS.border}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: COLORS.mutedForeground },
                      ]}
                    >
                      Chưa có ảnh, video hoặc file nào
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const typeIcon =
                    item.type === "image"
                      ? "image-outline"
                      : item.type === "video"
                        ? "videocam-outline"
                        : "document-outline";
                  return (
                    <TouchableOpacity
                      style={[
                        styles.mediaItem,
                        { borderBottomColor: COLORS.border },
                      ]}
                      onPress={() =>
                        item.fileUrl && Linking.openURL(item.fileUrl)
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.mediaIcon,
                          { backgroundColor: COLORS.muted },
                        ]}
                      >
                        <Ionicons
                          name={typeIcon as any}
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.mediaName,
                            { color: COLORS.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {item.fileName || item.content || "Tệp đính kèm"}
                        </Text>
                        <Text
                          style={[
                            styles.mediaSub,
                            { color: COLORS.mutedForeground },
                          ]}
                        >
                          {item.sender?.userName || "Thành viên"} ·{" "}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : ""}
                        </Text>
                      </View>
                      <Feather
                        name="download"
                        size={18}
                        color={COLORS.mutedForeground}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Link đã chia sẻ ───────────────────────────────────────────── */}
      <Modal
        visible={showLinksModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLinksModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: COLORS.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}
            >
              <TouchableOpacity onPress={() => setShowLinksModal(false)}>
                <Feather name="x" size={22} color={COLORS.foreground} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.foreground }]}>
                Link đã chia sẻ
              </Text>
              <View style={{ width: 22 }} />
            </View>

            {linksLoading ? (
              <ActivityIndicator
                color={COLORS.primary}
                size="large"
                style={{ marginTop: 40 }}
              />
            ) : (
              <FlatList
                data={sharedLinks}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingBottom: 32 }}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="link-outline"
                      size={48}
                      color={COLORS.border}
                    />
                    <Text
                      style={[
                        styles.emptyText,
                        { color: COLORS.mutedForeground },
                      ]}
                    >
                      Chưa có link nào được chia sẻ
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const url = extractUrl(item.content || "");
                  return (
                    <TouchableOpacity
                      style={[
                        styles.linkItem,
                        { borderBottomColor: COLORS.border },
                      ]}
                      onPress={() => url && Linking.openURL(url)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.mediaIcon,
                          { backgroundColor: COLORS.muted },
                        ]}
                      >
                        <Ionicons
                          name="link-outline"
                          size={20}
                          color={COLORS.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[styles.linkUrl, { color: COLORS.primary }]}
                          numberOfLines={1}
                        >
                          {url}
                        </Text>
                        <Text
                          style={[
                            styles.mediaSub,
                            { color: COLORS.mutedForeground },
                          ]}
                        >
                          {item.sender?.userName || "Thành viên"} ·{" "}
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(
                                "vi-VN",
                              )
                            : ""}
                        </Text>
                      </View>
                      <Feather
                        name="external-link"
                        size={16}
                        color={COLORS.mutedForeground}
                      />
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Chuyển quyền nhóm trưởng ─────────────────────────────────── */}
      <Modal
        visible={showTransferModal}
        animationType="slide"
        transparent
        onRequestClose={() => !transferring && setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: COLORS.card }]}>
            <View
              style={[styles.modalHeader, { borderBottomColor: COLORS.border }]}
            >
              <TouchableOpacity
                onPress={() => !transferring && setShowTransferModal(false)}
                disabled={transferring}
              >
                <Feather
                  name="x"
                  size={22}
                  color={transferring ? COLORS.muted : COLORS.foreground}
                />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: COLORS.foreground }]}>
                Chọn nhóm trưởng mới
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <Text
              style={[styles.modalSubtitle, { color: COLORS.mutedForeground }]}
            >
              Chọn 1 thành viên để chuyển quyền. Bạn sẽ tự động rời nhóm sau khi
              xác nhận.
            </Text>

            <FlatList
              data={members.filter(
                (m: any) =>
                  (m._id || m.userId || "").toString() !== currentUserId,
              )}
              keyExtractor={(item, i) =>
                (item._id || item.userId || i).toString()
              }
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => {
                const mId = (item._id || item.userId || "").toString();
                const mName =
                  item.fullName ||
                  item.userName ||
                  item.username ||
                  "Thành viên";
                return (
                  <TouchableOpacity
                    style={[
                      styles.mediaItem,
                      { borderBottomColor: COLORS.border },
                    ]}
                    onPress={() => {
                      if (transferring) return;
                      Alert.alert(
                        "Xác nhận",
                        `Chuyển quyền nhóm trưởng cho ${mName} và rời nhóm?`,
                        [
                          { text: "Hủy", style: "cancel" },
                          {
                            text: "Xác nhận",
                            onPress: () => handleTransferAndLeave(mId),
                          },
                        ],
                      );
                    }}
                    activeOpacity={0.7}
                    disabled={transferring}
                  >
                    <View
                      style={[
                        styles.mediaIcon,
                        { backgroundColor: COLORS.secondary },
                      ]}
                    >
                      <Text style={{ color: "#FFF", fontWeight: "bold" }}>
                        {(mName || "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={[styles.mediaName, { color: COLORS.foreground }]}
                      numberOfLines={1}
                    >
                      {mName}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={COLORS.mutedForeground}
                    />
                  </TouchableOpacity>
                );
              }}
            />

            {(transferring || leavingAfterTransfer) && (
              <View
                style={[
                  styles.loadingOverlay,
                  { backgroundColor: COLORS.card + "CC" },
                ]}
              >
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text
                  style={[
                    styles.mediaSub,
                    { color: COLORS.foreground, marginTop: 8 },
                  ]}
                >
                  {leavingAfterTransfer
                    ? "Đang rời nhóm..."
                    : "Đang chuyển quyền..."}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Modal: Mã QR nhóm ───────────────────────────────────────────────── */}
      <Modal
        visible={showGroupQRModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowGroupQRModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGroupQRModal(false)}
        >
          <Pressable
            style={[
              styles.modalBox,
              {
                backgroundColor: COLORS.card,
                alignItems: "center",
                position: "relative",
              },
            ]}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                padding: 8,
              }}
              onPress={() => setShowGroupQRModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.mutedForeground} />
            </TouchableOpacity>

            <Text
              style={[
                styles.modalTitle,
                { color: COLORS.foreground, marginBottom: 20, marginTop: 10 },
              ]}
            >
              Mã QR của nhóm
            </Text>

            <View
              style={{ padding: 20, backgroundColor: "#FFF", borderRadius: 20 }}
            >
              <QRCode
                value={`chatpulse://group/join/${conversationId}`}
                size={220}
                color="#000"
                backgroundColor="#FFF"
                logoSize={40}
                logoBackgroundColor="transparent"
              />
            </View>

            <Text
              style={[
                {
                  color: COLORS.mutedForeground,
                  textAlign: "center",
                  marginTop: 20,
                  marginBottom: 20,
                  paddingHorizontal: 10,
                },
              ]}
            >
              Bạn bè có thể dùng tính năng quét QR trên màn hình chính để quét
              mã này và tham gia nhóm.
            </Text>

            <TouchableOpacity
              style={[
                styles.modalBtn,
                { borderColor: COLORS.border, width: "100%" },
              ]}
              onPress={() => setShowGroupQRModal(false)}
            >
              <Text
                style={{ color: COLORS.mutedForeground, fontWeight: "600" }}
              >
                Đóng
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "600" },

  heroSection: {
    alignItems: "center",
    paddingVertical: 24,
    borderBottomWidth: 1,
  },
  heroName: { fontSize: 20, fontWeight: "700", marginTop: 12 },
  heroSub: { fontSize: 13, marginTop: 4 },

  quickActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  quickBtn: { alignItems: "center", gap: 6, width: 70 },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  quickLabel: { fontSize: 12, textAlign: "center", fontWeight: "500" },

  divider: { height: 8 },
  section: { paddingVertical: 4 },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },

  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: "500" },
  memberSub: { fontSize: 12, marginTop: 1 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  adminBadgeText: { fontSize: 11, fontWeight: "600" },

  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    borderTopWidth: 0.5,
  },
  viewAllText: { fontSize: 14, fontWeight: "500" },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
  },
  menuRowLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  menuRowLabel: { fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 16,
    overflow: "hidden",
  },
  modalBox: {
    marginHorizontal: 24,
    marginBottom: "auto",
    marginTop: "auto",
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalSubtitle: {
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 10,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnPrimary: { borderWidth: 0 },

  renameInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
  },

  mediaItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  mediaIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaName: { fontSize: 14, fontWeight: "500" },
  mediaSub: { fontSize: 12, marginTop: 2 },

  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  closeIcon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    elevation: 3,
  },
  linkUrl: { fontSize: 13, fontWeight: "500" },

  emptyState: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 14 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
