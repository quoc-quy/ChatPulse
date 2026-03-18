import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface FriendItemProps {
  item: any;
  type: "friend" | "request" | "sent";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
  onChat?: (userId: string, userName: string) => void;
}

const lightColors = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  foreground: "#1E293B",
  muted: "#64748B",
  white: "#FFFFFF",
  card: "#FFFFFF",
  grayBtn: "#F1F5F9",
  grayBtnText: "#1E293B",
  onlineBorder: "#FFFFFF",
};

const darkColors = {
  primary: "#818CF8",
  secondary: "#A855F7",
  foreground: "#F8FAFC",
  muted: "#94A3B8",
  white: "#FFFFFF",
  card: "#11182D",
  grayBtn: "#1E2946",
  grayBtnText: "#F8FAFC",
  onlineBorder: "#11182D",
};

export const FriendItem = React.memo(
  ({
    item,
    type,
    onAccept,
    onDecline,
    onDelete,
    onCancel,
    onChat,
  }: FriendItemProps) => {
    const { isDarkMode } = useTheme();
    const COLORS = isDarkMode ? darkColors : lightColors;

    const userData = (() => {
      if (type === "sent") {
        return (
          item?.receiver_info || item?.receiver || item?.receiverInfo || {}
        );
      }
      if (type === "request") {
        return item?.sender_info || item?.sender || item?.senderInfo || {};
      }
      return item?.user || item || {};
    })();

    const requestId = item?._id || item?.id;

    // userId của người bạn bè (dùng cho chat 1-1)
    const friendUserId = (userData?._id || userData?.id || "").toString();

    const displayName =
      userData?.fullName ||
      userData?.userName ||
      userData?.username ||
      userData?.name ||
      "Người dùng";

    const initials = displayName?.charAt(0)?.toUpperCase() || "?";

    const subText = (() => {
      if (type === "request") return "Muốn kết bạn với bạn";
      if (type === "sent")
        return userData?.phone || userData?.bio || "Đang chờ xác nhận...";
      return userData?.bio || "Living my best life ✨";
    })();

    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: COLORS.card }]}
        activeOpacity={0.7}
        delayLongPress={500}
        onPress={() => type === "friend" && onChat?.(friendUserId, displayName)}
        onLongPress={() =>
          type === "friend" && onDelete?.(requestId, displayName)
        }
      >
        {/* AVATAR */}
        <View style={styles.avatarWrapper}>
          <View style={[styles.avatar, { backgroundColor: COLORS.secondary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View
            style={[styles.onlineBadge, { borderColor: COLORS.onlineBorder }]}
          />
        </View>

        {/* INFO */}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: COLORS.foreground }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.status, { color: COLORS.muted }]}
            numberOfLines={1}
          >
            {subText}
          </Text>
        </View>

        {/* ACTION BUTTONS - request */}
        {type === "request" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnAccept, { backgroundColor: COLORS.primary }]}
              onPress={() => onAccept?.(requestId)}
            >
              <Text style={styles.btnTextWhite}>Đồng ý</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnDecline, { backgroundColor: COLORS.grayBtn }]}
              onPress={() => onDecline?.(requestId)}
            >
              <Text style={[styles.btnTextGray, { color: COLORS.grayBtnText }]}>
                Từ chối
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTION BUTTONS - sent */}
        {type === "sent" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnDecline, { backgroundColor: COLORS.grayBtn }]}
              onPress={() => onCancel?.(requestId)}
            >
              <Text style={[styles.btnTextGray, { color: COLORS.grayBtnText }]}>
                Thu hồi
              </Text>
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
  },
  avatarWrapper: {
    position: "relative",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
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
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  status: {
    fontSize: 13,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  btnAccept: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
  },
  btnDecline: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  btnTextGray: {
    fontSize: 12,
    fontWeight: "600",
  },
});
