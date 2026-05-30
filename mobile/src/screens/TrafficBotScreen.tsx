// screens/TrafficBotScreen.tsx
// Màn hình chat AI Giao Thông - tương đồng với web frontend

import React, { useState, useRef, useCallback, useEffect, useRef as useAnimRef } from 'react'
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
  Animated
} from 'react-native'
import { useTheme } from '../contexts/ThemeContext'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
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
  const { isDarkMode, colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = getStyles(colors, isDarkMode, insets)

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
    <View style={styles.safeArea}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0f172a' : '#f8fafc'}
      />

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
              placeholderTextColor={isDarkMode ? '#64748b' : '#94a3b8'}
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
    </View>
  )
}

// ── Typing dots component ────────────────────────────────────────────────────

function TypingDot({ delay }: { delay: number }) {
  const { isDarkMode, colors } = useTheme()
  const styles = getStyles(colors, isDarkMode, { top: 0, bottom: 0 })
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
const getStyles = (colors: any, isDarkMode: boolean, insets: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
  flex: { flex: 1 },

  // NAV BAR
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: insets.top > 0 ? insets.top + 8 : 32, // Tránh đè nút status bar / tai thỏ
    paddingBottom: 10,
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e293b' : '#e2e8f0'
  },
  navBack: { padding: 8, marginRight: 4 },
  navBackIcon: { color: isDarkMode ? '#94a3b8' : '#475569', fontSize: 22, fontWeight: '300' },
  navCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  navTitle: { color: isDarkMode ? '#f1f5f9' : '#0f172a', fontSize: 15, fontWeight: '700' },
  navSubtitle: { color: '#22c55e', fontSize: 11, fontWeight: '500' },
  navAction: { padding: 8 },
  navActionIcon: { color: isDarkMode ? '#64748b' : '#94a3b8', fontSize: 22 },

  // HEADER SECTION
  headerContainer: { paddingBottom: 8 },
  welcomeSection: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 },
  botAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe',
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
    borderColor: isDarkMode ? '#0f172a' : '#f8fafc'
  },
  welcomeTitle: {
    color: isDarkMode ? '#f1f5f9' : '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.3
  },
  welcomeSubtitle: {
    color: isDarkMode ? '#94a3b8' : '#475569',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6' },
  badgeText: { color: isDarkMode ? '#64748b' : '#475569', fontSize: 11, fontWeight: '500' },

  // SUGGESTIONS
  suggestLabel: {
    color: isDarkMode ? '#64748b' : '#475569',
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
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
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
    paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12, // Tránh đè các nút điều hướng ảo Android / iOS Home Indicator
    backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? '#1e293b' : '#e2e8f0',
    gap: 8
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center'
  },
  input: {
    color: isDarkMode ? '#f1f5f9' : '#0f172a',
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
  sendBtnDisabled: { backgroundColor: isDarkMode ? '#1e3a5f' : '#bfdbfe', opacity: 0.6 },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // BOT AVATAR SMALL (reused)
  botAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDarkMode ? '#1e3a5f' : '#dbeafe',
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
    borderColor: isDarkMode ? '#0f172a' : '#f8fafc'
  }
})
