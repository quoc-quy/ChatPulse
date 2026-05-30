/**
 * TrafficCard.tsx — Mobile (React Native)
 * Đồng bộ hoàn toàn với frontend web TrafficCard.tsx
 * Hỗ trợ đầy đủ 3 kiểu card: violation | general | not_found
 */

import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

// ─────────────────────────────────────────────
// TYPES — đồng bộ với backend TrafficRagService
// ─────────────────────────────────────────────

export interface LegalReference {
  location: string // VD: "Điểm e, Khoản 4, Điều 6"
  documentId: string // VD: "168/2024/NĐ-CP"
  documentName: string // Tên đầy đủ văn bản
  url?: string
}

export interface PenaltyInfo {
  vehicleType: string // VD: "Xe máy", "Ô tô"
  fineRange: string // VD: "800.000 – 1.000.000 VNĐ"
  additionalPenalties: string[]
  pointDeduction?: string
}

export interface TrafficViolationCard {
  type: 'violation'
  title: string
  behavior: string
  userFriendlyExplanation: string
  penalties: PenaltyInfo[]
  legalRefs: LegalReference[]
  practicalAdvice: string
  note?: string
}

export interface GeneralInfoCard {
  type: 'general'
  title: string
  summary: string
  userFriendlyExplanation: string
  details: string[]
  legalRefs: LegalReference[]
  practicalAdvice: string
  note?: string
}

export interface NotFoundCard {
  type: 'not_found'
  message: string
}

export type TrafficResponseCard = TrafficViolationCard | GeneralInfoCard | NotFoundCard

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────

const Separator = () => {
  const { isDarkMode, colors } = useTheme()
  const styles = getStyles(colors, isDarkMode)
  return <View style={styles.separator} />
}

const LegalReferencesList = ({ refs }: { refs: LegalReference[] }) => {
  if (!refs || refs.length === 0) return null
  const { isDarkMode, colors } = useTheme()
  const styles = getStyles(colors, isDarkMode)

  const openUrl = (ref: LegalReference) => {
    const url =
      ref.url ||
      (ref.documentId
        ? `https://thuvienphapluat.vn/page/tim-kiem-van-ban.aspx?keyword=${encodeURIComponent(ref.documentId)}`
        : null)
    if (url) Linking.openURL(url).catch(() => {})
  }

  return (
    <>
      <Separator />
      <View style={styles.legalBox}>
        <View style={styles.rowStart}>
          <Text style={styles.legalIcon}>⚖️</Text>
          <Text style={styles.legalTitle}>Căn cứ pháp lý</Text>
        </View>
        {refs.map((ref, idx) => (
          <View key={idx} style={styles.legalItem}>
            <Text style={styles.legalBullet}>📖</Text>
            <View style={styles.legalContent}>
              <Text style={styles.legalLocation}>
                {ref.location}
                {ref.documentId ? `, ${ref.documentId}` : ''}
              </Text>
              <Text style={styles.legalDocName}>{ref.documentName}</Text>
              {(ref.url || ref.documentId) && (
                <TouchableOpacity onPress={() => openUrl(ref)} activeOpacity={0.7}>
                  <Text style={styles.legalLink}>Xem văn bản gốc →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </>
  )
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export const TrafficCard = ({ data }: { data: TrafficResponseCard }) => {
  const { isDarkMode, colors } = useTheme()
  const styles = getStyles(colors, isDarkMode)

  if (!data) return null

  // ── NOT FOUND ────────────────────────────────────────────────────────────
  if (data.type === 'not_found') {
    return (
      <View style={[styles.card, styles.notFoundCard]}>
        <View style={styles.rowStart}>
          <Text style={styles.iconMd}>⚠️</Text>
          <Text style={styles.notFoundText}>{data.message}</Text>
        </View>
      </View>
    )
  }

  // ── GENERAL INFO ─────────────────────────────────────────────────────────
  if (data.type === 'general') {
    return (
      <View style={[styles.card, styles.generalCard]}>
        {/* Header */}
        <View style={[styles.cardHeader, styles.generalHeader]}>
          <Text style={styles.iconMd}>ℹ️</Text>
          <Text style={styles.generalTitle}>{data.title || 'Thông tin tra cứu'}</Text>
        </View>

        <View style={styles.cardBody}>
          {/* Summary */}
          <Text style={styles.summaryText}>{data.summary}</Text>

          {/* Explanation */}
          {!!data.userFriendlyExplanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explainIcon}>💬</Text>
              <Text style={styles.explanationText}>{data.userFriendlyExplanation}</Text>
            </View>
          )}

          {/* Details list */}
          {data.details && data.details.length > 0 && (
            <View style={styles.detailsBox}>
              {data.details.map((detail, idx) => (
                <View key={idx} style={styles.detailRow}>
                  <Text style={styles.detailBullet}>•</Text>
                  <Text style={styles.detailText}>{detail}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Practical advice */}
          {!!data.practicalAdvice && (
            <View style={styles.adviceBox}>
              <Text style={styles.adviceIcon}>💡</Text>
              <Text style={styles.adviceText}>{data.practicalAdvice}</Text>
            </View>
          )}

          {/* Note */}
          {!!data.note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteIcon}>🔔</Text>
              <Text style={styles.noteText}>{data.note}</Text>
            </View>
          )}

          <LegalReferencesList refs={data.legalRefs} />
        </View>
      </View>
    )
  }

  // ── VIOLATION ────────────────────────────────────────────────────────────
  if (data.type === 'violation') {
    return (
      <View style={[styles.card, styles.violationCard]}>
        {/* Header */}
        <View style={[styles.cardHeader, styles.violationHeader]}>
          <Text style={styles.iconMd}>🛡️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.violationTitle}>{data.title || 'Mức Xử Phạt Vi Phạm'}</Text>
            {!!data.behavior && <Text style={styles.behaviorText}>{data.behavior}</Text>}
          </View>
        </View>

        <View style={styles.cardBody}>
          {/* Explanation */}
          {!!data.userFriendlyExplanation && (
            <View style={styles.explanationBoxDark}>
              <Text style={styles.explainIcon}>💬</Text>
              <Text style={styles.explanationText}>{data.userFriendlyExplanation}</Text>
            </View>
          )}

          {/* Penalties */}
          {data.penalties && data.penalties.length > 0 && (
            <View style={styles.penaltiesWrapper}>
              {data.penalties.map((penalty, idx) => (
                <View key={idx} style={styles.penaltyCard}>
                  {/* Vehicle type row */}
                  <View style={styles.penaltyTop}>
                    <Text style={styles.penaltyVehicleIcon}>🚗</Text>
                    <Text style={styles.penaltyVehicleType}>{penalty.vehicleType}</Text>
                  </View>

                  {/* Fine amount */}
                  <View style={styles.fineBox}>
                    <Text style={styles.fineAmount}>{penalty.fineRange}</Text>
                  </View>

                  {/* Additional penalties */}
                  {(penalty.additionalPenalties.length > 0 || penalty.pointDeduction) && (
                    <View style={styles.additionalBox}>
                      <Text style={styles.additionalLabel}>HÌNH PHẠT BỔ SUNG</Text>
                      {!!penalty.pointDeduction && (
                        <View style={styles.pointRow}>
                          <Text style={styles.pointIcon}>⬇️</Text>
                          <Text style={styles.pointText}>Trừ {penalty.pointDeduction}</Text>
                        </View>
                      )}
                      {penalty.additionalPenalties.map((add, i) => (
                        <View key={i} style={styles.addPenaltyRow}>
                          <View style={styles.addDot} />
                          <Text style={styles.addPenaltyText}>{add}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {penalty.additionalPenalties.length === 0 && !penalty.pointDeduction && (
                    <Text style={styles.noPenaltyText}>Không có hình phạt bổ sung</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Practical advice */}
          {!!data.practicalAdvice && (
            <View style={styles.adviceBox}>
              <Text style={styles.adviceIcon}>💡</Text>
              <Text style={styles.adviceText}>{data.practicalAdvice}</Text>
            </View>
          )}

          {/* Note */}
          {!!data.note && (
            <View style={styles.noteBoxBlue}>
              <Text style={styles.noteIcon}>ℹ️</Text>
              <Text style={styles.noteTextBlue}>{data.note}</Text>
            </View>
          )}

          <LegalReferencesList refs={data.legalRefs} />
        </View>
      </View>
    )
  }

  return null
}

// ─────────────────────────────────────────────
// STYLES — dynamic light/dark mode
// ─────────────────────────────────────────────

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  // ── Card shell ────────────────────────────────
  card: {
    borderRadius: 14,
    marginVertical: 6,
    marginHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 1,
    maxWidth: 480
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  cardBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12
  },

  // ── Not Found ─────────────────────────────────
  notFoundCard: {
    backgroundColor: isDarkMode ? '#422006' : '#fefce8',
    borderColor: isDarkMode ? '#78350f' : '#fef08a'
  },
  notFoundText: {
    flex: 1,
    color: isDarkMode ? '#fde68a' : '#854d0e',
    fontSize: 13,
    lineHeight: 20,
    flexShrink: 1
  },

  // ── General ───────────────────────────────────
  generalCard: {
    backgroundColor: isDarkMode ? '#0c1a2e' : '#ffffff',
    borderColor: isDarkMode ? '#1e3a5f' : '#bfdbfe'
  },
  generalHeader: {
    backgroundColor: isDarkMode ? '#0f2847' : '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#1e3a5f' : '#bfdbfe'
  },
  generalTitle: {
    flex: 1,
    color: isDarkMode ? '#60a5fa' : '#1d4ed8',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    flexShrink: 1
  },

  // ── Violation ─────────────────────────────────
  violationCard: {
    backgroundColor: isDarkMode ? '#150a0a' : '#ffffff',
    borderColor: isDarkMode ? '#7f1d1d' : '#fecaca'
  },
  violationHeader: {
    backgroundColor: isDarkMode ? '#1c0a0a' : '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#7f1d1d' : '#fecaca',
    gap: 8
  },
  violationTitle: {
    color: isDarkMode ? '#f87171' : '#b91c1c',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21
  },
  behaviorText: {
    color: isDarkMode ? '#fca5a5' : '#991b1b',
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
    opacity: 0.85
  },

  // ── Summary / explanation ─────────────────────
  summaryText: {
    color: isDarkMode ? '#e2e8f0' : '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22
  },
  explanationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    padding: 12
  },
  explanationBoxDark: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: isDarkMode ? '#1a1a1a' : '#fafafa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#333' : '#e5e5e5',
    padding: 12
  },
  explanationText: {
    flex: 1,
    color: isDarkMode ? '#cbd5e1' : '#475569',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
    flexShrink: 1
  },

  // ── Details list ─────────────────────────────
  detailsBox: { gap: 6, paddingLeft: 4 },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  detailBullet: { color: isDarkMode ? '#60a5fa' : '#2563eb', fontSize: 16, lineHeight: 20, marginTop: 1 },
  detailText: { flex: 1, color: isDarkMode ? '#cbd5e1' : '#334155', fontSize: 13, lineHeight: 20 },

  // ── Penalties ────────────────────────────────
  penaltiesWrapper: { gap: 10 },
  penaltyCard: {
    backgroundColor: isDarkMode ? '#0f0f0f' : '#ffffff',
    borderWidth: 1,
    borderColor: isDarkMode ? '#292929' : '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: isDarkMode ? 0.3 : 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  penaltyTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  penaltyVehicleIcon: { fontSize: 16 },
  penaltyVehicleType: { color: isDarkMode ? '#cbd5e1' : '#334155', fontSize: 14, fontWeight: '600' },
  fineBox: {
    backgroundColor: isDarkMode ? '#2d0a0a' : '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  fineAmount: {
    color: isDarkMode ? '#ef4444' : '#dc2626',
    fontSize: 17,
    fontWeight: '800'
  },
  additionalBox: { gap: 6 },
  additionalLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  pointRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  pointIcon: { fontSize: 12 },
  pointText: { color: isDarkMode ? '#fb923c' : '#ea580c', fontSize: 12, fontWeight: '600', flex: 1 },
  addPenaltyRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  addDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: isDarkMode ? '#475569' : '#cbd5e1',
    marginTop: 7,
    flexShrink: 0
  },
  addPenaltyText: { flex: 1, color: isDarkMode ? '#94a3b8' : '#475569', fontSize: 12, lineHeight: 18 },
  noPenaltyText: { color: isDarkMode ? '#475569' : '#94a3b8', fontSize: 11, fontStyle: 'italic' },

  // ── Explain icon ─────────────────────────────
  explainIcon: { fontSize: 14 },

  // ── Advice ───────────────────────────────────
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: isDarkMode ? '#052e16' : '#f0fdf4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#14532d' : '#bbf7d0',
    padding: 12
  },
  adviceIcon: { fontSize: 14 },
  adviceText: { flex: 1, color: isDarkMode ? '#86efac' : '#166534', fontSize: 12, lineHeight: 18, fontWeight: '500' },

  // ── Note ─────────────────────────────────────
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: isDarkMode ? '#431407' : '#fff7ed',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#7c2d12' : '#ffedd5',
    padding: 12
  },
  noteBoxBlue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: isDarkMode ? '#0c1a3a' : '#f0f9ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5f' : '#bae6fd',
    padding: 12
  },
  noteIcon: { fontSize: 14 },
  noteText: { flex: 1, color: isDarkMode ? '#fdba74' : '#c2410c', fontSize: 12, lineHeight: 18 },
  noteTextBlue: { flex: 1, color: isDarkMode ? '#93c5fd' : '#0369a1', fontSize: 12, lineHeight: 18 },

  // ── Legal refs ────────────────────────────────
  separator: { height: 1, backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0', marginVertical: 4 },
  legalBox: {
    backgroundColor: isDarkMode ? '#0f1a2e' : '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5f' : '#e2e8f0',
    padding: 12,
    gap: 10
  },
  legalTitle: { color: isDarkMode ? '#94a3b8' : '#475569', fontSize: 13, fontWeight: '700' },
  legalIcon: { fontSize: 14 },
  legalItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  legalBullet: { fontSize: 12, marginTop: 1 },
  legalContent: { flex: 1, gap: 2 },
  legalLocation: { color: isDarkMode ? '#e2e8f0' : '#0f172a', fontSize: 12, fontWeight: '600', lineHeight: 17 },
  legalDocName: { color: isDarkMode ? '#64748b' : '#64748b', fontSize: 11, lineHeight: 16 },
  legalLink: { color: isDarkMode ? '#3b82f6' : '#2563eb', fontSize: 11, marginTop: 2 },

  // ── Shared ───────────────────────────────────
  rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  iconMd: { fontSize: 16 }
})
