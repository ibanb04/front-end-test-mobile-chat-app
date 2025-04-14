import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Chat } from '@/hooks/useChats';
import { Avatar } from '@/components/Avatar';
import { ThemedText } from '@/components/common/ThemedText';
import { User } from '@/hooks/useUser';

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string;
  users: User[];
}

export function ChatListItem({ chat, currentUserId, users }: ChatListItemProps) {
  const chatParticipants = useMemo(() => {
    return chat.participants
      .filter(id => id !== currentUserId)
      .map(id => users.find(user => user.id === id))
      .filter((user): user is User => user !== undefined);
  }, [chat.participants, currentUserId, users]);

  const chatName = useMemo(() => {
    if (chatParticipants.length === 0) return 'No participants';
    if (chatParticipants.length === 1) return chatParticipants[0].name;
    return `${chatParticipants[0].name} & ${chatParticipants.length - 1} other${chatParticipants.length > 2 ? 's' : ''}`;
  }, [chatParticipants]);

  const lastMessagePreview = chat.lastMessage
    ? chat.lastMessage.text.length > 30
      ? chat.lastMessage.text.substring(0, 30) + '...'
      : chat.lastMessage.text
    : 'No messages yet';

  return (
    <Link href={`/ChatRoom?chatId=${chat.id}`} asChild>
      <Pressable style={styles.container}>
        <Avatar
          uri={chatParticipants[0]?.avatar}
          fallback={chatParticipants[0]?.name[0]}
          size={50}
        />
        <View style={styles.content}>
          <ThemedText style={styles.name}>{chatName}</ThemedText>
          <ThemedText style={styles.preview} type="default">
            {lastMessagePreview}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    marginLeft: 10,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  preview: {
    fontSize: 14,
    color: '#666',
  },
}); 