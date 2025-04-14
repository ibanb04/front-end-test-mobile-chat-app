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
  ViewabilityConfig
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAppContext } from '@/hooks/AppContext';
import { ThemedText } from '@/components/common/ThemedText';
import { ThemedView } from '@/components/common/ThemedView';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Avatar } from '@/components/Avatar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import type { Message } from '@/hooks/useChats';

export default function ChatRoomScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { currentUser, users, chats, sendMessage, markMessageAsRead } = useAppContext();
  const [messageText, setMessageText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const chat = chats.find(c => c.id === chatId);

  const chatParticipants = chat?.participants
    .filter((id: string) => id !== currentUser?.id)
    .map((id: string) => users.find(user => user.id === id))
    .filter(Boolean) || [];

  const chatName = chatParticipants.length === 1
    ? chatParticipants[0]?.name
    : `${chatParticipants[0]?.name || 'Unknown'} & ${chatParticipants.length - 1} other${chatParticipants.length > 1 ? 's' : ''}`;

  const handleSendMessage = () => {
    if (messageText.trim() && currentUser && chat) {
      sendMessage(chat.id, messageText.trim(), currentUser.id);
      setMessageText('');
    }
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

  useEffect(() => {
    if (chat?.messages.length && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
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
    <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
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
                <IconSymbol name="chevron-back" size={24} color="#007AFF" />
              </Pressable>
            ),
          }}
        />

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
          }} // para que se mantenga la posición de la lista cuando se carga el chat  
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChangedRef.current}
          initialScrollIndex={chat.messages.length > 0 ? chat.messages.length - 1 : 0}
        />

        <ThemedView style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            multiline
          />
          <Pressable
            style={[styles.sendButton, !messageText.trim() && styles.disabledButton]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <IconSymbol name="arrow-up-circle" size={32} color="#007AFF" />
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
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
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 20,
    padding: 10,
    maxHeight: 100,
    backgroundColor: '#F9F9F9',
  },
  sendButton: {
    marginLeft: 10,
    marginBottom: 5,
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
}); 