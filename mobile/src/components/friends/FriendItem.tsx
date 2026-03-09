import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface FriendItemProps {
  item: any;
  type: "friend" | "request";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
}

const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  foreground: "#1E293B",
  muted: "#64748B",
  white: "#FFFFFF",
  grayBtn: "#F1F5F9",
};

export const FriendItem = React.memo(
  ({ item, type, onAccept, onDecline, onDelete }: FriendItemProps) => {
    // ===== LẤY USER DATA AN TOÀN =====
    const userData =
      item?.sender_info || item?.sender || item?.user || item || {};

    // ===== ID AN TOÀN =====
    const requestId = item?.id || item?._id;

    // ===== TÊN HIỂN THỊ =====
    const displayName =
      userData?.fullName ||
      userData?.userName ||
      userData?.username ||
      userData?.name ||
      "Người dùng";

    // ===== AVATAR LETTER =====
    const initials = displayName?.charAt(0)?.toUpperCase() || "?";

    return (
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        delayLongPress={500}
        onLongPress={() =>
          type === "friend" && onDelete?.(requestId, displayName)
        }
      >
        {/* AVATAR */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.onlineBadge} />
        </View>

        {/* INFO */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>

          <Text style={styles.status} numberOfLines={1}>
            {type === "request"
              ? "Muốn kết bạn với bạn"
              : userData?.bio || "Living my best life ✨"}
          </Text>
        </View>

        {/* ACTION BUTTONS */}
        {type === "request" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={() => onAccept?.(requestId)}
            >
              <Text style={styles.btnTextWhite}>Đồng ý</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDecline}
              onPress={() => onDecline?.(requestId)}
            >
              <Text style={styles.btnTextBlack}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },

  onlineBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    backgroundColor: "#22C55E",
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.white,
  },

  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },

  status: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
  },

  btnAccept: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
  },

  btnDecline: {
    backgroundColor: COLORS.grayBtn,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
  },

  btnTextWhite: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "bold",
  },

  btnTextBlack: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "600",
  },
});
