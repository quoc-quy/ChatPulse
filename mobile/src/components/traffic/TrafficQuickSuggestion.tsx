// components/traffic/TrafficQuickSuggestion.tsx
// Component nút gợi ý nhanh - giống quick suggestion trên web

import React from 'react'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../contexts/ThemeContext'

interface Props {
  icon: string
  label: string
  onPress: () => void
}

export default function TrafficQuickSuggestion({ icon, label, onPress }: Props) {
  const { isDarkMode, colors } = useTheme()
  const styles = getStyles(colors, isDarkMode)

  return (
    <TouchableOpacity style={styles.chip} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

const getStyles = (colors: any, isDarkMode: boolean) => StyleSheet.create({
  chip: {
    // Chia 2 cột: width = ~(screenWidth - padding*2 - gap) / 2
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  icon: { fontSize: 18, flexShrink: 0 },
  label: {
    flex: 1,
    color: isDarkMode ? '#94a3b8' : '#475569',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500'
  }
})

