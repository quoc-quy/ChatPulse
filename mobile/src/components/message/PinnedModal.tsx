import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const PinnedModal = ({
  showPinnedModal,
  setShowPinnedModal,
  pinnedMessages,
  scrollToMessage,
  renderPinnedMessageContent,
  handleTogglePinMessage,
  COLORS,
  styles,
  isDarkMode
}: any) => {
  return (
    <Modal visible={showPinnedModal} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={() => setShowPinnedModal(false)}>
        <View style={styles.pinnedModalContainer}>
          <View style={styles.pinnedModalHeader}>
            <Text style={styles.pinnedModalTitle}> Pin list ({pinnedMessages.length}/3)</Text>
            <TouchableOpacity onPress={() => setShowPinnedModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[...pinnedMessages].reverse()}
            keyExtractor={(item) => item.messageId}
            renderItem={({ item }) => (
              <View style={styles.pinnedItemRow}>
                <TouchableOpacity style={styles.pinnedItemContent} onPress={() => scrollToMessage(item.messageId)}>
                  <Text style={styles.pinnedItemText} numberOfLines={2}>
                    {renderPinnedMessageContent(item.message)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.unpinBtn} onPress={() => {
                  handleTogglePinMessage({ _id: item.messageId });
                  if (pinnedMessages.length === 1) setShowPinnedModal(false);
                }}>
                  <Text style={styles.unpinText}>Unpin messages</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </Pressable>
    </Modal>
  );
};