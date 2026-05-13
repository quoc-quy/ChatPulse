import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ReactionModal = ({
  showReactionDetails,
  setShowReactionDetails,
  reactionFilter,
  setReactionFilter,
  reactionGroupsForModal,
  reactionUsersForModal,
  COLORS,
  styles,
  t,
  isDarkMode
}: any) => {
  return (
    <Modal visible={showReactionDetails} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={() => setShowReactionDetails(false)}>
        <Pressable style={styles.reactionDetailBox}>
          <View style={styles.reactionDetailHeader}>
            <Text style={styles.reactionDetailTitle}>{t.messageReactions}</Text>
            <TouchableOpacity onPress={() => setShowReactionDetails(false)}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.reactionDetailBody}>
            {/* Cột trái: Bộ lọc (Tất cả, 👍, ❤️...) */}
            <View style={styles.reactionFilterCol}>
              <TouchableOpacity 
                style={[styles.reactionFilterItem, reactionFilter === 'ALL' && styles.reactionFilterItemActive]} 
                onPress={() => setReactionFilter('ALL')}
              >
                <Text style={styles.reactionFilterLabel}>Tất cả</Text>
                <Text style={styles.reactionFilterCount}>
                  {reactionGroupsForModal.reduce((acc: any, group: any) => acc + group.count, 0)}
                </Text>
              </TouchableOpacity>
              
              {reactionGroupsForModal.map((group: any) => (
                <TouchableOpacity 
                  key={group.emoji} 
                  style={[styles.reactionFilterItem, reactionFilter === group.emoji && styles.reactionFilterItemActive]} 
                  onPress={() => setReactionFilter(group.emoji)}
                >
                  <Text style={styles.reactionFilterLabel}>{group.emoji}</Text>
                  <Text style={styles.reactionFilterCount}>{group.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Cột phải: Danh sách user */}
            <View style={styles.reactionUsersCol}>
              <FlatList
                data={reactionUsersForModal}
                keyExtractor={(reaction: any, index) => `${reaction.userId}-${reaction.emoji || 'ALL'}-${index}`}
                renderItem={({ item: reaction }: { item: any }) => {
                  const userName = reaction.userName;
                  const avatar = reaction.avatar;
                  const isAllFilter = reactionFilter === 'ALL';
                  const rightEmojiText = isAllFilter ? (reaction.emojis || []).join(' ') : reaction?.emoji;
                  const rightCountText = isAllFilter ? reaction.totalCount : reaction?.count;
                  
                  return (
                    <View style={styles.reactionUserRow}>
                      {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.reactionUserAvatar} />
                      ) : (
                        <View style={styles.reactionUserAvatarFallback}>
                          <Text style={styles.reactionUserAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <Text style={styles.reactionUserName} numberOfLines={1}>{userName}</Text>
                      <View style={styles.reactionUserRight}>
                        <Text style={styles.reactionUserEmoji}>{rightEmojiText}</Text>
                        <Text style={styles.reactionUserCount}>{rightCountText}</Text>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.reactionEmptyText}>{t.messageNoReactions}</Text>}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};