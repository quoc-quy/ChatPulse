/**
 * TrafficMessage.tsx — Mobile
 * Render một message trong cuộc hội thoại TrafficBot.
 * - User message: bubble xanh căn phải
 * - Bot message: render TrafficCard (card đẹp) hoặc text nếu không có card
 */

import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Clipboard,
  ToastAndroid,
  Platform
} from 'react-native'
import { TrafficCard, TrafficResponseCard } from './TrafficCard'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type TrafficMessageType = {
  id: string
  role: 'user' | 'bot'
  content: string
  timestamp: Date
  cardData?: TrafficResponseCard | null
  isError?: boolean
}

interface Props {
  message: TrafficMessageType
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export const TrafficMessage = ({ message }: Props) => {
  const isBot = message.role === 'bot'

  const copyToClipboard = () => {
    Clipboard.setString(message.content)
    if (Platform.OS === 'android') {
      ToastAndroid.show('Đã sao chép!', ToastAndroid.SHORT)
    }
  }

  // ── User message ─────────────────────────────
  if (!isBot) {
    return (
      <View style={styles.userWrapper}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.content}</Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  // ── Bot error message ────────────────────────
  if (message.isError) {
    return (
      <View style={styles.botWrapper}>
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarEmoji}>🚦</Text>
        </View>
        <View style={styles.errorBubble}>
          <Text style={styles.errorText}>{message.content}</Text>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    )
  }

  // ── Bot message with card ────────────────────
  if (message.cardData) {
    return (
      <View style={styles.botCardWrapper}>
        {/* Avatar row */}
        <View style={styles.botAvatarRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botAvatarEmoji}>🚦</Text>
          </View>
          <Text style={styles.botLabel}>ChatPulse Giao Thông</Text>
        </View>

        {/* Card */}
        <View style={styles.cardIndent}>
          <TrafficCard data={message.cardData} />
        </View>

        {/* Footer: timestamp + copy */}
        <View style={[styles.cardFooter, styles.cardIndent]}>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn} activeOpacity={0.7}>
            <Text style={styles.copyText}>📋 Sao chép</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ── Bot plain text (fallback) ────────────────
  return (
    <View style={styles.botWrapper}>
      <View style={styles.botAvatar}>
        <Text style={styles.botAvatarEmoji}>🚦</Text>
      </View>
      <View style={styles.botBubble}>
        <Text style={styles.botText}>{message.content}</Text>
        <View style={styles.msgFooter}>
          <Text style={styles.timestamp}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <TouchableOpacity onPress={copyToClipboard} style={styles.copyBtn} activeOpacity={0.7}>
            <Text style={styles.copyText}>Sao chép</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── User ─────────────────────────────────────
  userWrapper: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 4
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%'
  },
  userText: { color: '#ffffff', fontSize: 14, lineHeight: 21 },

  // ── Bot with card ────────────────────────────
  botCardWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  botAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6
  },
  botLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600'
  },
  cardIndent: { paddingLeft: 42 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingRight: 4
  },

  // ── Bot plain bubble ─────────────────────────
  botWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8
  },
  botBubble: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%'
  },
  botText: { color: '#f1f5f9', fontSize: 14, lineHeight: 21 },

  // ── Error bubble ─────────────────────────────
  errorBubble: {
    backgroundColor: '#2d0a0a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%'
  },
  errorText: { color: '#fca5a5', fontSize: 13, lineHeight: 20 },

  // ── Bot avatar ───────────────────────────────
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  botAvatarEmoji: { fontSize: 14 },

  // ── Shared ───────────────────────────────────
  msgFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  timestamp: { color: '#475569', fontSize: 10 },
  copyBtn: { padding: 2 },
  copyText: { color: '#475569', fontSize: 10 }
})
