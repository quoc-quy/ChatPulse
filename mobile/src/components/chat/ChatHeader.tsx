import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";

export const ChatHeader = ({
  COLORS,
  displayConversationsLength,
  t,
  setShowQRScanner,
  setShowPlusMenu,
  setShowSearchModal,
}: any) => {
  const styles = getStyles(COLORS);

  return (
    <View style={styles.heroContainer}>
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.heroGradient}>
        <SafeAreaView style={styles.safeHeader}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>{t.chatTitle}</Text>
              <Text style={styles.subtitle}>
                {displayConversationsLength} {t.chatConversations}
              </Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowQRScanner(true)}>
                <Ionicons name="qr-code-outline" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => setShowPlusMenu(true)}>
                <Feather name="plus" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchWrapper}>
            <TouchableOpacity style={styles.searchBarFake} activeOpacity={0.8} onPress={() => setShowSearchModal(true)}>
              <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 10 }} />
              <Text style={styles.searchPlaceholderText}>{t.chatSearchPlaceholder}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  heroContainer: {
    height: Platform.OS === "ios" ? 220 : 190,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroGradient: { flex: 1 },
  safeHeader: { flex: 1, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 15 },
  title: { fontSize: 30, fontWeight: "800", color: "#FFFFFF", marginLeft: 20 },
  subtitle: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginLeft: 20 },
  headerIcons: { flexDirection: "row", right: 20 },
  iconBtn: { width: 40, height: 40, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, justifyContent: "center", alignItems: "center", marginLeft: 12 },
  searchWrapper: { marginTop: 10, paddingHorizontal: 20 },
  searchBarFake: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20, height: 42, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  searchPlaceholderText: { color: "rgba(255,255,255,0.6)", fontSize: 15, marginLeft: 8 },
});