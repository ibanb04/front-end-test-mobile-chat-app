import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, Pressable, Modal, Alert, Animated } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Message } from '@/interfaces/chatTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MessageStatus } from './MessageStatus';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ImageViewer } from './ImageViewer';
import { useAppContext } from '@/hooks/AppContext';
import { useVideoPlayer, VideoView } from 'expo-video';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  onDelete?: (messageId: string) => void;
}

export function MessageBubble({ message, isCurrentUser, onDelete }: MessageBubbleProps) {
  const isDark = useColorScheme() === 'dark';
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isVideoViewerVisible, setIsVideoViewerVisible] = useState(false);
  const { theme } = useAppContext();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const videoPlayer = useVideoPlayer(
    message.mediaType === 'video' && message.mediaUrl ? message.mediaUrl : 'https://example.com/placeholder.mp4',
    player => {
      player.loop = false;
    }
  );

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const renderMedia = () => {
    if (!message.mediaType || !message.mediaUrl) return null;

    switch (message.mediaType) {
      case 'image':
        return (
          <Pressable onPress={() => setIsImageViewerVisible(true)}>
            <Image
              source={{ uri: message.mediaUrl }}
              style={styles.media}
              resizeMode="cover"
            />
          </Pressable>
        );
      case 'video':
        return (
          <Pressable onPress={() => setIsVideoViewerVisible(true)}>
            <View style={styles.videoContainer}>
              <View style={styles.videoThumbnail}>
                <IconSymbol name="videocam" size={32} color={theme.colors.tint} />
                <View style={styles.videoInfo}>
                  <ThemedText style={styles.videoText}>
                    {message.mediaName || 'Video'}
                  </ThemedText>
                  {message.mediaSize && (
                    <ThemedText style={styles.videoSize}>
                      {formatFileSize(message.mediaSize)}
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        );
      case 'audio':
        return (
          <View style={styles.audioContainer}>
            <IconSymbol name="musical-note" size={24} color={theme.colors.tint} />
            <ThemedText style={styles.audioText}>
              {message.mediaName || 'Audio'}
            </ThemedText>
          </View>
        );
      case 'file':
        return (
          <View style={styles.fileContainer}>
            <IconSymbol name="document" size={24} color={theme.colors.tint} />
            <ThemedText style={styles.fileText}>
              {message.mediaName || 'Archivo'}
            </ThemedText>
          </View>
        );
      default:
        return null;
    }
  };

  const bubbleStyle = [
    styles.bubble,
    isCurrentUser
      ? [styles.selfBubble, { backgroundColor: isDark ? '#E2E2B6' : '#E2E2B6' }]
      : [styles.otherBubble, { backgroundColor: isDark ? '#2A2C33' : '#ffff' }]
  ];

  const handleLongPress = () => {
    if (isCurrentUser) {
      Alert.alert(
        'Eliminar mensaje',
        '¿Estás seguro de que quieres eliminar este mensaje?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Eliminar',
            style: 'destructive',
            onPress: () => {
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                onDelete?.(message.id);
              });
            },
          },
        ]
      );
    }
  };

  useEffect(() => {
    if (!isVideoViewerVisible) {
      videoPlayer.pause();
    }
  }, [isVideoViewerVisible]);

  return (
    <>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Pressable
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={[styles.container, isCurrentUser ? styles.selfContainer : styles.otherContainer]}
        >
          <View style={bubbleStyle}>
            {renderMedia()}
            {message.text && (
              <ThemedText style={[styles.messageText, isCurrentUser && { color: '#000000' }]}>
                {message.text}
              </ThemedText>
            )}
            <View style={styles.footer}>
              <ThemedText style={[styles.timeText, isCurrentUser && { color: '#000000' }]}>
                {formatTime(message.timestamp)}
              </ThemedText>
              {isCurrentUser && (
                <View style={styles.footerActions}>
                  <MessageStatus message={message} />
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <ImageViewer
        visible={isImageViewerVisible}
        onClose={() => setIsImageViewerVisible(false)}
        imageUri={message.mediaUrl || ''}
      />

      <Modal
        visible={isVideoViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVideoViewerVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setIsVideoViewerVisible(false)}
          >
            <IconSymbol name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <VideoView
            player={videoPlayer}
            style={styles.fullScreenVideo}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  selfContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  selfBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
  },
  selfMessageText: {
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    opacity: 0.7,
  },
  media: {
    width: 250,
    height: 200,
    borderRadius: 12,
  },
  videoContainer: {
    width: 250,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  videoThumbnail: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  videoInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  videoText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  videoSize: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#000000',
    borderRadius: 8,
    marginTop: 4,
    gap: 8,
  },
  audioText: {
    flex: 1,
    fontSize: 14,
  },
  fileContainer: {
    width: 250,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
  },
  fileText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
}); 