import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export const ChatTabs = ({ activeTab, setActiveTab, COLORS, t }: any) => {
  const styles = getStyles(COLORS);

  return (
    <View style={styles.tabsContainer}>
      <TouchableOpacity style={[styles.tabButton, activeTab === "all" && styles.tabButtonActive]} onPress={() => setActiveTab("all")}>
        <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>{t.chatAll}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabButton, activeTab === "unread" && styles.tabButtonActive]} onPress={() => setActiveTab("unread")}>
        <Text style={[styles.tabText, activeTab === "unread" && styles.tabTextActive]}>{t.chatUnread}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabButton, activeTab === "groups" && styles.tabButtonActive]} onPress={() => setActiveTab("groups")}>
        <Text style={[styles.tabText, activeTab === "groups" && styles.tabTextActive]}>{t.groups}</Text>
      </TouchableOpacity>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  tabsContainer: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 10 },
  tabButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10, bottom: -7, backgroundColor: COLORS.border },
  tabButtonActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: "600" },
  tabTextActive: { color: "#FFFFFF" },
});