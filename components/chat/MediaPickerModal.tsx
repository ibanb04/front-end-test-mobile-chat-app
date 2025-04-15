import React from 'react';
import { View, Pressable, ActionSheetIOS, Platform, Modal } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { mediaPickerModalStyles } from '@/styles/components/mediaPickerModal.styles';
import { MEDIA_OPTIONS } from '@/constants/mediaOptions';
interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onSelectFile: () => void;
}

export function MediaPickerModal({
  visible,
  onClose,
  onSelectImage,
  onSelectVideo,
  onSelectFile,
}: MediaPickerModalProps) {
  const isDark = useColorScheme() === 'dark';

  // Manejo específico para iOS
  React.useEffect(() => {
    if (visible && Platform.OS === 'ios') {
      const options = ['Cancelar', ...MEDIA_OPTIONS.map(opt => opt.label)];

      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 1:
              onSelectImage();
              break;
            case 2:
              onSelectVideo();
              break;
            case 3:
              onSelectFile();
              break;
            default:
              break;
          }
          onClose();
        }
      );
    }
  }, [visible, onClose, onSelectImage, onSelectVideo, onSelectFile]);

  if (Platform.OS === 'ios' || !visible) {
    return null;
  }

  const handleOptionPress = (action: string) => {
    onClose();
    switch (action) {
      case 'onSelectImage':
        onSelectImage();
        break;
      case 'onSelectVideo':
        onSelectVideo();
        break;
      case 'onSelectFile':
        onSelectFile();
        break;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={mediaPickerModalStyles.overlay} onPress={onClose}>
        <View
          style={[mediaPickerModalStyles.container, { backgroundColor: isDark ? '#2A2C33' : '#FFFFFF' }]}
          onStartShouldSetResponder={() => true}
        >
          <ThemedText style={mediaPickerModalStyles.title}>Select media</ThemedText>
          <View style={mediaPickerModalStyles.optionsContainer}>
            {MEDIA_OPTIONS.map((option, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  mediaPickerModalStyles.option,
                  pressed && mediaPickerModalStyles.optionPressed
                ]}
                onPress={() => handleOptionPress(option.action)}
                hitSlop={10}
              >
                <IconSymbol
                  name={option.icon as any}
                  size={24}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
                <ThemedText style={mediaPickerModalStyles.optionText}>
                  {option.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

