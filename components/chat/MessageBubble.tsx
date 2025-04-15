import React, { useState, useEffect, useRef } from 'react';
import { View, Image, Pressable, Modal, Alert, Animated } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { Message } from '@/interfaces/chatTypes';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MessageStatus } from './MessageStatus';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ImageViewer } from './ImageViewer';
import { useAppContext } from '@/hooks/AppContext';
import { useVideoPlayer, VideoView } from 'expo-video';
import { messageBubbleStyles } from '@/styles/components/messageBubble.styles';
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
              style={messageBubbleStyles.media}
              resizeMode="cover"
            />
          </Pressable>
        );
      case 'video':
        return (
          <Pressable onPress={() => setIsVideoViewerVisible(true)}>
            <View style={messageBubbleStyles.videoContainer}>
              <View style={messageBubbleStyles.videoThumbnail}>
                <IconSymbol name="videocam" size={32} color={theme.colors.tint} />
                <View style={messageBubbleStyles.videoInfo}>
                  <ThemedText style={messageBubbleStyles.videoText}>
                    {message.mediaName || 'Video'}
                  </ThemedText>
                  {message.mediaSize && (
                    <ThemedText style={messageBubbleStyles.videoSize}>
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
          <View style={messageBubbleStyles.audioContainer}>
            <IconSymbol name="musical-note" size={24} color={theme.colors.tint} />
            <ThemedText style={messageBubbleStyles.audioText}>
              {message.mediaName || 'Audio'}
            </ThemedText>
          </View>
        );
      case 'file':
        return (
          <View style={messageBubbleStyles.fileContainer}>
            <IconSymbol name="document" size={24} color={theme.colors.tint} />
            <ThemedText style={messageBubbleStyles.fileText}>
              {message.mediaName || 'Archivo'}
            </ThemedText>
          </View>
        );
      default:
        return null;
    }
  };

  const bubbleStyle = [
    messageBubbleStyles.bubble,
    isCurrentUser
      ? [messageBubbleStyles.selfBubble, { backgroundColor: isDark ? '#E2E2B6' : '#E2E2B6' }]
      : [messageBubbleStyles.otherBubble, { backgroundColor: isDark ? '#2A2C33' : '#ffff' }]
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
          style={[messageBubbleStyles.container, isCurrentUser ? messageBubbleStyles.selfContainer : messageBubbleStyles.otherContainer]}
        >
          <View style={bubbleStyle}>
            {renderMedia()}
            {message.text && (
              <ThemedText style={[messageBubbleStyles.messageText, isCurrentUser && { color: '#000000' }]}>
                {message.text}
              </ThemedText>
            )}
            <View style={messageBubbleStyles.footer}>
              <ThemedText style={[messageBubbleStyles.timeText, isCurrentUser && { color: '#000000' }]}>
                {formatTime(message.timestamp)}
              </ThemedText>
              {isCurrentUser && (
                <View style={messageBubbleStyles.footerActions}>
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
        <View style={messageBubbleStyles.modalContainer}>
          <Pressable
            style={messageBubbleStyles.closeButton}
            onPress={() => setIsVideoViewerVisible(false)}
          >
            <IconSymbol name="close" size={24} color="#FFFFFF" />
          </Pressable>
          <VideoView
            player={videoPlayer}
            style={messageBubbleStyles.fullScreenVideo}
            allowsFullscreen
            allowsPictureInPicture
          />
        </View>
      </Modal>
    </>
  );
}

