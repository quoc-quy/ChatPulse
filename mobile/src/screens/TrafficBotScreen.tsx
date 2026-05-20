// screens/TrafficBotScreen.tsx
// Màn hình chat AI Giao Thông - tương đồng với web frontend

import React, { useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  SafeAreaView
} from 'react-native'
import { TrafficMessage } from '../components/traffic/TrafficMessage'
import TrafficQuickSuggestion from '../components/traffic/TrafficQuickSuggestion'
import { useTrafficBot } from '../hooks/useTrafficBot'

// ─── QUICK SUGGESTIONS (giống web) ─────────────────────────────────────────
const QUICK_SUGGESTIONS = [
  { id: '1', icon: '🚗', label: 'Tốc độ tối đa đường cao tốc' },
  { id: '2', icon: '🍺', label: 'Nồng độ cồn khi lái xe' },
  { id: '3', icon: '📱', label: 'Dùng điện thoại khi lái xe' },
  { id: '4', icon: '🪖', label: 'Quy định đội mũ bảo hiểm' },
  { id: '5', icon: '🚦', label: 'Vượt đèn đỏ bị phạt bao nhiêu?' },
  { id: '6', icon: '🅿️', label: 'Đỗ xe sai quy định phạt thế nào?' }
]

export default function TrafficBotScreen({ navigation }: any) {
  const [inputText, setInputText] = useState('')
  const flatListRef = useRef<FlatList>(null)
  const { messages, isLoading, sendMessage } = useTrafficBot()

  const handleSend = useCallback(
    async (text?: string) => {
      const query = (text || inputText).trim()
      if (!query || isLoading) return
      setInputText('')
      await sendMessage(query)
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100)
    },
    [inputText, isLoading, sendMessage]
  )

  const handleSuggestion = useCallback(
    (label: string) => {
      handleSend(label)
    },
    [handleSend]
  )

  // Header component rendered inside FlatList as ListHeaderComponent
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Bot Avatar & Welcome */}
      <View style={styles.welcomeSection}>
        <View style={styles.botAvatarLarge}>
          <Text style={styles.botAvatarEmoji}>🚦</Text>
          <View style={styles.onlineDotLarge} />
        </View>
        <Text style={styles.welcomeTitle}>ChatPulse Giao Thông</Text>
        <Text style={styles.welcomeSubtitle}>Trợ lý AI về luật giao thông Việt Nam</Text>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeText}>Powered by RAG · Dữ liệu pháp luật VN</Text>
        </View>
      </View>

      {/* Quick suggestions */}
      <Text style={styles.suggestLabel}>Câu hỏi gợi ý</Text>
      <View style={styles.suggestGrid}>
        {QUICK_SUGGESTIONS.map((s) => (
          <TrafficQuickSuggestion
            key={s.id}
            icon={s.icon}
            label={s.label}
            onPress={() => handleSuggestion(s.label)}
          />
        ))}
      </View>
    </View>
  )

  const renderEmpty = () => (messages.length === 0 ? null : null) // header handles empty state

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* ── TOP NAV BAR ── */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={styles.navBack}
          onPress={() => navigation?.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.navBackIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.navCenter}>
          <View style={styles.botAvatarSmall}>
            <Text style={styles.botAvatarSmallEmoji}>🚦</Text>
            <View style={styles.onlineDotSmall} />
          </View>
          <View>
            <Text style={styles.navTitle}>ChatPulse Giao Thông</Text>
            <Text style={styles.navSubtitle}>{isLoading ? 'Đang trả lời...' : 'Trực tuyến'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.navAction} activeOpacity={0.7}>
          <Text style={styles.navActionIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* ── MESSAGE LIST ── */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TrafficMessage message={item} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.typingContainer}>
                <View style={styles.botAvatarSmall}>
                  <Text style={styles.botAvatarSmallEmoji}>🚦</Text>
                </View>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDots}>
                    <TypingDot delay={0} />
                    <TypingDot delay={200} />
                    <TypingDot delay={400} />
                  </View>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            messages.length > 0 && flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* ── INPUT BAR ── */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Hỏi về luật giao thông..."
              placeholderTextColor="#64748b"
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendIcon}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Typing dots component ────────────────────────────────────────────────────
import { useEffect, useRef as useAnimRef } from 'react'
import { Animated } from 'react-native'

function TypingDot({ delay }: { delay: number }) {
  const opacity = useAnimRef(new Animated.Value(0.3)).current
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 300, useNativeDriver: true })
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [delay, opacity])
  return <Animated.View style={[styles.dot, { opacity }]} />
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  flex: { flex: 1 },

  // NAV BAR
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  navBack: { padding: 8, marginRight: 4 },
  navBackIcon: { color: '#94a3b8', fontSize: 22, fontWeight: '300' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  navTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  navSubtitle: { color: '#22c55e', fontSize: 11, fontWeight: '500' },
  navAction: { padding: 8 },
  navActionIcon: { color: '#64748b', fontSize: 22 },

  // HEADER SECTION
  headerContainer: { paddingBottom: 8 },
  welcomeSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  botAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1e3a5f',
    borderWidth: 3,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative'
  },
  botAvatarEmoji: { fontSize: 32 },
  onlineDotLarge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#0f172a'
  },
  welcomeTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3
  },
  welcomeSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  badgeText: { color: '#64748b', fontSize: 11, fontWeight: '500' },

  // SUGGESTIONS
  suggestLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    marginBottom: 10
  },
  suggestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8
  },

  // MESSAGE LIST
  listContent: { paddingBottom: 12 },

  // TYPING INDICATOR
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8
  },
  typingBubble: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  typingDots: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#3b82f6' },

  // INPUT BAR
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center'
  },
  input: {
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 20,
    padding: 0
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendBtnDisabled: { backgroundColor: '#1e3a5f', opacity: 0.6 },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // BOT AVATAR SMALL (reused)
  botAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    borderWidth: 2,
    borderColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  botAvatarSmallEmoji: { fontSize: 14 },
  onlineDotSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#0f172a'
  }
})
