import React from "react";
import { View, Text, TouchableOpacity, Modal, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

export const ChatPlusMenuModal = ({
  showPlusMenu,
  setShowPlusMenu,
  COLORS,
}: any) => {
  const navigation = useNavigation<any>();
  const styles = getStyles(COLORS);

  return (
    <Modal visible={showPlusMenu} transparent animationType="fade" onRequestClose={() => setShowPlusMenu(false)}>
      <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowPlusMenu(false)}>
        <View style={styles.plusMenuContainer}>
          <TouchableOpacity
            style={styles.plusMenuItem}
            onPress={() => {
              setShowPlusMenu(false);
              navigation.navigate("CreateGroupScreen");
            }}
          >
            <View style={styles.plusMenuIcon}>
              <Ionicons name="people-outline" size={22} color={COLORS.primary} />
            </View>
            <Text style={styles.plusMenuText}>Tạo nhóm</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  plusMenuContainer: { position: "absolute", top: Platform.OS === "ios" ? 100 : 70, right: 16, backgroundColor: COLORS.surface, borderRadius: 16, paddingVertical: 8, minWidth: 200, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8, borderWidth: 1, borderColor: COLORS.border },
  plusMenuItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  plusMenuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceSoft, justifyContent: "center", alignItems: "center" },
  plusMenuText: { fontSize: 16, fontWeight: "500", color: COLORS.text },
});