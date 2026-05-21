/**
 * FileSummaryModal.tsx
 * Modal tóm tắt nội dung file / hình ảnh bằng AI
 * Giống hệt FileSummaryModal.tsx ở frontend web
 *
 * Dùng: POST /messages/:messageId/summarize
 * Kết quả: { summary, sourceType, keyPoints }
 */
import React, { useEffect, useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { summarizeMessageApi } from '../../apis/chat.api'

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────
export interface SummarizeResult {
  summary: string
  sourceType: 'text' | 'image' | 'document' | 'spreadsheet' | 'chat' | 'unsupported'
  keyPoints?: string[]
  extra?: any
}

interface FileSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string | null
  isDarkMode?: boolean
  COLORS?: any
}

// ────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────
const getSourceLabel = (type?: string) => {
  switch (type) {
    case 'document':
      return 'Tài liệu văn bản'
    case 'spreadsheet':
      return 'Bảng tính'
    case 'image':
      return 'Hình ảnh'
    case 'text':
      return 'Văn bản'
    default:
      return 'Nội dung'
  }
}

const getSourceIcon = (type?: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'document':
      return 'document-text-outline'
    case 'spreadsheet':
      return 'grid-outline'
    case 'image':
      return 'image-outline'
    default:
      return 'information-circle-outline'
  }
}

const getSourceColor = (type?: string) => {
  switch (type) {
    case 'document':
      return '#3B82F6'
    case 'spreadsheet':
      return '#10B981'
    case 'image':
      return '#8B5CF6'
    default:
      return '#6B7280'
  }
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────
export const FileSummaryModal = ({
  isOpen,
  onClose,
  messageId,
  isDarkMode = false
}: FileSummaryModalProps) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SummarizeResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen || !messageId) return

    setLoading(true)
    setError('')
    setData(null)

    summarizeMessageApi(messageId)
      .then((res: any) => {
        setData(res.data?.result ?? null)
      })
      .catch((err: any) => {
        console.error('FileSummaryModal error:', err)
        setError('Có lỗi xảy ra khi AI đọc tài liệu này. Vui lòng thử lại.')
      })
      .finally(() => setLoading(false))
  }, [isOpen, messageId])

  const iconColor = getSourceColor(data?.sourceType)

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />

        <View style={[styles.container, isDarkMode && styles.containerDark]}>
          {/* Header */}
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={20} color="#E9D5FF" style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>✨ AI Phân tích tài liệu</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Loading */}
            {loading && (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={[styles.loadingText, isDarkMode && styles.textMuted]}>
                  AI đang đọc nội dung...
                </Text>
              </View>
            )}

            {/* Error */}
            {!!error && !loading && (
              <View style={[styles.errorBox, isDarkMode && styles.errorBoxDark]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#EF4444"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Result */}
            {data && !loading && (
              <View style={styles.resultWrapper}>
                {/* Source type badge */}
                <View style={[styles.typeBadge, { borderColor: iconColor + '40' }]}>
                  <Ionicons name={getSourceIcon(data.sourceType)} size={16} color={iconColor} />
                  <Text style={[styles.typeBadgeText, { color: iconColor }]}>
                    Loại: {getSourceLabel(data.sourceType)}
                  </Text>
                </View>

                {/* Summary */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
                    Tóm tắt nội dung:
                  </Text>
                  <View style={[styles.summaryBox, isDarkMode && styles.summaryBoxDark]}>
                    <Text style={[styles.summaryText, isDarkMode && styles.textMuted]}>
                      {data.summary}
                    </Text>
                  </View>
                </View>

                {/* Key points */}
                {data.keyPoints && data.keyPoints.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDarkMode && styles.textLight]}>
                      Các ý chính:
                    </Text>
                    {data.keyPoints.map((point, idx) => (
                      <View key={idx} style={styles.keyPointRow}>
                        <Text style={{ color: '#6366F1', marginRight: 8, marginTop: 2 }}>•</Text>
                        <Text style={[styles.keyPointText, isDarkMode && styles.textMuted]}>
                          {point}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          {!loading && (
            <View style={styles.footer}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>Đã hiểu</Text>
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
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  container: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '80%',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20
  },
  containerDark: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  body: {
    maxHeight: 380
  },
  bodyContent: {
    padding: 18
  },
  loadingWrapper: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 14
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic'
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  errorBoxDark: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.3)'
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    flex: 1,
    lineHeight: 20
  },
  resultWrapper: {
    gap: 16
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(99,102,241,0.06)',
    alignSelf: 'flex-start'
  },
  typeBadgeText: {
    fontSize: 13,
    fontWeight: '600'
  },
  section: {
    gap: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827'
  },
  textLight: {
    color: '#F8FAFC'
  },
  textMuted: {
    color: '#94A3B8'
  },
  summaryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  summaryBoxDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155'
  },
  summaryText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 22
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4
  },
  keyPointText: {
    flex: 1,
    color: '#4B5563',
    fontSize: 14,
    lineHeight: 22
  },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: 10
  },
  closeBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center'
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5
  }
})
