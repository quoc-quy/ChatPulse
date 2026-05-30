import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";

interface FriendItemProps {
  item: any;
  type: "friend" | "request" | "sent";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onDelete?: (id: string, name: string) => void;
  onCancel?: (id: string) => void;
  onChat?: (userId: string, userName: string) => void;
  onViewProfile?: (payload: {
    userId: string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    userAvatar?: string;
    userBio?: string;
  }) => void;
}

export const FriendItem = React.memo(
  ({
    item,
    type,
    onAccept,
    onDecline,
    onDelete,
    onCancel,
    onChat,
    onViewProfile,
  }: FriendItemProps) => {
    // Dùng colors trực tiếp từ ThemeContext — đồng bộ với toàn app
    const { colors } = useTheme();

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
    const friendUserId = (userData?._id || userData?.id || "").toString();

    const displayName =
      userData?.fullName ||
      userData?.userName ||
      userData?.username ||
      userData?.name ||
      "Người dùng";

    const userPhone = userData?.phone || "";
    const userEmail = userData?.email || "";
    const userAvatar = userData?.avatar || "";
    const userBio = userData?.bio || "";

    const initials = displayName?.charAt(0)?.toUpperCase() || "?";

    const subText = (() => {
      if (type === "request") return "Muốn kết bạn với bạn";
      if (type === "sent")
        return userData?.phone || userData?.bio || "Đang chờ xác nhận...";
      return userData?.bio || "Living my best life ✨";
    })();

    return (
      <TouchableOpacity
        style={[styles.container, { backgroundColor: colors.card }]}
        activeOpacity={0.7}
        delayLongPress={500}
        onPress={() => {
          if (type !== "friend") return;
          if (onViewProfile) {
            onViewProfile({
              userId: friendUserId,
              userName: displayName,
              userPhone,
              userEmail,
              userAvatar,
              userBio,
            });
            return;
          }
          onChat?.(friendUserId, displayName);
        }}
        onLongPress={() =>
          type === "friend" && onDelete?.(requestId, displayName)
        }
      >
        {/* AVATAR */}
        <View style={styles.avatarWrapper}>
          {userAvatar ? (
            <Image
              source={{ uri: userAvatar }}
              style={[styles.avatar, { backgroundColor: colors.secondary }]}
            />
          ) : (
            <View
              style={[styles.avatar, { backgroundColor: colors.secondary }]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View style={[styles.onlineBadge, { borderColor: colors.card }]} />
        </View>

        {/* INFO */}
        <View style={styles.info}>
          <Text
            style={[styles.name, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.status, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {subText}
          </Text>
        </View>

        {/* ACTION BUTTONS - request */}
        {type === "request" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnAccept, { backgroundColor: colors.primary }]}
              onPress={() => onAccept?.(requestId)}
            >
              <Text
                style={[
                  styles.btnTextWhite,
                  { color: colors.primaryForeground },
                ]}
              >
                Đồng ý
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnDecline, { backgroundColor: colors.muted }]}
              onPress={() => onDecline?.(requestId)}
            >
              <Text
                style={[styles.btnTextGray, { color: colors.mutedForeground }]}
              >
                Từ chối
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTION BUTTONS - sent */}
        {type === "sent" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnDecline, { backgroundColor: colors.muted }]}
              onPress={() => onCancel?.(requestId)}
            >
              <Text
                style={[styles.btnTextGray, { color: colors.mutedForeground }]}
              >
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
    overflow: "hidden",
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
    fontSize: 12,
    fontWeight: "bold",
  },
  btnTextGray: {
    fontSize: 12,
    fontWeight: "600",
  },
});
