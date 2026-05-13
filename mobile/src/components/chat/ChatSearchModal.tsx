import React from "react";
import { View, Text, TouchableOpacity, SafeAreaView, TextInput, Modal, KeyboardAvoidingView, FlatList, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const ChatSearchModal = ({
  showSearchModal,
  setShowSearchModal,
  searchQuery,
  setSearchQuery,
  searchResults,
  renderItem,
  COLORS,
  isDarkMode,
  t,
}: any) => {
  const styles = getStyles(COLORS, isDarkMode);

  return (
    <Modal visible={showSearchModal} animationType="slide" onRequestClose={() => setShowSearchModal(false)}>
      <View style={styles.root}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity onPress={() => setShowSearchModal(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={26} color={COLORS.text} />
            </TouchableOpacity>

            <View style={styles.searchModalInputWrapper}>
              <Ionicons name="search" size={20} color={COLORS.textLight} style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.searchModalInput}
                placeholder={t.chatSearchPlaceholder}
                placeholderTextColor={COLORS.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 8 }}>
                  <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <FlatList
            data={searchResults}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={COLORS.textLight} style={{ marginBottom: 10, opacity: 0.5 }} />
                <Text style={styles.emptyText}>{t.chatNoSearchResults}</Text>
              </View>
            }
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const getStyles = (COLORS: any, isDarkMode: boolean) => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 5 },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { color: COLORS.textLight, fontSize: 15 },
  searchModalHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 15, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backBtn: { paddingRight: 15 },
  searchModalInputWrapper: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: isDarkMode ? COLORS.border : "#F1F5F9", borderRadius: 20, height: 40 },
  searchModalInput: { flex: 1, fontSize: 15, marginLeft: 8, paddingVertical: 0, color: COLORS.text },
});