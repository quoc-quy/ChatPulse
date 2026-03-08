import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode'; // Chắc chắn bạn đã cài thư viện này
import SearchComponent from '../components/ui/SearchComponent';
import { getConversations } from '../apis/chat.api';

const COLORS = {
  primary: "#4F46E5",
  secondary: "#A855F7",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#1E293B",
  textLight: "#64748B",
  border: "#E2E8F0",
  success: "#22C55E",
};

const ChatScreen = () => {
  const navigation = useNavigation<any>();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // State lưu id của người dùng đang đăng nhập
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Hàm lấy ID người dùng từ Token
  const fetchCurrentUserId = async () => {
    try {
      const token = await AsyncStorage.getItem("access_token");
      if (token) {
        // Cần jwtDecode để giải mã token lấy payload
        const decoded: any = jwtDecode(token);
        // Kiểm tra xem payload trong token lưu id là gì (thường là id, _id, hoặc user_id)
        setCurrentUserId(decoded.user_id || decoded._id || decoded.id);
      }
    } catch (error) {
      console.log("Lỗi giải mã token:", error);
    }
  };

  const fetchConversations = async (pageNumber = 1, isRefresh = false) => {
    try {
      console.log("👉 Đang gọi API lấy danh sách hội thoại, page:", pageNumber);
      if (pageNumber === 1 && !isRefresh) {
        setLoading(true);
      }

      const response = await getConversations(pageNumber, 20);

      // LOG KẾT QUẢ TRẢ VỀ TỪ BACKEND
      console.log("✅ Dữ liệu từ Backend trả về:", JSON.stringify(response.data, null, 2));

      const newConversations = response.data.result || [];

      if (newConversations.length < 20) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (isRefresh || pageNumber === 1) {
        setConversations(newConversations);
      } else {
        setConversations(prev => [...prev, ...newConversations]);
      }

      setPage(pageNumber);

    } catch (error: any) {
      // LOG CHI TIẾT LỖI
      console.log('❌ Lỗi lấy danh sách hội thoại:');
      if (error.response) {
        console.log("Chi tiết lỗi từ server:", error.response.data);
      } else {
        console.log("Lỗi hệ thống/Network:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Gọi 2 hàm khi màn hình được load
  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserId().then(() => {
        fetchConversations(1, true);
      });
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations(1, true);
  };

  const onLoadMore = () => {
    if (!loading && hasMore && !refreshing) {
      fetchConversations(page + 1);
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  // --- HÀM XỬ LÝ LẤY TÊN VÀ AVATAR ---
  const getChatDetails = (item: any) => {
    let chatName = 'Người dùng';
    let chatAvatarUrl = '';

    if (item.type === 'group') {
      // 1. Nếu là Nhóm: Dùng trực tiếp tên nhóm
      chatName = item.name || 'Nhóm không tên';
      chatAvatarUrl = item.avatarUrl || '';
    } else {
      // 2. Nếu là Chat cá nhân: Tìm người đối diện trong mảng participants
      if (item.participants && item.participants.length > 0 && currentUserId) {
        // Tìm participant có ID KHÁC VỚI currentUserId
        const partner = item.participants.find(
          (p: any) => p._id !== currentUserId
        );

        if (partner) {
          // Ưu tiên hiển thị fullName, nếu không có thì lấy userName
          chatName = partner.fullName || partner.userName || 'Người dùng';
          chatAvatarUrl = partner.avatar || '';
        }
      }
    }

    return { chatName, chatAvatarUrl };
  };

  const renderItem = ({ item }: any) => {

    // Gọi hàm xử lý để lấy tên và avatar
    const { chatName } = getChatDetails(item);

    const message = item.lastMessage?.content || 'Chưa có tin nhắn';
    const time = formatTime(item.updated_at);
    const unread = item.unread_count || 0;
    const avatarLetter = chatName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => navigation.navigate('MessageScreen', { id: item._id, name: chatName })}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, item.type === 'group' && { backgroundColor: COLORS.secondary }]}>
            <Text style={styles.avatarText}>
              {avatarLetter}
            </Text>
          </View>
        </View>

        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={styles.name} numberOfLines={1}>
              {chatName}
            </Text>
            <Text style={[styles.time, unread > 0 && styles.unreadTime]}>
              {time}
            </Text>
          </View>

          <View style={styles.chatFooter}>
            <Text
              style={[
                styles.message,
                unread > 0 && styles.unreadMessage
              ]}
              numberOfLines={1}
            >
              {message}
            </Text>

            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? '99+' : unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tin nhắn</Text>
      </View>

      <SearchComponent />

      <View style={styles.listContainer}>
        {loading && page === 1 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : conversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Bạn chưa có cuộc trò chuyện nào.</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item, index) => item._id ? item._id.toString() : index.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.primary]}
                tintColor={COLORS.primary}
              />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: 16,
    textAlign: 'center'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.secondary,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.surface,
    fontSize: 20,
    fontWeight: "bold",
  },
  chatContent: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  time: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  unreadTime: {
    color: COLORS.primary,
    fontWeight: "500",
  },
  chatFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  message: {
    color: COLORS.textLight,
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  unreadMessage: {
    color: COLORS.text,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: COLORS.primary,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.surface,
    fontSize: 12,
    fontWeight: "bold",
  }
});