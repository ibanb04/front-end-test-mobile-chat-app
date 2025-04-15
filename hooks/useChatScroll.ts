import { useRef, useState, useCallback } from 'react';
import { NativeSyntheticEvent, NativeScrollEvent, FlatList } from 'react-native';

export const useChatScroll = () => {
  const flatListRef = useRef<FlatList>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const handleContentSizeChange = useCallback(() => {
    if (isAtBottom && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [isAtBottom]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    setIsAtBottom(isCloseToBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, []);

  return {
    flatListRef,
    isAtBottom,
    handleContentSizeChange,
    handleScroll,
    scrollToBottom,
  };
}; 