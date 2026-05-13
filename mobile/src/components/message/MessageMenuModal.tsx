import React from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const REACTION_LIST = ['👍', '❤️', '🤣', '😮', '😭', '😡'];

export const MessageMenuModal = ({
  showMenu,
  setShowMenu,
  menuPos,
  setEmojiStripWidth,
  emojiPanResponder,
  hoveredReaction,
  handleRemoveAllReactions,
  selectedMsg,
  handleForward,
  pinnedMessages,
  handleTogglePinMessage,
  currentUserId,
  handleRevoke,
  handleDeleteForMe,
  COLORS,
  styles,
  t
}: any) => {
  return (
    <Modal visible={showMenu} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
        <View style={[styles.menuBox, { top: menuPos.y }]}>
          <View style={styles.emojiRow}>
            <View 
              style={styles.emojiStrip} 
              onLayout={(event) => setEmojiStripWidth(event.nativeEvent.layout.width)} 
              {...emojiPanResponder.panHandlers}
            >
              {REACTION_LIST.map((e) => {
                const isHovered = hoveredReaction === e;
                return (
                  <View key={e} style={[styles.reactionEmojiWrap, isHovered && styles.reactionEmojiWrapHovered]}>
                    <Text style={[styles.reactionEmojiText, isHovered && styles.reactionEmojiTextHovered]}>{e}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => handleRemoveAllReactions(selectedMsg)} style={styles.removeAllReactionBtn}>
              <Ionicons name="heart-dislike-outline" size={Platform.OS === 'android' ? 20 : 24} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.menuItem} onPress={handleForward}>
              <Ionicons name="arrow-redo-outline" size={20} color={COLORS.text} />
              <Text style={{ color: COLORS.text, marginLeft: 12, fontSize: 16 }}>{t.messageForward || 'Chuyển tiếp'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => { if (selectedMsg) { handleTogglePinMessage(selectedMsg); setShowMenu(false); } }}>
              <Ionicons name={pinnedMessages.some((p: any) => p.messageId === selectedMsg?._id) ? 'pin-outline' : 'pin'} size={20} color={COLORS.text} />
              <Text style={{ color: COLORS.text, marginLeft: 12, fontSize: 16 }}>
                {pinnedMessages.some((p: any) => p.messageId === selectedMsg?._id) ? 'Unpin messages' : 'Message pin'}
              </Text>
            </TouchableOpacity>
            {selectedMsg?.sender?._id === currentUserId && (
              <TouchableOpacity style={styles.menuItem} onPress={handleRevoke}>
                <Ionicons name="refresh-outline" size={20} color={COLORS.badge} />
                <Text style={{ color: COLORS.badge, marginLeft: 12, fontSize: 16 }}>{t.messageRecall || 'Thu hồi'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteForMe}>
              <Ionicons name="trash-outline" size={20} color={COLORS.text} />
              <Text style={{ color: COLORS.text, marginLeft: 12, fontSize: 16 }}>{t.messageDeleteForMe || 'Xóa phía tôi'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};