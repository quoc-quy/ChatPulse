import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ChatAvatar } from '../ui/ChatAvatar';

export const MessageHeader = ({
  navigation,
  conversationId,
  currentChatName,
  chatAvatarUrl,
  isGroup,
  isOnline,
  statusText, 
  isMutedState,
  isGroupDisbanded,
  membersData,
  isSummarizing,
  handleSummarizeChat,
  isNotFriendState, // 🌟 NHẬN THÊM BIẾN NÀY ĐỂ XỬ LÝ LÀM MỜ
  COLORS,
  styles,
}: any) => {

  const goToDetail = () => {
    navigation.navigate('ConversationDetail', { id: conversationId, name: currentChatName, isGroup: isGroup });
  };

  return (
    <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.header}>
      <View style={styles.headerLeft}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>

        {/* 🌟 LÀM MỜ KHỐI AVATAR VÀ TÊN NẾU KHÔNG PHẢI BẠN BÈ */}
        <TouchableOpacity 
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, opacity: (!isGroup && isNotFriendState) ? 0.5 : 1 }}
          activeOpacity={0.7}
          onPress={goToDetail}
        >
          <ChatAvatar 
            chatName={currentChatName}
            chatAvatarUrl={chatAvatarUrl}
            isGroup={isGroup}
            membersData={membersData}
            COLORS={COLORS}
            style={{ marginRight: 10 }}
          />

          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerName} numberOfLines={1} ellipsizeMode="tail">
                {currentChatName}
              </Text>
              {isMutedState && (
                <Ionicons name="notifications-off" size={14} color="rgba(255,255,255,0.75)" />
              )}
            </View>

            {!isGroupDisbanded && (
              <Text style={[styles.headerStatus, isOnline && !isGroup && !isNotFriendState ? { color: '#A7F3D0' } : {}]}>
                {statusText || (isGroup ? `${membersData.length} thành viên` : (isOnline ? 'Đang hoạt động' : 'Không hoạt động'))}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.headerRight}>
        {!isGroupDisbanded && (
          <>
            <TouchableOpacity style={styles.iconBtn} onPress={handleSummarizeChat} disabled={isSummarizing}>
              {isSummarizing ? <ActivityIndicator size="small" color="#FFD700" /> : <Ionicons name="sparkles" size={24} color="#FFD700" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="call-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <Ionicons name="videocam-outline" size={26} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={goToDetail}>
              <Ionicons name="menu" size={28} color="white" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </LinearGradient>
  );
};