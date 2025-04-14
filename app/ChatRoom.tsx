import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ViewToken,
  ViewabilityConfig,
  Alert,
  Image,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAppContext } from '@/hooks/AppContext';
import { ThemedText } from '@/components/common/ThemedText';
import { ThemedView } from '@/components/common/ThemedView';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { Message } from '@/hooks/useChats';
import { MediaPickerModal } from '@/components/chat/MediaPickerModal';
import { Avatar } from '@/components/Avatar';
import * as FileSystem from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

interface Media {
  type: 'image' | 'video' | 'audio' | 'file';
  uri: string;
  name?: string;
  size?: number;
}

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { currentUser, users, chats, sendMessage, markMessageAsRead, theme } = useAppContext();
  const [messageText, setMessageText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<{
    type: 'image' | 'video' | 'audio' | 'file';
    uri: string;
    name?: string;
    size?: number;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const chat = chats.find(c => c.id === chatId);

  const chatParticipants = chat?.participants
    .filter((id: string) => id !== currentUser?.id)
    .map((id: string) => users.find(user => user.id === id))
    .filter(Boolean) || [];

  const chatName = chatParticipants.length === 1
    ? chatParticipants[0]?.name
    : `${chatParticipants[0]?.name || 'Unknown'} & ${chatParticipants.length - 1} other${chatParticipants.length > 1 ? 's' : ''}`;

  const videoPlayer = useVideoPlayer(selectedMedia?.type === 'video' ? selectedMedia.uri : '', player => {
    player.loop = false;
    player.play();
  });

  const handleSendMessage = async () => {
    if (!currentUser || !chat || (!messageText.trim() && !selectedMedia)) return;

    setIsSending(true);

    try {
      const mediaToSend = selectedMedia ? prepareMedia(selectedMedia) : null;

      if (mediaToSend && Platform.OS === 'ios') {
        await verifyVideoAccessibility(mediaToSend.uri);
      }

      const success = await sendMessage(chat.id, messageText.trim(), currentUser.id, mediaToSend);

      if (!success) {
        throw new Error('Error al enviar el mensaje');
      }

      resetMessageInput();
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  const prepareMedia = (media: Media) => ({
    ...media,
    name: media.name || `media_${Date.now()}.${media.type}`,
  });

  const verifyVideoAccessibility = async (uri: string) => {
    try {
      const videoInfo = await FileSystem.getInfoAsync(uri);
      if (!videoInfo.exists) {
        throw new Error('El archivo de video no existe o no es accesible');
      }
    } catch (error) {
      console.error('Error al verificar el video en iOS:', error);
      throw new Error('No se pudo verificar el archivo de video');
    }
  };

  const resetMessageInput = () => {
    setMessageText('');
    setSelectedMedia(null);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.7,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const isLargeImage = asset.fileSize && asset.fileSize > 2 * 1024 * 1024;

      const media = isLargeImage
        ? await compressImage(asset)
        : { uri: asset.uri, name: asset.fileName || '', size: asset.fileSize };

      setSelectedMedia({ type: 'image', ...media });
    } catch (error) {
      console.error('Error al seleccionar la imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Por favor, inténtalo de nuevo.');
    }
  };

  const compressImage = async (asset: ImagePicker.ImagePickerAsset) => {
    const context = ImageManipulator.manipulate(asset.uri);
    const image = await context
      .resize({ width: 1024 })
      .renderAsync();
    const result = await image.saveAsync({
      compress: 0.6,
      format: SaveFormat.JPEG
    });
    return { uri: result.uri, name: asset.fileName || '', size: asset.fileSize };
  };

  const pickVideo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];

        // Asegurarse de que el nombre del archivo tenga una extensión
        const fileName = video.fileName || `video_${Date.now()}.mov`;

        setSelectedMedia({
          type: 'video',
          uri: video.uri,
          name: fileName,
          size: video.fileSize,
        });


      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Error', 'No se pudo seleccionar el video. Por favor, inténtalo de nuevo.');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedMedia({
          type: 'file',
          uri: asset.uri,
          name: asset.name || 'Archivo',
          size: asset.size,
        });
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };

  const showMediaOptions = () => {
    setIsMediaPickerVisible(true);
  };

  const removeSelectedMedia = () => {
    setSelectedMedia(null);
  };

  const onViewableItemsChangedRef = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!currentUser || !chat) return;
    viewableItems
      .filter(({ item, isViewable }) => (
        isViewable &&
        item.senderId !== currentUser.id &&
        item.status !== 'read'
      ))
      .forEach(({ item }) => markMessageAsRead(item.id, currentUser.id));
  });

  const viewabilityConfig = useRef<ViewabilityConfig>({
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 500,
  }).current;

  const handleContentSizeChange = () => {
    if (isAtBottom && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsAtBottom(isCloseToBottom);
  };

  useEffect(() => {
    if (chat?.messages.length && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [chat?.messages.length]);

  useEffect(() => {
    if (!currentUser || !chat || chat.messages.length === 0) return;

    const lastMessage = chat.messages[chat.messages.length - 1];
    if (lastMessage.senderId !== currentUser.id && lastMessage.status !== 'read') {
      markMessageAsRead(lastMessage.id, currentUser.id);
    }
  }, [chat?.messages.length, currentUser, chat]);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 80, // altura estimada de cada mensaje
    offset: 80 * index,
    index,
  }), []);


  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isCurrentUser={item.senderId === currentUser?.id}
    />
  );

  const keyExtractor = (item: Message) => item.id;

  if (!chat || !currentUser) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText>Chat not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerContainer}>
              <Avatar
                uri={chatParticipants[0]?.avatar}
                fallback={chatParticipants[0]?.name[0]}
                size={32}
              />
              <ThemedText type="defaultSemiBold" numberOfLines={1}>
                {chatName}
              </ThemedText>
            </View>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <IconSymbol name="chevron-back" size={24} color={theme.colors.tint} />
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={chat.messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText>No messages yet. Say hello!</ThemedText>
            </ThemedView>
          )}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          inverted={false}
          windowSize={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={30}
          initialNumToRender={10}
          removeClippedSubviews={true}
          getItemLayout={getItemLayout}
          onEndReachedThreshold={0.5}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
        />

        {selectedMedia && (
          <ThemedView style={styles.mediaPreviewContainer}>
            <Pressable style={styles.removeMediaButton} onPress={removeSelectedMedia}>
              <IconSymbol name="close" size={24} color={theme.colors.error} />
            </Pressable>
            {selectedMedia.type === 'image' && (
              <Image
                source={{ uri: selectedMedia.uri }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
            )}
            {selectedMedia.type === 'video' && (
              <View style={styles.videoPreviewContainer}>
                <VideoView
                  player={videoPlayer}
                  style={styles.videoPreview}
                  allowsFullscreen
                  allowsPictureInPicture
                />
                <View style={styles.videoInfoContainer}>
                  <ThemedText style={styles.videoPreviewText}>
                    {selectedMedia.name || 'Video'}
                  </ThemedText>
                  {selectedMedia.size && (
                    <ThemedText style={styles.videoPreviewSize}>
                      {formatFileSize(selectedMedia.size)}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}
            {selectedMedia.type === 'file' && (
              <View style={styles.filePreview}>
                <IconSymbol name="document" size={32} color={theme.colors.tint} />
                <View style={styles.fileInfo}>
                  <ThemedText style={styles.filePreviewText}>
                    {selectedMedia.name || 'Archivo'}
                  </ThemedText>
                  {selectedMedia.size && (
                    <ThemedText style={styles.filePreviewSize}>
                      {formatFileSize(selectedMedia.size)}
                    </ThemedText>
                  )}
                </View>
              </View>
            )}
          </ThemedView>
        )}

        <ThemedView style={styles.inputContainer}>
          <View style={styles.inputButtonsContainer}>
            <Pressable
              style={styles.mediaButton}
              onPress={showMediaOptions}
              disabled={isSending}
            >
              <IconSymbol name="attach" size={24} color={theme.colors.tint} />
            </Pressable>
            <Pressable
              style={styles.mediaButton}
              onPress={pickImage}
              disabled={isSending}
            >
              <IconSymbol name="image" size={24} color={theme.colors.tint} />
            </Pressable>

          </View>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            multiline
            editable={!isSending}
          />
          <Pressable
            style={[
              styles.sendButton,
              (!messageText.trim() && !selectedMedia) && styles.disabledButton,
              isSending && styles.sendingButton
            ]}
            onPress={handleSendMessage}
            disabled={(!messageText.trim() && !selectedMedia) || isSending}
          >
            {isSending ? (
              <ActivityIndicator color={theme.colors.tint} />
            ) : (
              <IconSymbol name="arrow-up-circle" size={32} color={theme.colors.tint} />
            )}
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onSelectImage={pickImage}
        onSelectVideo={pickVideo}
        onSelectFile={pickFile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  messagesContainer: {
    padding: 10,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E1',
  },
  inputButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  mediaButton: {
    marginRight: 8,
    padding: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
  },
  sendButton: {
    marginLeft: 8,
    padding: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  footerLoader: {
    borderRadius: 20,
    padding: 10,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
    marginRight: 8,
  },
  mediaPreviewContainer: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    padding: 4,
  },
  sendingButton: {
    opacity: 0.5,
  },
  videoPreviewContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  videoInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: '#fff',
  },
  videoPreviewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  videoPreviewSize: {
    fontSize: 14,
    opacity: 0.7,
    color: '#FFFFFF',
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    gap: 12,
    width: '100%',
  },
  fileInfo: {
    flex: 1,
    flexShrink: 1,
  },
  filePreviewText: {
    fontSize: 14,
    color: '#000000',
    flexWrap: 'wrap',
  },
  filePreviewSize: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
}); 