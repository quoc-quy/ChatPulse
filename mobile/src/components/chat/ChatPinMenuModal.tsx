import React from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const ChatPinMenuModal = ({
  showPinMenu,
  setShowPinMenu,
  handleTogglePin,
  selectedConvForPin,
  pinnedIds,
  COLORS,
  t,
}: any) => {
  const styles = getStyles(COLORS);
  
  return (
    <Modal visible={showPinMenu} transparent animationType="fade" onRequestClose={() => setShowPinMenu(false)}>
      <TouchableOpacity style={styles.pinOverlay} activeOpacity={1} onPress={() => setShowPinMenu(false)}>
        <View style={styles.pinMenuBox}>
          <TouchableOpacity style={styles.pinMenuItem} onPress={() => handleTogglePin(selectedConvForPin)}>
            <Ionicons name={pinnedIds.has(selectedConvForPin?._id) ? "pin-outline" : "pin"} size={20} color={COLORS.accent} />
            <Text style={styles.pinMenuText}>
              {pinnedIds.has(selectedConvForPin?._id) ? t.chatUnpinConversation : t.chatPinConversation}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  pinOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  pinMenuBox: { width: "75%", borderRadius: 20, borderWidth: 1, overflow: "hidden", backgroundColor: COLORS.surface, borderColor: COLORS.border },
  pinMenuItem: { flexDirection: "row", alignItems: "center", padding: 18, gap: 14 },
  pinMenuText: { fontSize: 16, fontWeight: "600", color: COLORS.text },
});