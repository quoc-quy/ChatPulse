import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Import ChatAvatar dùng chung
import { ChatAvatar } from "../ui/ChatAvatar";

export const ConversationItem = ({
  item,
  currentUserId,
  blockedUserIds, // Danh sách ID người lạ hoặc bị chặn để làm mờ
  getLocalUnread,
  pinnedIds,
  archivedIds,
  drafts,
  friendIds, // 🌟 Thêm danh sách ID bạn bè để xác định người lạ
  onPress,
  onLongPress,
  onToggleArchive,
  onDeleteConversation,
  getChatDetails,
  formatTimeZalo,
  isMutedForItem,
  COLORS,
  t,
}: any) => {
  const styles = getStyles(COLORS);
  const { 
    chatName, 
    chatAvatarUrl, 
    isOnline, 
    targetUserId, 
    isGroup, 
    membersData 
  } = getChatDetails(item);

  // 🌟 LOGIC KIỂM TRA NGƯỜI LẠ ĐỂ LÀM MỜ
  // Nếu là chat 1-1 và ID đối phương nằm trong danh sách không phải bạn bè
const isStranger = !isGroup && !!targetUserId && !friendIds?.has(targetUserId.toString());  
  let messageContent = t.chatNoMessagesYet;
  if (item.lastMessage) {
    if (item.lastMessage.type === "image" || item.lastMessage.type === "media" || item.lastMessage.content?.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
      messageContent = `[${t.image || "Hình ảnh"}]`;
    } else if (item.lastMessage.type === "video" || item.lastMessage.content?.match(/\.(mp4|mov)(\?.*)?$/i)) {
      messageContent = `[${t.video || "Video"}]`;
    } else if (item.lastMessage.type === "file") {
      messageContent = `[${t.file || "Tệp đính kèm"}]`;
    } else if (item.lastMessage.type === "call") {
      messageContent = `[${t.call || "Cuộc gọi"}]`;
    } else if (item.lastMessage.type === "revoked") {
      messageContent = t.messageRevoked || "Tin nhắn đã thu hồi";
    } else {
      messageContent = item.lastMessage.content || t.chatNoMessagesYet;
    }
  }

  const unread = getLocalUnread(item._id);
  const isPinned = pinnedIds.has(item._id);
  const isArchived = archivedIds.has(item._id);
  const draftText = drafts[item._id];

  const renderRightActions = () => (
    <View style={styles.rightActionContainer}>
      {!item.isDisbanded && (
        <TouchableOpacity 
          style={[styles.rightActionBtn, { backgroundColor: COLORS.mutedForeground }]} 
          onPress={() => onToggleArchive(item)}
        >
          <Ionicons name={isArchived ? "archive-outline" : "archive"} size={22} color="#FFF" />
          <Text style={styles.rightActionText}>{isArchived ? t.unarchive : t.archive}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity 
        style={[styles.rightActionBtn, { backgroundColor: COLORS.badge }]} 
        onPress={() => onDeleteConversation(item._id)}
      >
        <Ionicons name="trash" size={22} color="#FFF" />
        <Text style={styles.rightActionText}>{t.delete}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[
      styles.swipeableWrapper, 
      isStranger && { opacity: 0.5 } // 🌟 SẼ MỜ NẾU LÀ NGƯỜI LẠ
    ]}>
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity
          onPress={() => onPress(item, chatName, isGroup, targetUserId)}
          style={styles.chatCard}
          onLongPress={() => onLongPress(item)}
          delayLongPress={400}
          activeOpacity={1}
        >
          <View style={styles.avatarWrapper}>
            
            {/* SỬ DỤNG COMPONENT CHAT AVATAR ĐÃ TÁCH */}
            <ChatAvatar 
              chatName={chatName}
              chatAvatarUrl={chatAvatarUrl}
              isGroup={isGroup}
              membersData={membersData}
              COLORS={COLORS}
            />

            {/* Dấu chấm xanh Online - Chỉ hiện nếu là bạn bè và đang online */}
            {isOnline && !isPinned && !isStranger && (
              <View style={styles.onlineDot} />
            )}
          </View>

          <View style={styles.chatContent}>
            <View style={styles.chatHeader}>
              <Text style={styles.name} numberOfLines={1}>{chatName}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {isMutedForItem(item) && (
                  <Ionicons name="notifications-off-outline" size={13} color={COLORS.textLight} />
                )}
                <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
                  {formatTimeZalo(item.updated_at)}
                </Text>
              </View>
            </View>
            
            <View style={styles.chatFooter}>
              <Text 
                style={[styles.message, unread > 0 && styles.unreadMessage]} 
                numberOfLines={1}
              >
                {messageContent}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {draftText && draftText.trim() !== "" && (
                  <Text style={{ color: COLORS.badge, fontSize: 12, fontWeight: "600", fontStyle: "italic" }}>
                    [{t.draft || "Chưa gửi"}]
                  </Text>
                )}
                {unread > 0 ? (
                  <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.badge}>
                    <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
                  </LinearGradient>
                ) : isPinned ? (
                  <Ionicons name="pin-outline" size={15} color={COLORS.textLight} />
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  swipeableWrapper: { 
    marginBottom: 12, 
    borderRadius: 24, 
    overflow: "hidden" 
  },
  rightActionContainer: { 
    flexDirection: "row", 
    width: 150, 
    height: "100%" 
  },
  rightActionBtn: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  rightActionText: { 
    color: "#FFF", 
    fontSize: 12, 
    fontWeight: "600", 
    marginTop: 4 
  },
  chatCard: { 
    flexDirection: "row", 
    backgroundColor: COLORS.surface, 
    padding: 12, 
    borderRadius: 24, 
    alignItems: "center", 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    marginBottom: 0 
  },
  avatarWrapper: { 
    position: "relative" 
  },
  onlineDot: { 
    position: "absolute", 
    right: 2, 
    bottom: 2, 
    width: 14, 
    height: 14, 
    borderRadius: 7, 
    backgroundColor: COLORS.success, 
    borderWidth: 2, 
    borderColor: COLORS.surface 
  },
  chatContent: { 
    flex: 1, 
    marginLeft: 14 
  },
  chatHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginBottom: 4 
  },
  name: { 
    color: COLORS.text, 
    fontSize: 16, 
    fontWeight: "700", 
    flex: 1 
  },
  time: { 
    color: COLORS.textLight, 
    fontSize: 12 
  },
  unreadTime: { 
    color: COLORS.primary, 
    fontWeight: "700" 
  },
  chatFooter: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  message: { 
    color: COLORS.textLight, 
    fontSize: 14, 
    flex: 1, 
    marginRight: 10 
  },
  unreadMessage: { 
    color: COLORS.text, 
    fontWeight: "600" 
  },
  badge: { 
    minWidth: 22, 
    height: 22, 
    borderRadius: 11, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 6 
  },
  badgeText: { 
    color: "#FFFFFF", 
    fontSize: 10, 
    fontWeight: "800" 
  },
});