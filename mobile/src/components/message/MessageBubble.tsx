import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const MessageBubble = ({
    item,
    index,
    groupedMessages,
    isMe,
    messages,
    highlightedMsgId,
    formatMessageDate,
    formatTime,
    parseMediaContent,
    getFileIconInfo,
    formatBytes,
    buildReactionGroups,
    handleLongPress,
    handleDoubleTap,
    setPreviewMedia,
    handleToggleReact,
    openReactionDetails,
    VideoThumbnail,
    VideoViewer,
    COLORS,
    styles,
    t,
    isDarkMode,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
}: any) => {

    if (item.isGroup) {
        return <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}></View>;
    }

    const isRevoked = item.type === 'revoked';
    const olderItem = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null;
    const newerItem = index > 0 ? groupedMessages[index - 1] : null;

    if (item.type === 'system' || item.type === 'system_error') {
        const currentDate = new Date(item.createdAt).toDateString();
        const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null;
        const showDateDivider = currentDate !== olderDate && item.type !== 'system_error';
        return (
            <View>
                {showDateDivider && (
                    <View style={styles.dateDivider}>
                        <Text style={styles.dateDividerText}>{formatMessageDate(item.createdAt)}</Text>
                    </View>
                )}
                <View style={[styles.systemMessageWrapper, item.type === 'system_error' && {}]}>
                    <Text style={[styles.systemMessageText, item.type === 'system_error' ? { color: COLORS.badge } : { color: COLORS.textLight }]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        );
    }

    const isAiGenerated = item.content?.startsWith('@PulseAI ');
    const displayContent = isAiGenerated ? item.content.substring(9) : item.content;
    const reactionGroups = buildReactionGroups(item.reactions || []);
    const totalReactions = reactionGroups.reduce((acc: any, group: any) => acc + group.count, 0);
    const hasReactions = totalReactions > 0;
    const reactionPreview = reactionGroups.slice(0, 3).map((group: any) => group.emoji).join(' ');
    const isLatestMessage = index === messages.length - 1;
    const shouldShowReactionCorner = !isRevoked && (hasReactions || isLatestMessage);

    const currentDate = new Date(item.createdAt).toDateString();
    const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null;
    const showDateDivider = currentDate !== olderDate;
    const isSameSenderAsNewer = newerItem && (newerItem.sender?._id || newerItem.senderId) === (item.sender?._id || item.senderId);

    let isCloseInTime = false;
    if (newerItem) {
        const diff = new Date(newerItem.createdAt).getTime() - new Date(item.createdAt).getTime();
        isCloseInTime = diff < 60000;
    }
    const showTime = !isRevoked && !(isSameSenderAsNewer && isCloseInTime);
    const showAvatar = !isMe && !isSameSenderAsNewer;
    const isHighlighted = item._id === highlightedMsgId;

    const handleMediaPress = () => {
        const clickPayloads = parseMediaContent(displayContent);
        const clickUrls: string[] = clickPayloads.map((p: any) => p.url);
        const firstClickPayload = clickPayloads[0] || { url: '', originalName: '', size: 0, mimeType: '' };
        const firstUrl = firstClickPayload.url;
        const firstClickExt = firstClickPayload.originalName.split('.').pop()?.toLowerCase() || '';
        const firstClickMime = firstClickPayload.mimeType || '';
        const urlLower = firstUrl.split('?')[0].toLowerCase();
        const isVideoClick = item.type === 'video' || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(firstClickExt) || firstClickMime.startsWith('video/');
        const isDocumentClick = item.type === 'file' || firstClickMime.startsWith('application/') || firstClickMime.startsWith('text/') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'csv', '7z'].includes(firstClickExt) || !!urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv|7z)$/i);
        const isImageClick = !isVideoClick && !isDocumentClick && (item.type === 'image' || item.type === 'media' || firstClickMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(firstClickExt) || !!urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i));

        if (isDocumentClick) {
            Linking.openURL(firstUrl);
        } else if (isImageClick || isVideoClick) {
            setPreviewMedia({
                items: clickUrls.map((u: string) => ({ id: item._id, url: u, isVideo: !!isVideoClick })),
                initialIndex: 0
            });
        } else {
            handleDoubleTap(item);
        }
    };

    const isBubbleContent = !(item.type === 'media' || item.type === 'image' || item.type === 'video' || item.type === 'call' || item.type === 'file' || displayContent?.split('?')[0].toLowerCase().match(/\.(mp4|mov|avi|mkv|jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv)$/i));

    return (
        <View>
            {showDateDivider && (
                <View style={styles.dateDivider}>
                    <Text style={styles.dateDividerText}>{formatMessageDate(item.createdAt)}</Text>
                </View>
            )}
            <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
                {!isMe && (
                    <View style={styles.avatarPlaceholder}>
                        {showAvatar && (
                            <View style={styles.avatarSmall}>
                                <Text style={styles.avatarText}>{item.sender?.userName?.charAt(0).toUpperCase() || 'U'}</Text>
                            </View>
                        )}
                    </View>
                )}
                <View style={[styles.messageContent, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }, { position: 'relative' }]}>
                    <TouchableOpacity
                        onPress={handleMediaPress}
                        onLongPress={(e) => handleLongPress(e, item)}
                        activeOpacity={0.9}
                    >
                        <View
                            style={[
                                isBubbleContent && styles.bubble,
                                isBubbleContent && (isMe ? styles.bubbleMe : styles.bubbleOther),
                                isRevoked && { backgroundColor: isDarkMode ? '#1E2946' : '#E2E8F0', opacity: 0.6 },
                                item.isSending && { opacity: 0.6 },
                                (item.type === 'call' || item.type === 'file') && { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }
                            ]}
                        >
                            {isRevoked ? (
                                <Text style={[styles.messageText, { fontStyle: 'italic', color: COLORS.textLight, paddingRight: 5 }]}>
                                    {t.messageRevoked}
                                </Text>
                            ) : (
                                (() => {
                                    const mediaPayloads = parseMediaContent(displayContent);
                                    const parsedUrls: string[] = mediaPayloads.map((p: any) => p.url);
                                    const firstPayload = mediaPayloads[0] || { url: '', originalName: '', size: 0, mimeType: '' };
                                    const firstUrl = firstPayload.url;
                                    const firstExt = firstPayload.originalName.split('.').pop()?.toLowerCase() || '';
                                    const firstMime = firstPayload.mimeType || '';
                                    const urlLower = firstUrl.split('?')[0].toLowerCase();
                                    const isVideo = item.type === 'video' || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(firstExt) || firstMime.startsWith('video/');
                                    const isDocument = item.type === 'file' || firstMime.startsWith('application/') || firstMime.startsWith('text/') || ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'csv', '7z'].includes(firstExt) || !!urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv|7z)$/i);
                                    const isImage = !isVideo && !isDocument && (item.type === 'image' || item.type === 'media' || firstMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].includes(firstExt) || !!urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i));

                                    if (isVideo || isImage) {
                                        const count = parsedUrls.length;
                                        const GRID_WIDTH = 240;
                                        const GAP = 4;
                                        const renderGridItem = (url: string, w: number, h: number, idx: number, isLast = false) => (
                                            <TouchableOpacity
                                                key={idx}
                                                onPress={() => setPreviewMedia({ items: parsedUrls.map((u) => ({ id: item._id, url: u, isVideo: false })), initialIndex: idx })}
                                                onLongPress={(e) => handleLongPress(e, item)}
                                                delayLongPress={200}
                                                activeOpacity={0.8}
                                            >
                                                <Image source={{ uri: url }} style={{ width: w, height: h, borderRadius: 8, backgroundColor: COLORS.surfaceSoft }} resizeMode="cover" />
                                                {isLast && count > 5 && (
                                                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}>
                                                        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>+{count - 5}</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                        return (
                                            <View style={{ position: 'relative', marginBottom: 5 }}>
                                                {count === 1 ? (
                                                    isVideo ? <VideoThumbnail url={parsedUrls[0]} /> : <Image source={{ uri: parsedUrls[0] }} style={styles.mediaImage} resizeMode="cover" />
                                                ) : (
                                                    <View style={{ gap: GAP }}>
                                                        {/* Logic render lưới ảnh 2, 3, 4, 5+ tương tự file cũ của bạn... */}
                                                        {count === 2 && (
                                                            <View style={{ flexDirection: 'row', gap: GAP }}>
                                                                {renderGridItem(parsedUrls[0], (GRID_WIDTH - GAP) / 2, 160, 0)}
                                                                {renderGridItem(parsedUrls[1], (GRID_WIDTH - GAP) / 2, 160, 1)}
                                                            </View>
                                                        )}
                                                        {count >= 3 && (
                                                            <View style={{ flexDirection: 'row', gap: GAP, flexWrap: 'wrap', width: GRID_WIDTH }}>
                                                                {parsedUrls.slice(0, 4).map((u, i) => renderGridItem(u, (GRID_WIDTH - GAP) / 2, 120, i, false))}
                                                                {count > 4 && renderGridItem(parsedUrls[4], GRID_WIDTH, 120, 4, true)}
                                                            </View>
                                                        )}
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    }

                                    if (isDocument) {
                                        const docPayloads = parseMediaContent(displayContent);
                                        return (
                                            <View style={{ gap: 8 }}>
                                                {docPayloads.map((payload: any, pidx: number) => {
                                                    const { color: fileColor, label: fileLabel } = getFileIconInfo(payload);
                                                    const sizeLabel = payload.size ? formatBytes(payload.size) : '';
                                                    return (
                                                        <View key={pidx} style={[styles.fileCard, { backgroundColor: COLORS.fileBg, borderColor: COLORS.border }]}>
                                                            <View style={[styles.fileCardInfo, { backgroundColor: COLORS.surface }]}>
                                                                <View style={[styles.fileTypeBadge, { backgroundColor: fileColor }]}>
                                                                    <Text style={styles.fileTypeBadgeText}>{fileLabel}</Text>
                                                                </View>
                                                                <View style={{ flex: 1, paddingRight: 8 }}>
                                                                    <Text style={[styles.fileNameCardText, { color: COLORS.text }]} numberOfLines={1}>
                                                                        {payload.originalName}
                                                                    </Text>
                                                                    <View style={styles.fileMetaRow}>
                                                                        {sizeLabel ? <Text style={[styles.fileMetaText, { color: COLORS.textLight }]}>{sizeLabel}</Text> : null}
                                                                        {sizeLabel ? <Text style={[styles.fileMetaText, { color: COLORS.textLight, marginHorizontal: 4 }]}>•</Text> : null}
                                                                        <Ionicons name="cloud-done-outline" size={12} color={COLORS.textLight} />
                                                                        <Text style={[styles.fileMetaText, { color: COLORS.textLight, marginLeft: 2 }]}>Đã có trên Cloud</Text>
                                                                    </View>
                                                                </View>
                                                                <TouchableOpacity style={styles.downloadIconBtn} onPress={() => Linking.openURL(payload.url)}>
                                                                    <Ionicons name="download-outline" size={20} color={COLORS.text} />
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        );
                                    }

                                    return (
                                        <Text style={[styles.messageText, { color: isMe ? COLORS.headerText : COLORS.text, paddingRight: 5 }]}>
                                            {isAiGenerated && (
                                                <Text style={{ color: isMe ? '#E9D5FF' : '#C084FC', fontWeight: '900' }}>@PulseAI{' '}</Text>
                                            )}
                                            {displayContent}
                                        </Text>
                                    );
                                })()
                            )}

                            {isHighlighted && (
                                <View
                                    style={[StyleSheet.absoluteFillObject, {
                                        backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)',
                                        borderRadius: item.type === 'image' || item.type === 'media' || item.type === 'file' || item.type === 'video' ? 16 : 18,
                                        borderWidth: 2,
                                        borderColor: COLORS.primary,
                                        zIndex: 10
                                    }]}
                                    pointerEvents="none"
                                />
                            )}
                        </View>

                        {showTime && !item.isSending && item.type !== 'call' && item.type !== 'file' && (
                            <Text style={[
                                styles.messageTime,
                                {
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    // SỬA LOGIC MÀU Ở ĐÂY 👇
                                    color: isMe
                                        ? (isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)') // Dark mode dùng trắng mờ, Light mode dùng đen mờ
                                        : COLORS.textLight
                                }
                            ]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        )}
                        {showTime && (item.type === 'call' || item.type === 'file') && (
                            <Text style={[styles.messageTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', color: COLORS.textLight, marginTop: 4 }]}>
                                {formatTime(item.createdAt)}
                            </Text>
                        )}
                        {item.isSending && (
                            <Text style={[styles.messageTime, { alignSelf: isMe ? 'flex-end' : 'flex-start', color: COLORS.textLight }]}>
                                {t.updating}
                            </Text>
                        )}

                        {shouldShowReactionCorner && !item.isSending && (
                            <View style={styles.reactionContainer}>
                                {hasReactions ? (
                                    <TouchableOpacity style={styles.reactionSummary} onPress={() => openReactionDetails(item)}>
                                        <Text style={styles.reactionEmojiPreview}>{reactionPreview}</Text>
                                        <Text style={styles.reactionCountText}>{totalReactions}</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity style={styles.defaultLike} onPress={() => handleToggleReact(item, '👍')}>
                                        <Ionicons name="heart-outline" size={13} color={COLORS.textLight} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};