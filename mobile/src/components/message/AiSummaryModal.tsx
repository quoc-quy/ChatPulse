import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export const AiSummaryModal = ({
  showAiModal,
  setShowAiModal,
  isAiProcessing,
  aiSummaryText,
  renderAiText,
  t,
  styles
}: any) => {
  return (
    <Modal visible={showAiModal} transparent animationType="fade">
      <View style={styles.aiOverlay}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.aiContainer}>
          <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.aiHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="sparkles" size={20} color="#A78BFA" style={{ marginRight: 8 }} />
              <Text style={styles.aiTitle}>{t.messageAiSummaryTitle}</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAiModal(false)}>
              <Ionicons name="close-circle" size={24} color="#475569" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.aiContent} showsVerticalScrollIndicator={false}>
            {isAiProcessing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>{t.messageAiDecoding}</Text>
              </View>
            ) : (
              <Text style={styles.aiText}>{renderAiText(aiSummaryText)}</Text>
            )}
          </ScrollView>
          {!isAiProcessing && (
            <View style={styles.aiFooter}>
              <TouchableOpacity onPress={() => setShowAiModal(false)} activeOpacity={0.8}>
                <LinearGradient colors={['#5b21b6', '#1e1b4b']} style={styles.aiBtn}>
                  <Text style={styles.aiBtnText}>Đã hiểu</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};