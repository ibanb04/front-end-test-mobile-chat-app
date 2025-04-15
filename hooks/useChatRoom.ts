import { useState, useCallback } from 'react';
import { ViewToken, Alert } from 'react-native';
import { useAppContext } from '@/hooks/AppContext';
import { Media, Chat, User } from '@/interfaces/chatTypes';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface UseChatRoomReturn {
  chat: Chat | undefined;
  currentUser: User | null;
  messageText: string;
  setMessageText: (text: string) => void;
  selectedMedia: Media | null;
  setSelectedMedia: (media: Media | null) => void;
  isSending: boolean;
  isMediaPickerVisible: boolean;
  setIsMediaPickerVisible: (visible: boolean) => void;
  handleSendMessage: () => Promise<void>;
  pickImage: () => Promise<void>;
  pickVideo: () => Promise<void>;
  pickFile: () => Promise<void>;
  handleDeleteMessage: (messageId: string) => Promise<void>;
  onViewableItemsChanged: (info: { viewableItems: ViewToken[] }) => void;
  resetMessageInput: () => void;
}

export const useChatRoom = (chatId: string): UseChatRoomReturn => {
  const { currentUser, chats, sendMessage, markMessageAsRead, deleteMessage } = useAppContext();
  const [messageText, setMessageText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);

  const chat = chats.find(c => c.id === chatId);

  const handleSendMessage = useCallback(async () => {
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
  }, [currentUser, chat, messageText, selectedMedia, sendMessage]);

  const prepareMedia = useCallback((media: Media) => ({
    ...media,
    name: media.name || `media_${Date.now()}.${media.type}`,
  }), []);

  const verifyVideoAccessibility = useCallback(async (uri: string) => {
    try {
      const videoInfo = await FileSystem.getInfoAsync(uri);
      if (!videoInfo.exists) {
        throw new Error('El archivo de video no existe o no es accesible');
      }
    } catch (error) {
      console.error('Error al verificar el video en iOS:', error);
      throw new Error('No se pudo verificar el archivo de video');
    }
  }, []);

  const resetMessageInput = useCallback(() => {
    setMessageText('');
    setSelectedMedia(null);
  }, []);

  const pickImage = useCallback(async () => {
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
  }, []);

  const compressImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const context = ImageManipulator.manipulate(asset.uri);
    const image = await context
      .resize({ width: 1024 })
      .renderAsync();
    const result = await image.saveAsync({
      compress: 0.6,
      format: SaveFormat.JPEG
    });
    return { uri: result.uri, name: asset.fileName || '', size: asset.fileSize };
  }, []);

  const pickVideo = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
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
  }, []);

  const pickFile = useCallback(async () => {
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
  }, []);

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!chat) return;

    try {
      const success = await deleteMessage(messageId, chat.id);
      if (!success) {
        Alert.alert('Error', 'No se pudo eliminar el mensaje');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Ocurrió un error al eliminar el mensaje');
    }
  }, [chat, deleteMessage]);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (!currentUser || !chat) return;
    viewableItems
      .filter(({ item, isViewable }) => (
        isViewable &&
        item.senderId !== currentUser.id &&
        item.status !== 'read'
      ))
      .forEach(async ({ item }) => {
        const success = await markMessageAsRead(item.id, currentUser.id);
        if (!success) {
          console.error('Error al marcar el mensaje como leído:', item.id);
        }
      });
  }, [currentUser, chat, markMessageAsRead]);

  return {
    chat,
    currentUser,
    messageText,
    setMessageText,
    selectedMedia,
    setSelectedMedia,
    isSending,
    isMediaPickerVisible,
    setIsMediaPickerVisible,
    handleSendMessage,
    pickImage,
    pickVideo,
    pickFile,
    handleDeleteMessage,
    onViewableItemsChanged,
    resetMessageInput,
  };
}; 