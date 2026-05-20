// components/traffic/TrafficConversationItem.tsx
// Component hiển thị conversation ChatPulse Giao Thông được ghim đầu danh sách
// Tương đồng với ConversationItem trên web nhưng có badge đặc biệt

import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  onPress: () => void
}

export default function TrafficConversationItem({ onPress }: Props) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {/* PIN INDICATOR */}
      <View style={styles.pinBadge}>
        <Text style={styles.pinIcon}>📌</Text>
      </View>

      {/* AVATAR */}
      <View style={styles.avatarWrapper}>
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🚦</Text>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* CONTENT */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            ChatPulse Giao Thông
          </Text>
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          Hỏi về luật giao thông, mức phạt, quy định...
        </Text>
      </View>

      {/* RIGHT ARROW */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#0f1e38',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    position: 'relative'
  },
  pinBadge: {
    position: 'absolute',
    top: 8,
    right: 42
  },
  pinIcon: { fontSize: 10 },

  avatarWrapper: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarEmoji: { fontSize: 22 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0f172a'
  },

  content: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },
  name: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1
  },
  aiBadge: {
    backgroundColor: '#1e3a5f',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  aiBadgeText: {
    color: '#60a5fa',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  lastMessage: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18
  },

  arrow: { color: '#334155', fontSize: 22, fontWeight: '300', marginLeft: 4 }
})
