/**
 * MessageBubble.tsx  [UPDATED]
 *
 * Thay đổi chính:
 * 1. Nhận thêm prop `onSummarizeFile(messageId)` từ MessageScreen
 * 2. File card: thêm nút ✨ AI tóm tắt bên cạnh nút download (giống frontend web)
 * 3. Ảnh đơn: thêm nút ✨ AI tóm tắt overlay góc phải trên (giống frontend web)
 * 4. Không thay đổi bất kỳ logic nào khác
 */
import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

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
  onSummarizeFile, // 🌟 MỚI: callback(messageId) => mở FileSummaryModal
  COLORS,
  styles,
  t,
  isDarkMode,
  SCREEN_WIDTH,
  SCREEN_HEIGHT
}: any) => {
  if (item.isGroup) {
    return (
      <View
        style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}
      ></View>
    )
  }

  const isRevoked = item.type === 'revoked'
  const olderItem = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null
  const newerItem = index > 0 ? groupedMessages[index - 1] : null

  if (item.type === 'system' || item.type === 'system_error') {
    const currentDate = new Date(item.createdAt).toDateString()
    const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null
    const showDateDivider = currentDate !== olderDate && item.type !== 'system_error'
    return (
      <View>
        {showDateDivider && (
          <View style={styles.dateDivider}>
            <Text style={styles.dateDividerText}>{formatMessageDate(item.createdAt)}</Text>
          </View>
        )}
        <View style={styles.systemMessageWrapper}>
          <Text
            style={[
              styles.systemMessageText,
              { color: item.type === 'system_error' ? '#EF4444' : COLORS.textLight }
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  const currentDate = new Date(item.createdAt).toDateString()
  const olderDate = olderItem ? new Date(olderItem.createdAt).toDateString() : null
  const showDateDivider = currentDate !== olderDate

  const olderSenderId = olderItem ? olderItem.sender?._id || olderItem.senderId : null
  const currentSenderId = item.sender?._id || item.senderId
  const isFirstInGroup = currentSenderId !== olderSenderId || showDateDivider

  const isHighlighted = item._id === highlightedMsgId
  const displayContent = item.content || ''
  const isAiGenerated = typeof displayContent === 'string' && displayContent.startsWith('@PulseAI ')

  const isTempMessage = String(item._id).startsWith('temp_') || item.isSending

  const mediaPayloads = parseMediaContent(displayContent)
  const firstPayload = mediaPayloads[0] || { url: '', originalName: '', size: 0, mimeType: '' }
  const firstExt = firstPayload.originalName.split('.').pop()?.toLowerCase() || ''
  const firstMime = firstPayload.mimeType || ''
  const urlLower = firstPayload.url.split('?')[0].toLowerCase()

  const isVideo =
    item.type === 'video' ||
    ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(firstExt) ||
    firstMime.startsWith('video/')
  const isDocument =
    item.type === 'file' ||
    firstMime.startsWith('application/') ||
    firstMime.startsWith('text/') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar', 'csv', '7z'].includes(
      firstExt
    ) ||
    !!urlLower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|csv|7z)$/i)
  const isImage =
    !isVideo &&
    !isDocument &&
    (item.type === 'image' ||
      item.type === 'media' ||
      firstMime.startsWith('image/') ||
      ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'].includes(firstExt) ||
      !!urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i))

  const isBubbleContent = !isDocument

  const reactions = item.reactions || []
  const reactionGroups = buildReactionGroups(reactions)

  const handleMediaPress = () => {
    if (isImage || isVideo) {
      const parsedUrls = mediaPayloads.map((p: any) => p.url)
      setPreviewMedia({
        items: parsedUrls.map((u: string) => ({ id: item._id, url: u, isVideo: isVideo })),
        initialIndex: 0
      })
    }
  }

  return (
    <View>
      {showDateDivider && (
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>{formatMessageDate(item.createdAt)}</Text>
        </View>
      )}

      <View
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
          isHighlighted && { backgroundColor: 'rgba(253,224,71,0.15)', borderRadius: 12 }
        ]}
      >
        {/* Avatar */}
        {!isMe && (
          <View style={styles.avatarPlaceholder}>
            {isFirstInGroup ? (
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarText}>
                  {(item.sender?.userName || item.sender?.displayName || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.messageContent}>
          {/* Sender name */}
          {!isMe && isFirstInGroup && (
            <Text style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 2, marginLeft: 4 }}>
              {item.sender?.userName || item.sender?.displayName || 'Người dùng'}
            </Text>
          )}

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
                item.type === 'file' && {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                  paddingHorizontal: 0,
                  paddingVertical: 0
                }
              ]}
            >
              {isRevoked ? (
                <Text
                  style={[
                    styles.messageText,
                    { fontStyle: 'italic', color: COLORS.textLight, paddingRight: 5 }
                  ]}
                >
                  {t.messageRevoked}
                </Text>
              ) : (
                (() => {
                  const parsedUrls: string[] = mediaPayloads.map((p: any) => p.url)
                  const GRID_WIDTH = 240
                  const GAP = 4

                  const renderGridItem = (
                    url: string,
                    w: number,
                    h: number,
                    idx: number,
                    isLast = false
                  ) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() =>
                        setPreviewMedia({
                          items: parsedUrls.map((u) => ({ id: item._id, url: u, isVideo: false })),
                          initialIndex: idx
                        })
                      }
                      onLongPress={(e) => handleLongPress(e, item)}
                      delayLongPress={200}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={{ uri: url }}
                        style={{
                          width: w,
                          height: h,
                          borderRadius: 8,
                          backgroundColor: COLORS.surfaceSoft
                        }}
                        resizeMode="cover"
                      />
                      {isLast && parsedUrls.length > 5 && (
                        <View
                          style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: 8,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                        >
                          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
                            +{parsedUrls.length - 5}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )

                  // ─── IMAGE / VIDEO ───────────────────────────────
                  if (isVideo || isImage) {
                    const count = parsedUrls.length
                    return (
                      <View style={{ position: 'relative', marginBottom: 5 }}>
                        {count === 1 ? (
                          isVideo ? (
                            <VideoThumbnail url={parsedUrls[0]} />
                          ) : (
                            // 🌟 Single image: nút ✨ overlay góc phải trên
                            <View style={{ position: 'relative' }}>
                              <Image
                                source={{ uri: parsedUrls[0] }}
                                style={styles.mediaImage}
                                resizeMode="cover"
                              />
                              {!isTempMessage && onSummarizeFile && (
                                <TouchableOpacity
                                  onPress={() => onSummarizeFile(item._id)}
                                  style={bubbleStyles.imageAiBtn}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Text style={{ fontSize: 14 }}>✨</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )
                        ) : (
                          <View style={{ gap: GAP }}>
                            {count === 2 && (
                              <View style={{ flexDirection: 'row', gap: GAP }}>
                                {renderGridItem(parsedUrls[0], (GRID_WIDTH - GAP) / 2, 160, 0)}
                                {renderGridItem(parsedUrls[1], (GRID_WIDTH - GAP) / 2, 160, 1)}
                              </View>
                            )}
                            {count >= 3 && (
                              <View
                                style={{
                                  flexDirection: 'row',
                                  gap: GAP,
                                  flexWrap: 'wrap',
                                  width: GRID_WIDTH
                                }}
                              >
                                {parsedUrls
                                  .slice(0, 4)
                                  .map((u, i) =>
                                    renderGridItem(u, (GRID_WIDTH - GAP) / 2, 120, i, false)
                                  )}
                                {count > 4 &&
                                  renderGridItem(parsedUrls[4], GRID_WIDTH, 120, 4, true)}
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    )
                  }

                  // ─── FILE / DOCUMENT ─────────────────────────────
                  if (isDocument) {
                    const docPayloads = parseMediaContent(displayContent)
                    return (
                      <View style={{ gap: 8 }}>
                        {docPayloads.map((payload: any, pidx: number) => {
                          const { color: fileColor, label: fileLabel } = getFileIconInfo(payload)
                          const sizeLabel = payload.size ? formatBytes(payload.size) : ''
                          return (
                            <View
                              key={pidx}
                              style={[
                                styles.fileCard,
                                { backgroundColor: COLORS.fileBg, borderColor: COLORS.border }
                              ]}
                            >
                              <View
                                style={[styles.fileCardInfo, { backgroundColor: COLORS.surface }]}
                              >
                                <View
                                  style={[styles.fileTypeBadge, { backgroundColor: fileColor }]}
                                >
                                  <Text style={styles.fileTypeBadgeText}>{fileLabel}</Text>
                                </View>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                  <Text
                                    style={[styles.fileNameCardText, { color: COLORS.text }]}
                                    numberOfLines={1}
                                  >
                                    {payload.originalName}
                                  </Text>
                                  <View style={styles.fileMetaRow}>
                                    {sizeLabel ? (
                                      <Text
                                        style={[styles.fileMetaText, { color: COLORS.textLight }]}
                                      >
                                        {sizeLabel}
                                      </Text>
                                    ) : null}
                                    {sizeLabel ? (
                                      <Text
                                        style={[
                                          styles.fileMetaText,
                                          { color: COLORS.textLight, marginHorizontal: 4 }
                                        ]}
                                      >
                                        •
                                      </Text>
                                    ) : null}
                                    <Ionicons
                                      name="cloud-done-outline"
                                      size={12}
                                      color={COLORS.textLight}
                                    />
                                    <Text
                                      style={[
                                        styles.fileMetaText,
                                        { color: COLORS.textLight, marginLeft: 2 }
                                      ]}
                                    >
                                      Đã có trên Cloud
                                    </Text>
                                  </View>
                                </View>

                                {/* 🌟 Nút AI tóm tắt file */}
                                {!isTempMessage && onSummarizeFile && (
                                  <TouchableOpacity
                                    style={[bubbleStyles.fileAiBtn, { borderColor: COLORS.border }]}
                                    onPress={() => onSummarizeFile(item._id)}
                                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                  >
                                    <Text style={{ fontSize: 16 }}>✨</Text>
                                  </TouchableOpacity>
                                )}

                                {/* Nút download */}
                                <TouchableOpacity
                                  style={styles.downloadIconBtn}
                                  onPress={() => Linking.openURL(payload.url)}
                                >
                                  <Ionicons name="download-outline" size={20} color={COLORS.text} />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )
                        })}
                      </View>
                    )
                  }

                  // ─── TEXT ────────────────────────────────────────
                  return (
                    <Text
                      style={[
                        styles.messageText,
                        { color: isMe ? COLORS.headerText : COLORS.text, paddingRight: 5 }
                      ]}
                    >
                      {isAiGenerated && (
                        <Text style={{ color: isMe ? '#E9D5FF' : '#C084FC', fontWeight: '900' }}>
                          @PulseAI{' '}
                        </Text>
                      )}
                      {isAiGenerated ? displayContent.substring(9) : displayContent}
                    </Text>
                  )
                })()
              )}
            </View>
          </TouchableOpacity>

          {/* Time */}
          <Text
            style={[
              styles.messageTime,
              { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 2 }
            ]}
          >
            {formatTime(item.createdAt)}
            {item.isSending && ' ···'}
          </Text>

          {/* Reactions */}
          {reactionGroups.length > 0 && (
            <TouchableOpacity
              onPress={() => openReactionDetails(item)}
              style={[
                styles.reactionSummary,
                { alignSelf: isMe ? 'flex-end' : 'flex-start', marginTop: 2 }
              ]}
            >
              {reactionGroups.slice(0, 3).map((rg: any, i: number) => (
                <Text key={i} style={styles.reactionEmojiPreview}>
                  {rg.emoji}
                </Text>
              ))}
              <Text style={styles.reactionCountText}>{reactions.length}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )
}

// ────────────────────────────────────────────
// Extra styles chỉ dùng trong MessageBubble
// ────────────────────────────────────────────
const bubbleStyles = StyleSheet.create({
  // Nút ✨ overlay góc trên phải của ảnh đơn
  imageAiBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  // Nút ✨ trong file card (giữa badge và download)
  fileAiBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
    backgroundColor: 'rgba(99,102,241,0.08)'
  }
})
