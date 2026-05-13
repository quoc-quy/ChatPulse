import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const MessageInput = ({
  isGroupDisbanded,
  isInputDisabled,
  disbandMessage,
  handleDeleteDisbandedChat,
  formatMessageDate,
  inputText,
  setInputText,
  updateDraft,
  conversationId,
  handleSend,
  pendingMedia,
  setPendingMedia,
  handlePickMedia,
  handlePickDocument,
  handleSuggestReply,
  isUploading,
  isSuggesting,
  COLORS,
  styles,
  insets,
  t,
  isDarkMode
}: any) => {

  if (isGroupDisbanded) {
    return (
      <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 24 }}>
        <View style={styles.dateDivider}>
          <Text style={styles.dateDividerText}>{formatMessageDate(new Date().toISOString())}</Text>
        </View>
        <View style={{ backgroundColor: isDarkMode ? '#1E293B' : '#E2E8F0', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 14 }}>{disbandMessage || 'Trưởng nhóm đã giải tán nhóm.'}</Text>
          <TouchableOpacity onPress={handleDeleteDisbandedChat}>
            <Text style={{ color: '#3B82F6', fontSize: 14, marginLeft: 6 }}>Xoá trò chuyện</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {pendingMedia.length > 0 && (
        <View style={styles.pendingContainerWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pendingContainer}>
            {pendingMedia.map((media: any, index: number) => (
              <View key={index} style={styles.pendingMediaWrap}>
                <TouchableOpacity style={styles.removePendingBtn} onPress={() => {
                  const newPending = [...pendingMedia];
                  newPending.splice(index, 1);
                  setPendingMedia(newPending);
                }}>
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
                {media.attachmentType === 'media' ? (
                  <Image source={{ uri: media.uri }} style={styles.pendingImage} />
                ) : (
                  <View style={styles.pendingFile}>
                    <Ionicons name="document-text" size={30} color={COLORS.primary} />
                  </View>
                )}
                {(media.type === 'video' || media.mimeType?.startsWith('video/')) && (
                  <View style={styles.pendingVideoIcon}>
                    <Ionicons name="videocam" size={14} color="#FFF" />
                  </View>
                )}
                {media.attachmentType === 'file' && (
                  <Text style={styles.pendingFileNameOverlay} numberOfLines={1}>
                    {media.name || t.messageAttachmentDocument}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {isInputDisabled ? (
        <View style={[styles.inputContainer, { justifyContent: 'center', alignItems: 'center', paddingVertical: 14, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border }]}>
          <Ionicons name="person-remove-outline" size={16} color={COLORS.textLight} style={{ marginRight: 6 }} />
          <Text style={{ color: COLORS.textLight, fontSize: 14 }}>
            {'Các bạn không còn là bạn bè, hãy kết bạn để trò chuyện nhé!'}
          </Text>
        </View>
      ) : (
        <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 10) : Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={handlePickMedia} disabled={isUploading || isInputDisabled}>
            <Ionicons name="image-outline" size={24} color={isInputDisabled ? COLORS.border : COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument} disabled={isUploading || isInputDisabled}>
            <Ionicons name="attach" size={24} color={isInputDisabled ? COLORS.border : COLORS.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.attachBtn} onPress={handleSuggestReply} disabled={isSuggesting || isInputDisabled}>
            {isSuggesting ? (
              <ActivityIndicator size="small" color={isInputDisabled ? COLORS.border : "#A855F7"} />
            ) : (
              <Ionicons name="sparkles" size={22} color={isInputDisabled ? COLORS.border : "#A855F7"} />
            )}
          </TouchableOpacity>

          <View style={[styles.textInput, { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 0, backgroundColor: isInputDisabled ? COLORS.surfaceSoft : COLORS.background }]}>
            {inputText.startsWith('@PulseAI ') && (
              <Text style={{ color: '#C084FC', fontWeight: '900', paddingLeft: 16, paddingBottom: Platform.OS === 'ios' ? 10 : 12 }}>
                @PulseAI
              </Text>
            )}

            {isInputDisabled && <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="auto" />}

            <TextInput
              multiline={true}
              maxLength={2000}
              editable={!isInputDisabled}
              pointerEvents={isInputDisabled ? 'none' : 'auto'}
              style={{ flex: 1, color: isInputDisabled ? COLORS.textLight : COLORS.text, paddingHorizontal: inputText.startsWith('@PulseAI ') ? 6 : 16, minHeight: 40, lineHeight: 20, maxHeight: 70, paddingTop: 10, paddingBottom: 10, textAlignVertical: 'center' }}
              placeholder={isInputDisabled ? "Các bạn không còn là bạn bè" : t.messageInputPlaceholder}
              placeholderTextColor={COLORS.textLight}
              value={inputText.startsWith('@PulseAI ') ? inputText.substring(9) : inputText}
              onChangeText={(txt) => {
                let newText = txt;
                if (inputText.startsWith('@PulseAI ')) newText = '@PulseAI ' + txt;
                setInputText(newText);
                if (updateDraft && conversationId) updateDraft(conversationId, newText);
              }}
            />
          </View>

          <TouchableOpacity onPress={handleSend} disabled={isInputDisabled || (inputText.trim().length === 0 && pendingMedia.length === 0)} style={{ marginBottom: 2 }}>
            <LinearGradient colors={isInputDisabled ? ['#D1D5DB', '#9CA3AF'] : ['#8B5CF6', '#6D28D9']} style={styles.sendBtn}>
              <Ionicons name="send" size={18} color="white" style={{ marginLeft: 3 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};