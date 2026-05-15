import React, { useMemo } from 'react';
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

    // 🌟 GOM NHÓM NGƯỜI DÙNG: Xử lý lặp user khi ở tab "ALL"
    const processedData = useMemo(() => {
        if (!reactionUsersForModal) return [];
        
        // Nếu không phải tab "Tất cả", không cần gom nhóm
        if (reactionFilter !== 'ALL') return reactionUsersForModal;

        const userMap = new Map();

        reactionUsersForModal.forEach((reaction: any) => {
            // Xác định ID duy nhất của người dùng
            const uid = reaction.userId || reaction.user?._id || reaction.id || reaction.userName;

            if (!userMap.has(uid)) {
                // Lần đầu gặp người này -> Tạo một bản ghi mới với mảng emojis
                userMap.set(uid, {
                    ...reaction,
                    emojis: [reaction.emoji],
                    totalCount: 1
                });
            } else {
                // Nếu người này đã có trong danh sách -> Cập nhật thêm emoji
                const existing = userMap.get(uid);
                if (!existing.emojis.includes(reaction.emoji)) {
                    existing.emojis.push(reaction.emoji);
                }
                existing.totalCount += 1;
            }
        });

        // Chuyển Map trở lại thành Array để FlatList đọc được
        return Array.from(userMap.values());
    }, [reactionUsersForModal, reactionFilter]);

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
                                data={processedData} // 🌟 Sử dụng dữ liệu đã được gom nhóm
                                keyExtractor={(reaction: any, index) => `${reaction.userId}-${reaction.emoji || 'ALL'}-${index}`}
                                renderItem={({ item: reaction }: { item: any }) => {
                                    // Fallback an toàn nếu tên bị undefined
                                    const userName = reaction?.userName || reaction?.user?.userName || reaction?.displayName || 'User';
                                    const avatar = reaction?.avatar || reaction?.user?.avatar;

                                    const isAllFilter = reactionFilter === 'ALL';
                                    
                                    // Hiển thị mảng emojis (nếu ở tab ALL) hoặc 1 emoji đơn lẻ
                                    const rightEmojiText = isAllFilter ? (reaction.emojis || []).join(' ') : reaction?.emoji;
                                    // Hiển thị tổng số react của người đó (nếu ở tab ALL)
                                    const rightCountText = isAllFilter ? (reaction.totalCount > 1 ? `${reaction.totalCount}` : '') : '';

                                    return (
                                        <View style={styles.reactionUserRow}>
                                            {avatar ? (
                                                <Image source={{ uri: avatar }} style={styles.reactionUserAvatar} />
                                            ) : (
                                                <View style={styles.reactionUserAvatarFallback}>
                                                    {/* Đảm bảo userName luôn là chuỗi trước khi gọi charAt */}
                                                    <Text style={styles.reactionUserAvatarText}>{String(userName).charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                            <Text style={styles.reactionUserName} numberOfLines={1}>{userName}</Text>
                                            <View style={styles.reactionUserRight}>
                                                <Text style={styles.reactionUserEmoji}>{rightEmojiText}</Text>
                                                {rightCountText ? (
                                                    <Text style={styles.reactionUserCount}>{rightCountText}</Text>
                                                ) : null}
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