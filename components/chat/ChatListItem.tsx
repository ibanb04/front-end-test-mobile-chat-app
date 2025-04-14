import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Chat } from '@/hooks/useChats';
import { Avatar } from '@/components/Avatar';
import { ThemedText } from '@/components/common/ThemedText';
import { User } from '@/hooks/useUser';
import { MessageStatus } from './MessageStatus';

interface ChatListItemProps {
  chat: Chat;
  currentUserId: string;
  users: User[];
}


export const ChatListItem = ({ chat, currentUserId, users }: ChatListItemProps) => {
  const otherParticipants = users.filter(user =>
    chat.participants.includes(user.id) && user.id !== currentUserId
  );

  const firstParticipant = otherParticipants[0];
  const otherParticipantsCount = otherParticipants.length - 1;

  const getChatName = (): string => {
    if (!firstParticipant) return 'No participants';
    if (otherParticipantsCount === 0) return firstParticipant.name;

    return `${firstParticipant.name} & ${otherParticipantsCount} other${otherParticipantsCount > 1 ? 's' : ''}`;
  };

  const getMessagePreview = (): string => {
    if (!chat.lastMessage) return 'No messages yet';

    const { text } = chat.lastMessage;
    if (text.length <= 30) return text;

    return `${text.substring(0, 30)}...`;
  };

  const getFormattedTime = (): string => {
    if (!chat.lastMessage) return '';

    return new Date(chat.lastMessage.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUnread = chat.lastMessage?.status !== 'read';
  const isOwnMessage = chat.lastMessage?.senderId === currentUserId;

  return (
    <Link href={`/ChatRoom?chatId=${chat.id}`} asChild>
      <Pressable style={styles.container}>
        <Avatar
          uri={firstParticipant?.avatar}
          fallback={firstParticipant?.name?.[0] || '?'}
          size={50}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {getChatName()}
            </ThemedText>

            {chat.lastMessage && (
              <ThemedText style={styles.time}>
                {getFormattedTime()}
              </ThemedText>
            )}
          </View>

          <View style={styles.messagePreview}>
            <ThemedText
              style={[styles.preview, isUnread && styles.unreadPreview]}
              numberOfLines={1}
            >
              {getMessagePreview()}
            </ThemedText>

            {isOwnMessage && chat.lastMessage && (
              <MessageStatus message={chat.lastMessage} />
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  content: {
    marginLeft: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    fontSize: 14,
    color: '#8E8E93',
    flex: 1,
    marginRight: 4,
  },
  unreadPreview: {
    color: '#000000',
    fontWeight: '500',
  },
}); 