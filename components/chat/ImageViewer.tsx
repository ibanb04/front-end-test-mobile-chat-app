import React from 'react';
import { Modal, StyleSheet, View, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ThemedView } from '@/components/common/ThemedView';

interface ImageViewerProps {
  visible: boolean;
  imageUri: string;
  onClose: () => void;
}

export function ImageViewer({ visible, imageUri, onClose }: ImageViewerProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        <BlurView intensity={100} style={styles.blurContainer}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <IconSymbol name="close" size={24} color="#FFFFFF" />
          </Pressable>
          
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </View>
        </BlurView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
}); 