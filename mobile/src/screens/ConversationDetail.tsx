import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  useColorScheme,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";
import {
  getConversationDetail,
  leaveGroup,
  kickMember,
  promoteAdmin,
} from "../apis/chat.api";

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

  const isDarkMode = useColorScheme() === "dark";
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const [conversation, setConversation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [muteEnabled, setMuteEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("access_token").then((token) => {
      if (token) {
        try {
          const decoded: any = jwtDecode(token);
          setCurrentUserId(decoded.user_id || decoded._id || decoded.id || "");
        } catch {}
      }
    });
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getConversationDetail(conversationId);
      setConversation(res.data.result);
    } catch {
      Alert.alert("Lỗi", "Không thể tải thông tin hội thoại");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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
  const handleLeaveGroup = () => {
    Alert.alert("Rời nhóm", "Bạn có chắc muốn rời khỏi nhóm này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Rời nhóm",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(conversationId);
            navigation.popToTop();
          } catch {
            Alert.alert("Lỗi", "Không thể rời nhóm lúc này.");
          }
        },
      },
    ]);
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

  // ── Loading ───────────────────────────────────────────────────────────────
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
          <Avatar
            name={chatName}
            size={80}
            bgColor={isGroupChat ? COLORS.secondary : COLORS.primary}
          />
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
          <TouchableOpacity style={styles.quickBtn}>
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
            onPress={() => setMuteEnabled(!muteEnabled)}
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
                navigation.navigate("AddMemberScreen", { conversationId })
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
            <TouchableOpacity style={styles.quickBtn}>
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

              {/* {members.slice(0, 3).map((m: any, i: number) => {
                const memberId = (m._id || m.userId || "").toString();
                const isMe = memberId === currentUserId;
                const memberRole =
                  conversation?.members?.find(
                    (cm: any) =>
                      (cm.userId?.toString?.() || cm._id?.toString?.()) ===
                      memberId,
                  )?.role || "member";

                return (
                  <MemberItem
                    key={memberId || i}
                    member={{ ...m, role: memberRole }}
                    isCurrentUser={isMe}
                    currentUserIsAdmin={currentUserIsAdmin}
                    COLORS={COLORS}
                    onKick={handleKickMember}
                    onPromote={handlePromoteAdmin}
                  />
                );
              })} */}

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
                >
                  <Text style={[styles.viewAllText, { color: COLORS.primary }]}>
                    Xem tất cả {members.length} thành viên
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={14}
                    color={COLORS.primary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[styles.divider, { backgroundColor: COLORS.sectionBg }]}
            />

            <View style={[styles.section, { backgroundColor: COLORS.card }]}>
              <MenuRow
                iconName="person-add-outline"
                label="Thêm thành viên"
                COLORS={COLORS}
                onPress={() =>
                  navigation.navigate("AddMemberScreen", { conversationId })
                }
              />
              <MenuRow
                iconName="link-outline"
                label="Link mời vào nhóm"
                COLORS={COLORS}
              />
              {currentUserIsAdmin && (
                <MenuRow
                  iconName="settings-outline"
                  label="Cài đặt nhóm"
                  COLORS={COLORS}
                />
              )}
            </View>

            <View
              style={[styles.divider, { backgroundColor: COLORS.sectionBg }]}
            />
          </>
        )}

        {/* ── Media & Files ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <MenuRow
            iconName="image-outline"
            label="Ảnh, video, file đã gửi"
            COLORS={COLORS}
          />
          <MenuRow
            iconName="link-outline"
            label="Link đã chia sẻ"
            COLORS={COLORS}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Cá nhân hóa ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <MenuRow
            iconName="color-palette-outline"
            label="Đổi hình nền"
            COLORS={COLORS}
          />
          <MenuRow iconName="text-outline" label="Biệt danh" COLORS={COLORS} />
          <MenuRow
            iconName="notifications-outline"
            label="Tắt thông báo"
            COLORS={COLORS}
            rightElement={
              <Switch
                value={muteEnabled}
                onValueChange={setMuteEnabled}
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
            <MenuRow
              iconName="log-out-outline"
              label="Rời nhóm"
              danger
              COLORS={COLORS}
              onPress={handleLeaveGroup}
              rightElement={null}
            />
          ) : (
            <MenuRow
              iconName="ban-outline"
              label="Chặn người dùng"
              danger
              COLORS={COLORS}
              onPress={() =>
                Alert.alert(
                  "Xác nhận",
                  "Bạn có chắc muốn chặn người này không?",
                  [
                    { text: "Hủy", style: "cancel" },
                    { text: "Chặn", style: "destructive", onPress: () => {} },
                  ],
                )
              }
              rightElement={null}
            />
          )}
        </View>
      </ScrollView>
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
});
