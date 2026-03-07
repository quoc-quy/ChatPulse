import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface FriendItemProps {
  item: any;
  type: "friend" | "request";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
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
  ({ item, type, onAccept, onDecline }: FriendItemProps) => {
    const displayName = item.fullName || item.userName || "User";
    const initials = displayName.trim().charAt(0).toUpperCase();

    return (
      <View style={styles.container}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.onlineBadge} />
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {type === "request"
              ? "Hey, let's connect!"
              : "Living my best life ✨"}
          </Text>
        </View>

        {/* 3. Hiển thị nút Accept/Decline khi ở tab Request */}
        {type === "request" ? (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnAccept}
              onPress={() => onAccept?.(item._id)}
            >
              <Text style={styles.btnTextWhite}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnDecline}
              onPress={() => onDecline?.(item._id)}
            >
              <Text style={styles.btnTextBlack}>Decline</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
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
  avatarWrapper: { position: "relative" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: "bold" },
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
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: "700", color: COLORS.foreground },
  lastMessage: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  btnAccept: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnDecline: {
    backgroundColor: COLORS.grayBtn,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  btnTextWhite: { color: COLORS.white, fontSize: 13, fontWeight: "bold" },
  btnTextBlack: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
});
