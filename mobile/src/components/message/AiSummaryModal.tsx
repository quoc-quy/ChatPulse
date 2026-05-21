/**
 * AiSummaryModal.tsx  [UPDATED]
 * Modal tóm tắt hội thoại bằng AI — giống hệt frontend web
 *
 * Hiển thị ConversationSummary: topic / decisions / openQuestions / actionItems
 */
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'

// ────────────────────────────────────────────
// Types — khớp với ConversationSummary ở frontend web
// ────────────────────────────────────────────
export interface ConversationSummary {
  topic: string
  decisions: string[]
  openQuestions: string[]
  actionItems: { task: string; assignee: string; messageId?: string }[]
}

interface AiSummaryModalProps {
  showAiModal: boolean
  setShowAiModal: (v: boolean) => void
  isAiProcessing: boolean
  /** Kết quả từ API, kiểu ConversationSummary | null */
  summaryData: ConversationSummary | null
  t: any
  styles: any
  isDarkMode?: boolean
}

// ────────────────────────────────────────────
// Sub-component: Section header
// ────────────────────────────────────────────
const SectionHeader = ({
  icon,
  label,
  color
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  color: string
}) => (
  <View style={innerStyles.sectionHeader}>
    <Ionicons name={icon} size={15} color={color} />
    <Text style={[innerStyles.sectionTitle, { color }]}>{label}</Text>
  </View>
)

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
export const AiSummaryModal = ({
  showAiModal,
  setShowAiModal,
  isAiProcessing,
  summaryData,
  t,
  isDarkMode = false
}: AiSummaryModalProps) => {
  const isEmpty =
    !isAiProcessing &&
    summaryData &&
    summaryData.decisions.length === 0 &&
    summaryData.actionItems.length === 0 &&
    summaryData.openQuestions.length === 0

  return (
    <Modal
      visible={showAiModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowAiModal(false)}
    >
      <View style={innerStyles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={[innerStyles.container, isDarkMode && innerStyles.containerDark]}>
          {/* Header */}
          <LinearGradient colors={['#1e1b4b', '#0f172a']} style={innerStyles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="sparkles" size={20} color="#A78BFA" style={{ marginRight: 8 }} />
              <Text style={innerStyles.headerTitle}>
                {t?.messageAiSummaryTitle ?? 'Tóm tắt hội thoại'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAiModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={26} color="#475569" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Body */}
          <ScrollView
            style={innerStyles.body}
            contentContainerStyle={innerStyles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Loading skeleton */}
            {isAiProcessing && (
              <View style={innerStyles.loadingWrapper}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={innerStyles.loadingText}>
                  {t?.messageAiDecoding ?? 'AI đang phân tích...'}
                </Text>
                {/* Skeleton bars */}
                <View style={{ width: '100%', marginTop: 24, gap: 10 }}>
                  {[0.7, 0.5, 0.85, 0.6].map((w, i) => (
                    <View
                      key={i}
                      style={[innerStyles.skeletonBar, { width: `${w * 100}%` as any }]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* No new messages */}
            {!isAiProcessing && isEmpty && (
              <View style={innerStyles.emptyWrapper}>
                <Ionicons name="checkmark-circle-outline" size={40} color="#6B7280" />
                <Text style={innerStyles.emptyText}>
                  {summaryData?.topic ?? 'Không có tin nhắn mới nào cần tóm tắt'}
                </Text>
              </View>
            )}

            {/* Structured result */}
            {!isAiProcessing && summaryData && !isEmpty && (
              <View style={{ gap: 18 }}>
                {/* Topic */}
                <View style={innerStyles.topicBox}>
                  <Text style={innerStyles.topicLabel}>⚡ Chủ đề</Text>
                  <Text style={innerStyles.topicText}>{summaryData.topic}</Text>
                </View>

                {/* Decisions */}
                {summaryData.decisions.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <SectionHeader
                      icon="checkmark-done-outline"
                      label="Quyết định quan trọng"
                      color="#3B82F6"
                    />
                    {summaryData.decisions.map((d, i) => (
                      <View key={i} style={innerStyles.bulletRow}>
                        <Text style={{ color: '#3B82F6', marginRight: 8, marginTop: 2 }}>•</Text>
                        <Text style={innerStyles.bulletText}>{d}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Open questions */}
                {summaryData.openQuestions.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <SectionHeader
                      icon="help-circle-outline"
                      label="Câu hỏi còn mở"
                      color="#F59E0B"
                    />
                    {summaryData.openQuestions.map((q, i) => (
                      <View key={i} style={innerStyles.bulletRow}>
                        <Text style={{ color: '#F59E0B', marginRight: 8, marginTop: 2 }}>?</Text>
                        <Text style={innerStyles.bulletText}>{q}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action items */}
                {summaryData.actionItems.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <SectionHeader icon="flash-outline" label="Hành động cần làm" color="#EF4444" />
                    {summaryData.actionItems.map((item, i) => (
                      <View key={i} style={innerStyles.actionCard}>
                        <View style={innerStyles.assigneeBadge}>
                          <Text style={innerStyles.assigneeText}>@{item.assignee}</Text>
                        </View>
                        <Text style={innerStyles.taskText}>{item.task}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {!isAiProcessing && (
            <View style={innerStyles.footer}>
              <TouchableOpacity onPress={() => setShowAiModal(false)} activeOpacity={0.8}>
                <LinearGradient colors={['#5b21b6', '#1e1b4b']} style={innerStyles.closeBtn}>
                  <Text style={innerStyles.closeBtnText}>Đã hiểu</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────
const innerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  container: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20
  },
  containerDark: {
    // already dark by default
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  body: {
    maxHeight: 440
  },
  bodyContent: {
    padding: 20
  },
  loadingWrapper: {
    alignItems: 'center',
    paddingVertical: 30
  },
  loadingText: {
    marginTop: 14,
    color: '#94A3B8',
    fontSize: 14,
    fontStyle: 'italic'
  },
  skeletonBar: {
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 6
  },
  emptyWrapper: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 14
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22
  },
  topicBox: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
    gap: 6
  },
  topicLabel: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  topicText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700'
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4
  },
  bulletText: {
    flex: 1,
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22
  },
  actionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155'
  },
  assigneeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,68,68,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8
  },
  assigneeText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700'
  },
  taskText: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10
  },
  closeBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4C1D95'
  },
  closeBtnText: {
    color: '#DDD6FE',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1
  }
})
