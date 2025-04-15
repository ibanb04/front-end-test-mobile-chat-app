import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { useAppContext } from '@/hooks/AppContext';
import { ThemedView } from '@/components/common/ThemedView';
import { ThemedText } from '@/components/common/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { VideoView } from 'expo-video';
import { Media } from '@/interfaces/chatTypes';
import { chatRoomScreenStyles } from '@/styles/screens/chatRoomScreenStyles.styles';

interface MediaPreviewProps {
  media: Media;
  onRemove: () => void;
  videoPlayer?: any;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({ media, onRemove, videoPlayer }) => {
  const { theme } = useAppContext();

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <ThemedView style={chatRoomScreenStyles.mediaPreviewContainer}>
      <Pressable style={chatRoomScreenStyles.removeMediaButton} onPress={onRemove}>
        <IconSymbol name="close" size={24} color={theme.colors.error} />
      </Pressable>
      {media.type === 'image' && (
        <Image
          source={{ uri: media.uri }}
          style={chatRoomScreenStyles.mediaPreview}
          resizeMode="cover"
        />
      )}
      {media.type === 'video' && (
        <View style={chatRoomScreenStyles.videoPreviewContainer}>
          <VideoView
            player={videoPlayer}
            style={chatRoomScreenStyles.videoPreview}
            allowsFullscreen
            allowsPictureInPicture
          />
          <View style={chatRoomScreenStyles.videoInfoContainer}>
            <ThemedText style={chatRoomScreenStyles.videoPreviewText}>
              {media.name || 'Video'}
            </ThemedText>
            {media.size && (
              <ThemedText style={chatRoomScreenStyles.videoPreviewSize}>
                {formatFileSize(media.size)}
              </ThemedText>
            )}
          </View>
        </View>
      )}
      {media.type === 'file' && (
        <View style={chatRoomScreenStyles.filePreview}>
          <IconSymbol name="document" size={32} color={theme.colors.tint} />
          <View style={chatRoomScreenStyles.fileInfo}>
            <ThemedText style={chatRoomScreenStyles.filePreviewText}>
              {media.name || 'Archivo'}
            </ThemedText>
            {media.size && (
              <ThemedText style={chatRoomScreenStyles.filePreviewSize}>
                {formatFileSize(media.size)}
              </ThemedText>
            )}
          </View>
        </View>
      )}
    </ThemedView>
  );
}; 