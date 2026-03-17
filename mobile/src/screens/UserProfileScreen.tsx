import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  useColorScheme,
  Linking,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";

// ── Color Palettes (đồng nhất với ConversationDetail) ─────────────────────────
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
  white: "#FFFFFF",
};

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({
  name,
  size = 90,
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

// ── InfoRow ───────────────────────────────────────────────────────────────────
const InfoRow = ({
  iconName,
  label,
  value,
  onPress,
  COLORS,
}: {
  iconName: string;
  label: string;
  value?: string;
  onPress?: () => void;
  COLORS: any;
}) => {
  if (!value) return null;
  return (
    <TouchableOpacity
      style={[styles.infoRow, { borderBottomColor: COLORS.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.infoRowLeft}>
        <Ionicons
          name={iconName as any}
          size={20}
          color={COLORS.mutedForeground}
        />
        <View style={styles.infoTextBlock}>
          <Text style={[styles.infoLabel, { color: COLORS.mutedForeground }]}>
            {label}
          </Text>
          <Text style={[styles.infoValue, { color: COLORS.foreground }]}>
            {value}
          </Text>
        </View>
      </View>
      {onPress && (
        <Feather
          name="chevron-right"
          size={18}
          color={COLORS.mutedForeground}
        />
      )}
    </TouchableOpacity>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Nhận params được truyền từ ConversationDetail
  const { userId, userName, userPhone, userEmail } = route.params || {};

  const isDarkMode = useColorScheme() === "dark";
  const COLORS = useMemo(
    () => (isDarkMode ? darkColors : lightColors),
    [isDarkMode],
  );

  const displayName = userName || "Người dùng";

  const handleCallPhone = () => {
    if (userPhone) {
      Linking.openURL(`tel:${userPhone}`);
    }
  };

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
          Trang cá nhân
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── Hero ── */}
        <View
          style={[
            styles.heroSection,
            { backgroundColor: COLORS.card, borderBottomColor: COLORS.border },
          ]}
        >
          <Avatar name={displayName} size={90} bgColor={COLORS.primary} />
          <Text style={[styles.heroName, { color: COLORS.foreground }]}>
            {displayName}
          </Text>
          {userPhone && (
            <Text style={[styles.heroSub, { color: COLORS.mutedForeground }]}>
              {userPhone}
            </Text>
          )}

          {/* Quick action buttons */}
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={[
                styles.heroActionBtn,
                { backgroundColor: COLORS.primary },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFF" />
              <Text style={styles.heroActionBtnLabel}>Nhắn tin</Text>
            </TouchableOpacity>

            {!!userPhone && (
              <TouchableOpacity
                style={[
                  styles.heroActionBtn,
                  { backgroundColor: COLORS.muted },
                ]}
                onPress={handleCallPhone}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={COLORS.foreground}
                />
                <Text
                  style={[
                    styles.heroActionBtnLabel,
                    { color: COLORS.foreground },
                  ]}
                >
                  Gọi điện
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Thông tin cá nhân ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <Text
            style={[styles.sectionTitle, { color: COLORS.mutedForeground }]}
          >
            THÔNG TIN CÁ NHÂN
          </Text>
          <InfoRow
            iconName="person-outline"
            label="Tên hiển thị"
            value={displayName}
            COLORS={COLORS}
          />
          <InfoRow
            iconName="call-outline"
            label="Số điện thoại"
            value={userPhone}
            onPress={userPhone ? handleCallPhone : undefined}
            COLORS={COLORS}
          />
          <InfoRow
            iconName="mail-outline"
            label="Email"
            value={userEmail}
            COLORS={COLORS}
          />
        </View>

        <View style={[styles.divider, { backgroundColor: COLORS.sectionBg }]} />

        {/* ── Hành động nguy hiểm ── */}
        <View style={[styles.section, { backgroundColor: COLORS.card }]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: COLORS.border }]}
            onPress={() =>
              Alert.alert(
                "Xác nhận",
                `Bạn có chắc muốn chặn ${displayName} không?`,
                [
                  { text: "Hủy", style: "cancel" },
                  { text: "Chặn", style: "destructive", onPress: () => {} },
                ],
              )
            }
            activeOpacity={0.7}
          >
            <Ionicons name="ban-outline" size={20} color={COLORS.destructive} />
            <Text style={[styles.actionLabel, { color: COLORS.destructive }]}>
              Chặn người dùng
            </Text>
          </TouchableOpacity>
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
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  heroName: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  heroSub: { fontSize: 14 },

  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  heroActionBtnLabel: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },

  divider: { height: 8 },

  section: { paddingTop: 4, paddingBottom: 4 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  infoRowLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
  infoTextBlock: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "500" },

  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  actionLabel: { fontSize: 16 },
});
