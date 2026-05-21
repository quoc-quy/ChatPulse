import React from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

// ─── Format giờ: "6:35" / "18:35" ─────────────────────────────────────────
const fmt = (d: string) => {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.getHours()}:${dt.getMinutes().toString().padStart(2, '0')}`
}

const shouldShowTime = (item: any, newerMsg: any): boolean => {
  if (!newerMsg || newerMsg.isGroup) return true
  if (newerMsg.type === 'system' || newerMsg.type === 'system_error') return true
  const sameSender =
    (newerMsg.sender?._id || newerMsg.senderId) === (item.sender?._id || item.senderId)
  if (!sameSender) return true
  const diff = new Date(newerMsg.createdAt).getTime() - new Date(item.createdAt).getTime()
  return diff > 5 * 60 * 1000
}

export const MessageBubble = ({
  item,
  index,
  groupedMessages,
  isMe,
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
  onSummarizeFile,
  COLORS,
  styles,
  t,
  isDarkMode,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  messages
}: any) => {
  if (item.isGroup) {
    return (
      <View
        style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}
      />
    )
  }

  const olderMsg = index < groupedMessages.length - 1 ? groupedMessages[index + 1] : null
  const newerMsg = index > 0 ? groupedMessages[index - 1] : null

  // ── System message ───────────────────────────────────────────────────────
  if (item.type === 'system' || item.type === 'system_error') {
    const showDateDiv =
      new Date(item.createdAt).toDateString() !==
        (olderMsg ? new Date(olderMsg.createdAt).toDateString() : null) &&
      item.type !== 'system_error'
    return (
      <View>
        {showDateDiv && (
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

  // ── Computed values ──────────────────────────────────────────────────────
  const showDateDivider =
    new Date(item.createdAt).toDateString() !==
    (olderMsg ? new Date(olderMsg.createdAt).toDateString() : null)

  const currentSenderId = item.sender?._id || item.senderId
  const olderSenderId = olderMsg ? olderMsg.sender?._id || olderMsg.senderId : null
  const isFirstInGroup = currentSenderId !== olderSenderId || showDateDivider

  const showTime = shouldShowTime(item, newerMsg)
  const timeStr = fmt(item.createdAt) + (item.isSending ? ' ···' : '')

  const isHighlighted = item._id === highlightedMsgId
  const displayContent = item.content || ''
  const isAiGenerated = typeof displayContent === 'string' && displayContent.startsWith('@PulseAI ')
  const isTempMessage = String(item._id).startsWith('temp_') || item.isSending
  const isRevoked = item.type === 'revoked'

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

  const reactions = item.reactions || []
  const reactionGroups = buildReactionGroups(reactions)

  // ── Call message ─────────────────────────────────────────────────────────
  if (item.type === 'call') {
    const ci = item.callInfo || {}
    const isVid = ci.type === 'video'
    const fmtDur = (s: number) => {
      if (!s) return '0 giây'
      const h = Math.floor(s / 3600),
        m = Math.floor((s % 3600) / 60),
        sec = s % 60
      if (h > 0) return `${h} giờ ${m} phút`
      if (m > 0) return `${m} phút ${sec} giây`
      return `${sec} giây`
    }
    type Cfg = { title: string; subtitle: string; icon: string; iconColor: string; iconBg: string }
    const cfgMap: Record<string, Cfg> = {
      completed: {
        title: isMe ? 'Cuộc gọi đi' : 'Cuộc gọi đến',
        subtitle: fmtDur(ci.duration || 0),
        icon: isVid ? 'videocam' : 'call',
        iconColor: isMe ? '#3B82F6' : '#10B981',
        iconBg: isMe ? (isDarkMode ? '#1E3A5F' : '#DBEAFE') : isDarkMode ? '#064E3B' : '#D1FAE5'
      },
      rejected: {
        title: isMe ? 'Người nhận từ chối' : 'Bạn đã hủy',
        subtitle: isVid ? 'Cuộc gọi Video' : 'Cuộc gọi thoại',
        icon: 'call',
        iconColor: '#EF4444',
        iconBg: isDarkMode ? '#450A0A' : '#FEE2E2'
      },
      cancelled: {
        title: isMe ? 'Bạn đã hủy' : 'Bạn bị nhỡ',
        subtitle: isVid ? 'Cuộc gọi Video' : 'Cuộc gọi thoại',
        icon: 'call',
        iconColor: isMe ? '#6B7280' : '#EF4444',
        iconBg: isMe ? (isDarkMode ? '#1F2937' : '#F3F4F6') : isDarkMode ? '#450A0A' : '#FEE2E2'
      },
      missed: {
        title: isMe ? 'Người nhận bận' : 'Bạn bị nhỡ',
        subtitle: isVid ? 'Cuộc gọi Video' : 'Cuộc gọi thoại',
        icon: 'call',
        iconColor: '#EF4444',
        iconBg: isDarkMode ? '#450A0A' : '#FEE2E2'
      }
    }
    const cfg = cfgMap[ci.status] || {
      title: 'Cuộc gọi',
      subtitle: isVid ? 'Cuộc gọi Video' : 'Cuộc gọi thoại',
      icon: isVid ? 'videocam' : 'call',
      iconColor: '#6B7280',
      iconBg: isDarkMode ? '#374151' : '#F3F4F6'
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
            B.row,
            isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
            isHighlighted && { backgroundColor: 'rgba(253,224,71,0.12)', borderRadius: 12 },
            { marginBottom: 4 }
          ]}
        >
          {!isMe && (
            <View style={B.avatarCol}>
              {isFirstInGroup ? (
                <View style={[styles.avatarSmall, { marginTop: 18 }]}>
                  <Text style={styles.avatarText}>
                    {(item.sender?.userName || item.sender?.displayName || 'U')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              ) : (
                <View style={{ width: 32 }} />
              )}
            </View>
          )}
          <View style={[styles.messageContent, isMe && { alignItems: 'flex-end' }]}>
            {!isMe && isFirstInGroup && (
              <Text style={B.senderName}>
                {item.sender?.userName || item.sender?.displayName || 'Người dùng'}
              </Text>
            )}
            <View
              style={[
                B.callCard,
                {
                  backgroundColor: isMe
                    ? isDarkMode
                      ? 'rgba(139,92,246,0.15)'
                      : 'rgba(139,92,246,0.07)'
                    : isDarkMode
                      ? COLORS.surface
                      : '#FFFFFF',
                  borderColor: isMe
                    ? isDarkMode
                      ? 'rgba(139,92,246,0.3)'
                      : 'rgba(139,92,246,0.2)'
                    : isDarkMode
                      ? COLORS.border
                      : '#E5E7EB',
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4
                }
              ]}
            >
              <View style={B.callRow}>
                <View style={[B.callIcon, { backgroundColor: cfg.iconBg }]}>
                  <Ionicons name={cfg.icon as any} size={20} color={cfg.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[B.callTitle, { color: isDarkMode ? '#F1F5F9' : '#1F2937' }]}
                    numberOfLines={1}
                  >
                    {cfg.title}
                  </Text>
                  <Text style={[B.callSub, { color: COLORS.textLight }]} numberOfLines={1}>
                    {cfg.subtitle}
                  </Text>
                </View>
                {showTime && (
                  <Text style={[B.callTime, { color: COLORS.textLight }]}>{timeStr}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const handleMediaPress = () => {
    if (isImage || isVideo) {
      const urls = mediaPayloads.map((p: any) => p.url)
      setPreviewMedia({
        items: urls.map((u: string) => ({ id: item._id, url: u, isVideo })),
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
          B.row,
          isMe ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' },
          isHighlighted && { backgroundColor: 'rgba(253,224,71,0.12)', borderRadius: 12 },
          { marginBottom: 4 }
        ]}
      >
        {!isMe && (
          <View style={B.avatarCol}>
            {isFirstInGroup ? (
              <View style={[styles.avatarSmall, { marginTop: 18 }]}>
                <Text style={styles.avatarText}>
                  {(item.sender?.userName || item.sender?.displayName || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>
        )}

        <View style={[styles.messageContent, isMe && { alignItems: 'flex-end' }]}>
          {!isMe && isFirstInGroup && (
            <Text style={B.senderName}>
              {item.sender?.userName || item.sender?.displayName || 'Người dùng'}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleMediaPress}
            onLongPress={(e) => handleLongPress(e, item)}
            activeOpacity={0.9}
          >
            {/* ══ CASE 1: FILE / DOCUMENT ══════════════════════════════════════ */}
            {isDocument ? (
              <View style={{ gap: 8 }}>
                {parseMediaContent(displayContent).map((payload: any, pidx: number) => {
                  const { color: fc, label: fl } = getFileIconInfo(payload)
                  const sz = payload.size ? formatBytes(payload.size) : ''
                  return (
                    <View
                      key={pidx}
                      style={[
                        B.fileCard,
                        {
                          backgroundColor: isDarkMode ? '#1E1B4B' : '#F5F3FF',
                          borderColor: isDarkMode ? '#4C1D95' : '#DDD6FE'
                        }
                      ]}
                    >
                      <View
                        style={[
                          B.fileMainRow,
                          { backgroundColor: isDarkMode ? '#1E293B' : '#FFFFFF' }
                        ]}
                      >
                        <View style={[B.fileBadge, { backgroundColor: fc }]}>
                          <Text style={B.fileBadgeText}>{fl}</Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                          <Text style={[B.fileName, { color: COLORS.text }]} numberOfLines={1}>
                            {payload.originalName}
                          </Text>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
                          >
                            {!!sz && (
                              <Text style={[B.fileMeta, { color: COLORS.textLight }]}>{sz} • </Text>
                            )}
                            <Ionicons
                              name="cloud-done-outline"
                              size={11}
                              color={COLORS.textLight}
                            />
                            <Text style={[B.fileMeta, { color: COLORS.textLight, marginLeft: 2 }]}>
                              Đã có trên Cloud
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[
                            B.downloadBtn,
                            {
                              backgroundColor: isDarkMode ? '#0F172A' : '#F1F5F9',
                              borderColor: isDarkMode ? '#334155' : '#E2E8F0'
                            }
                          ]}
                          onPress={() => Linking.openURL(payload.url)}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                        >
                          <Ionicons name="download-outline" size={18} color={COLORS.text} />
                        </TouchableOpacity>
                      </View>
                      <View
                        style={[
                          B.fileFooter,
                          { borderTopColor: isDarkMode ? '#2D1B69' : '#EDE9FE' }
                        ]}
                      >
                        {!isTempMessage && onSummarizeFile ? (
                          <TouchableOpacity
                            style={B.aiBtn}
                            onPress={() => onSummarizeFile(item._id)}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 13 }}>✨</Text>
                            <Text
                              style={[B.aiBtnText, { color: isDarkMode ? '#A78BFA' : '#7C3AED' }]}
                            >
                              Tóm tắt bằng AI
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )}
                        {showTime && (
                          <Text style={[B.fileTime, { color: COLORS.textLight }]}>{timeStr}</Text>
                        )}
                      </View>
                    </View>
                  )
                })}
              </View>
            ) : isVideo || isImage ? (
              /* ══ CASE 2: HÌNH ẢNH / VIDEO (ĐÃ LOẠI BỎ KHUNG BONG BÓNG CHAT) ══ */
              <View style={[item.isSending && { opacity: 0.6 }]}>
                {(() => {
                  const parsedUrls: string[] = mediaPayloads.map((p: any) => p.url)
                  const GW = 240,
                    GAP = 4

                  const renderGrid = (
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
                          items: parsedUrls.map((u) => ({
                            id: item._id,
                            url: u,
                            isVideo: false
                          })),
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
                          borderRadius: 14,
                          backgroundColor: COLORS.surfaceSoft
                        }}
                        resizeMode="cover"
                      />
                      {isLast && parsedUrls.length > 5 && (
                        <View
                          style={{
                            ...StyleSheet.absoluteFillObject,
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: 14,
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

                  const cnt = parsedUrls.length
                  return (
                    <View style={{ position: 'relative' }}>
                      {cnt === 1 ? (
                        isVideo ? (
                          <VideoThumbnail url={parsedUrls[0]} />
                        ) : (
                          <View>
                            <Image
                              source={{ uri: parsedUrls[0] }}
                              style={[styles.mediaImage, { borderRadius: 14 }]}
                              resizeMode="cover"
                            />
                            {!isTempMessage && onSummarizeFile && (
                              <TouchableOpacity
                                onPress={() => onSummarizeFile(item._id)}
                                style={B.imgAiBtn}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Text style={{ fontSize: 13 }}>✨</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        )
                      ) : (
                        <View style={{ gap: GAP }}>
                          {cnt === 2 && (
                            <View style={{ flexDirection: 'row', gap: GAP }}>
                              {renderGrid(parsedUrls[0], (GW - GAP) / 2, 160, 0)}
                              {renderGrid(parsedUrls[1], (GW - GAP) / 2, 160, 1)}
                            </View>
                          )}
                          {cnt >= 3 && (
                            <View
                              style={{
                                flexDirection: 'row',
                                gap: GAP,
                                flexWrap: 'wrap',
                                width: GW
                              }}
                            >
                              {parsedUrls
                                .slice(0, 4)
                                .map((u, i) => renderGrid(u, (GW - GAP) / 2, 120, i))}
                              {cnt > 4 && renderGrid(parsedUrls[4], GW, 120, 4, true)}
                            </View>
                          )}
                        </View>
                      )}
                      {showTime && (
                        <View style={B.mediaTimeWrap}>
                          <Text style={B.mediaTimeText}>{timeStr}</Text>
                        </View>
                      )}
                    </View>
                  )
                })()}
              </View>
            ) : (
              /* ══ CASE 3: TIN NHẮN VĂN BẢN (GIỮ NGUYÊN BONG BÓNG CHAT CHUẨN) ══ */
              <View
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleMe : styles.bubbleOther,
                  isRevoked && {
                    backgroundColor: isDarkMode ? '#1E2946' : '#E2E8F0',
                    opacity: 0.6
                  },
                  item.isSending && { opacity: 0.6 }
                ]}
              >
                {isRevoked ? (
                  <Text
                    style={[styles.messageText, { fontStyle: 'italic', color: COLORS.textLight }]}
                  >
                    {t.messageRevoked}
                  </Text>
                ) : (
                  <View>
                    <Text
                      style={[
                        styles.messageText,
                        { color: isMe ? COLORS.headerText : COLORS.text }
                      ]}
                    >
                      {isAiGenerated && (
                        <Text style={{ color: isMe ? '#E9D5FF' : '#C084FC', fontWeight: '900' }}>
                          @PulseAI{' '}
                        </Text>
                      )}
                      {isAiGenerated ? displayContent.substring(9) : displayContent}
                    </Text>
                    {showTime && (
                      <Text
                        style={[
                          B.textTime,
                          { alignSelf: isMe ? 'flex-end' : 'flex-start' },
                          { color: isMe ? 'rgba(255,255,255,0.6)' : COLORS.textLight }
                        ]}
                      >
                        {timeStr}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

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

// ── Styles ────────────────────────────────────────────────────────────────────
const B = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12
  },
  avatarCol: {
    width: 40,
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginRight: 4
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 3,
    marginLeft: 2
  },
  textTime: {
    fontSize: 10,
    marginTop: 3
  },
  mediaTimeWrap: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  mediaTimeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '500'
  },
  imgAiBtn: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  fileCard: {
    width: 252,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 2
  },
  fileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  fileBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0
  },
  fileBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.3
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  fileMeta: {
    fontSize: 11,
    lineHeight: 16
  },
  downloadBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  fileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  aiBtnText: {
    fontSize: 12,
    fontWeight: '600'
  },
  fileTime: {
    fontSize: 10
  },
  callCard: {
    minWidth: 210,
    maxWidth: 270,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden'
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  callTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2
  },
  callSub: { fontSize: 12 },
  callTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    flexShrink: 0
  }
})
