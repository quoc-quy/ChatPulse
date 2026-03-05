import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

interface FriendItemProps {
  item: any;
  type: "friend" | "request";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

export const FriendItem = React.memo(
  ({ item, type, onAccept, onDecline }: FriendItemProps) => {
    return (
      <View style={styles.container}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {(item.userName || item.fullName || "U").charAt(0)}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{item.fullName || "User"}</Text>
          <Text style={styles.status}>
            {type === "friend" ? "Online" : "Sent a request"}
          </Text>
        </View>

        {type === "request" && (
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
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#e4e4e7", // Đồng bộ với Input.tsx
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f4f4f5", // Đồng bộ với background LoginForm
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "bold", color: "#71717a" },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: "600", color: "#09090b" },
  status: { fontSize: 13, color: "#71717a" },
  actions: { flexDirection: "row", gap: 8 },
  btnAccept: {
    backgroundColor: "#18181b", // Màu chủ đạo của ChatPulse
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnDecline: {
    backgroundColor: "#f4f4f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  btnTextWhite: { color: "#fff", fontSize: 12, fontWeight: "600" },
  btnTextBlack: { color: "#09090b", fontSize: 12, fontWeight: "600" },
});
