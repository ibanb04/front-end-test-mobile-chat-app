import React from 'react';
import { FlatList } from 'react-native';
import { Message } from '@/interfaces/chatTypes';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ThemedView } from '@/components/common/ThemedView';
import { ThemedText } from '@/components/common/ThemedText';
import { chatRoomScreenStyles } from '@/styles/screens/chatRoomScreenStyles.styles';

interface ChatMessagesListProps {
  messages: Message[];
  currentUserId: string;
  onDeleteMessage: (messageId: string) => void;
  onViewableItemsChanged: (info: { viewableItems: any[] }) => void;
  flatListRef: React.RefObject<FlatList>;
  onContentSizeChange: () => void;
  onScroll: (event: any) => void;
}

export const ChatMessagesList: React.FC<ChatMessagesListProps> = ({
  messages,
  currentUserId,
  onDeleteMessage,
  onViewableItemsChanged,
  flatListRef,
  onContentSizeChange,
  onScroll,
}) => {
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 30,
    minimumViewTime: 500,
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <MessageBubble
      message={item}
      isCurrentUser={item.senderId === currentUserId}
      onDelete={onDeleteMessage}
    />
  );

  const keyExtractor = (item: Message) => item.id;
  const getItemLayout = (data: any, index: number) => ({
    length: 80,
    offset: 80 * index,
    index,
  });
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
      onContentSizeChange={onContentSizeChange}
      onScroll={onScroll}
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
      onViewableItemsChanged={onViewableItemsChanged}
    />
  );
}; 