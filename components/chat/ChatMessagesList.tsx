import React, { useCallback, useRef } from 'react';
import { FlatList, ViewToken } from 'react-native';
import { Message } from '@/interfaces/chatTypes';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ThemedView } from '@/components/common/ThemedView';
import { ThemedText } from '@/components/common/ThemedText';
import { chatRoomScreenStyles } from '@/styles/screens/chatRoomScreenStyles.styles';
import { useAppContext } from '@/hooks/AppContext';
import { useChats } from '@/hooks/useChats';

interface ChatMessagesListProps {
  messages: Message[];
  currentUserId: string;
  onDeleteMessage: (messageId: string) => void;
  flatListRef: React.RefObject<FlatList>;
  onViewableItemsChanged: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  chatId: string;
}

export const ChatMessagesList: React.FC<ChatMessagesListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  flatListRef,
  onViewableItemsChanged,
}) => {


  const viewabilityConfig = {
    itemVisiblePercentThreshold: 30, // 30% de la vista debe estar visible para considerar que es visible
    minimumViewTime: 500, // 500ms mínimo tiempo que debe estar visible el item para considerarlo visible
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isCurrentUser={item.senderId === currentUserId}
      onDelete={onDeleteMessage}
    />
  );

  const keyExtractor = (item: Message) => item.id;

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={keyExtractor}
      renderItem={renderMessage}
      contentContainerStyle={chatRoomScreenStyles.messagesContainer}
      ListEmptyComponent={() => (
        <ThemedView style={chatRoomScreenStyles.emptyContainer}>
          <ThemedText>No messages yet. Say hello!</ThemedText>
        </ThemedView>
      )}
      scrollEventThrottle={16}
      windowSize={5}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={30}
      initialNumToRender={10}
      removeClippedSubviews={true}
      onEndReachedThreshold={0.5}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
}; 