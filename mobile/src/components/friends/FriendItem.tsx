import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface FriendItemProps {
  item: any;
  type: "friend" | "request" | "sent";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
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
  ({
    item,
    type,
    onAccept,
    onDecline,
    onDelete,
    onCancel,
  }: FriendItemProps) => {
    // ===== LẤY USER DATA THEO ĐÚNG TYPE =====
    // - "sent"    → hiển thị RECEIVER (người được gửi lời mời)
    // - "request" → hiển thị SENDER   (người gửi lời mời đến mình)
    // - "friend"  → chính item là user
    const userData = (() => {
      if (type === "sent") {
        // Thử tất cả các field receiver có thể có
        return (
          item?.receiver_info || item?.receiver || item?.receiverInfo || {}
        );
      }
      if (type === "request") {
        return item?.sender_info || item?.sender || item?.senderInfo || {};
      }
      // type === "friend": item chính là user object
      return item?.user || item || {};
    })();

    // ===== ID CỦA REQUEST (dùng để cancel/accept/decline) =====
    const requestId = item?._id || item?.id;

    // ===== TÊN HIỂN THỊ =====
    const displayName =
      userData?.fullName ||
      userData?.userName ||
      userData?.username ||
      userData?.name ||
      "Người dùng";

    // ===== AVATAR LETTER =====
    const initials = displayName?.charAt(0)?.toUpperCase() || "?";

    // ===== SUB TEXT =====
    const subText = (() => {
      if (type === "request") return "Muốn kết bạn với bạn";
      if (type === "sent")
        return userData?.phone || userData?.bio || "Đang chờ xác nhận...";
      return userData?.bio || "Living my best life ✨";
    })();

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
            {subText}
          </Text>
        </View>

        {/* ACTION BUTTONS - request */}
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

        {/* ACTION BUTTONS - sent */}
        {type === "sent" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnDecline}
              onPress={() => onCancel?.(requestId)}
            >
              <Text style={styles.btnTextBlack}>Thu hồi</Text>
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
