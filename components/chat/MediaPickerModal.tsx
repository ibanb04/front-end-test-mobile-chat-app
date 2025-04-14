import React from 'react';
import { View, StyleSheet, Pressable, ActionSheetIOS, Platform, Modal } from 'react-native';
import { ThemedText } from '@/components/common/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: () => void;
  onSelectVideo: () => void;
  onSelectFile: () => void;
}

const MEDIA_OPTIONS = [
  { icon: 'image-outline', label: 'Imagen', action: 'onSelectImage' },
  { icon: 'videocam-outline', label: 'Video', action: 'onSelectVideo' },
  { icon: 'document-outline', label: 'Archivo', action: 'onSelectFile' },
] as const;

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
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={[styles.container, { backgroundColor: isDark ? '#2A2C33' : '#FFFFFF' }]}
          onStartShouldSetResponder={() => true}
        >
          <ThemedText style={styles.title}>Select media</ThemedText>
          <View style={styles.optionsContainer}>
            {MEDIA_OPTIONS.map((option, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed
                ]}
                onPress={() => handleOptionPress(option.action)}
                hitSlop={10}
              >
                <IconSymbol
                  name={option.icon as any}
                  size={24}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
                <ThemedText style={styles.optionText}>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  option: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionText: {
    marginTop: 8,
    fontSize: 14,
  },
}); 