import React from 'react'
import { View, Text, TouchableOpacity, Modal, Pressable, Platform, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const REACTION_LIST = ['👍', '❤️', '🤣', '😮', '😭', '😡']

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
  pinnedMessages = [],
  handleTogglePinMessage,
  currentUserId,
  handleRevoke,
  handleDeleteForMe,
  COLORS,
  styles,
  t,
  // 🔧 FIX: prop mới thay thế PanResponder — mỗi emoji bấm trực tiếp, không lỗi offset
  handleEmojiPress
}: any) => {
  if (!selectedMsg) return null

  const hasMyReaction =
    selectedMsg?.reactions?.some((r: any) => {
      const uid = r.userId || r.user?._id || r.id
      return uid === currentUserId
    }) || false

  const myCurrentEmoji =
    selectedMsg?.reactions?.find((r: any) => {
      const uid = r.userId || r.user?._id || r.id
      return uid === currentUserId
    })?.emoji || null

  const isPinned = pinnedMessages.some((p: any) => p.messageId === selectedMsg?._id)
  const isMyMsg = (selectedMsg?.sender?._id || selectedMsg?.senderId) === currentUserId

  return (
    <Modal
      visible={showMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMenu(false)}
    >
      <Pressable style={styles.overlay} onPress={() => setShowMenu(false)}>
        <View style={[styles.menuBox, { top: menuPos.y, maxHeight: '75%', overflow: 'hidden' }]}>
          {/* ─── THANH CẢM XÚC (EMOJI LAYER) ─── */}
          <View style={M.emojiRowWrapper}>
            {/* 🔧 FIX: Mỗi emoji là TouchableOpacity riêng — loại bỏ PanResponder gây lỗi offset */}
            <View
              style={M.emojiStrip}
              onLayout={(event) => setEmojiStripWidth(event.nativeEvent.layout.width)}
            >
              {REACTION_LIST.map((e) => {
                const isSelected = myCurrentEmoji === e
                return (
                  <TouchableOpacity
                    key={e}
                    onPress={() => {
                      if (handleEmojiPress) {
                        handleEmojiPress(e)
                      }
                    }}
                    activeOpacity={0.7}
                    style={[M.reactionEmojiWrap, isSelected && M.reactionEmojiWrapSelected]}
                  >
                    <Text style={[M.reactionEmojiText, isSelected && M.reactionEmojiTextSelected]}>
                      {e}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Nút xóa reaction — chỉ hiện khi user đã có reaction */}
            <View style={M.deleteButtonSlot}>
              {hasMyReaction && (
                <TouchableOpacity
                  onPress={() => {
                    handleRemoveAllReactions(selectedMsg)
                    setShowMenu(false)
                  }}
                  style={M.removeAllReactionBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="heart-dislike-outline"
                    size={Platform.OS === 'android' ? 18 : 20}
                    color={COLORS.badge || '#EF4444'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Divider */}
          <View style={M.divider} />

          {/* ─── DANH SÁCH HÀNH ĐỘNG (ACTION ITEMS) ─── */}
          <View style={styles.actionRow}>
            {/* Chuyển tiếp */}
            <TouchableOpacity style={styles.menuItem} onPress={handleForward}>
              <Ionicons name="arrow-redo-outline" size={20} color={COLORS.text} />
              <Text style={[M.menuItemText, { color: COLORS.text }]}>
                {t.messageForward || 'Chuyển tiếp'}
              </Text>
            </TouchableOpacity>

            {/* Ghim / Bỏ ghim */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                handleTogglePinMessage(selectedMsg)
                setShowMenu(false)
              }}
            >
              <Ionicons name={isPinned ? 'pin-outline' : 'pin'} size={20} color={COLORS.text} />
              <Text style={[M.menuItemText, { color: COLORS.text }]}>
                {isPinned ? t.messageUnpin || 'Bỏ ghim tin nhắn' : t.messagePin || 'Ghim tin nhắn'}
              </Text>
            </TouchableOpacity>

            {/* Thu hồi (Chỉ chính chủ) */}
            {isMyMsg && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  if (handleRevoke) handleRevoke()
                  setShowMenu(false)
                }}
              >
                <Ionicons name="refresh-outline" size={20} color={COLORS.badge || '#EF4444'} />
                <Text
                  style={[M.menuItemText, { color: COLORS.badge || '#EF4444', fontWeight: '500' }]}
                >
                  {t.messageRecall || 'Thu hồi'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Xóa tin nhắn phía tôi */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (handleDeleteForMe) handleDeleteForMe()
                setShowMenu(false)
              }}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.text} />
              <Text style={[M.menuItemText, { color: COLORS.text }]}>
                {t.messageDeleteForMe || 'Xóa phía tôi'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  )
}

// ── Style cô lập ──────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  emojiRowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  emojiStrip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  reactionEmojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  reactionEmojiWrapSelected: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    transform: [{ scale: 1.15 }]
  },
  reactionEmojiText: {
    fontSize: 26
  },
  reactionEmojiTextSelected: {
    fontSize: 28
  },
  deleteButtonSlot: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4
  },
  removeAllReactionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 8,
    marginBottom: 4
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16
  }
})
