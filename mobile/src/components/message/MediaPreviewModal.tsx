import React from 'react';
import { View, TouchableOpacity, FlatList, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const MediaPreviewModal = ({
  previewMedia,
  setPreviewMedia,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  VideoViewer,
  styles
}: any) => {
  return (
    <Modal visible={!!previewMedia} transparent={true} animationType="fade">
      <View style={styles.imagePreviewContainer}>
        <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setPreviewMedia(null)}>
          <Ionicons name="close" size={32} color="#FFFFFF" />
        </TouchableOpacity>
        {previewMedia && (
          <FlatList
            data={previewMedia.items}
            keyExtractor={(item, index) => item.id + '_' + index}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={previewMedia.initialIndex}
            getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                {item.isVideo ? (
                  <VideoViewer url={item.url} />
                ) : (
                  <Image source={{ uri: item.url }} style={styles.fullScreenImage} resizeMode="contain" />
                )}
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};