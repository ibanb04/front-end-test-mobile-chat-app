import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../../database/db';
import { chats, chatParticipants, messages, messageReads, users } from '../../database/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { useDatabaseStatus } from '../../database/DatabaseProvider';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
}

export interface Media {
  type: 'image' | 'video' | 'audio' | 'file';
  uri: string;
  name?: string;
  size?: number;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  mediaType?: 'image' | 'video' | 'audio' | 'file' | null;
  mediaUrl?: string | null;
  mediaSize?: number | null;
  mediaName?: string | null;
  reads?: Array<{
    userId: string;
    timestamp: number;
  }>;
}

export interface Chat {
  id: string;
  participants: User[];
  messages: Message[];
  lastMessage?: Message;
}

export function useChatsDb(currentUserId: string | null) {
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { isInitialized } = useDatabaseStatus();

  // Optimized query to fetch all necessary data in a single transaction
  const loadChats = useCallback(async () => {
    if (!isInitialized || !currentUserId) {
      setUserChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get all chats for the current user
      const userChats = await db
        .select({ chatId: chatParticipants.chatId })
        .from(chatParticipants)
        .where(eq(chatParticipants.userId, currentUserId));

      if (userChats?.length === 0) {
        setUserChats([]);
        return;
      }
      // Get all chat IDs for the current user
      const chatIds = userChats.map(c => c.chatId);

      // Fetch all necessary data in a single transaction 
      const [chatData, messagesWithReads] = await Promise.all([
        // Fetch all chat participants and their info
        db
          .select({
            chatId: chatParticipants.chatId,
            participantId: chatParticipants.userId,
            userName: users.name,
            userAvatar: users.avatar,
            userStatus: users.status,
          })
          .from(chatParticipants)
          .innerJoin(users, eq(chatParticipants.userId, users.id))
          .where(inArray(chatParticipants.chatId, chatIds)),

        // Fetch all messages with their reads
        db
          .select({
            message: messages,
            reads: messageReads,
          })
          .from(messages)
          .leftJoin(messageReads, eq(messages.id, messageReads.messageId))
          .where(inArray(messages.chatId, chatIds))
          .orderBy(desc(messages.timestamp))
      ]);

      // Process the chats and messages in a single transaction
      const processedChats: Chat[] = chatIds.map(chatId => {
        const chatMessages = messagesWithReads
          .filter(m => m.message.chatId === chatId)
          .map(({ message, reads }) => ({
            ...message,
            status: message.status as 'sent' | 'delivered' | 'read',
            reads: reads ? [{ userId: reads.userId, timestamp: reads.timestamp }] : [],
          }));

        const participants = chatData
          .filter(c => c.chatId === chatId)
          .map(c => ({
            id: c.participantId,
            name: c.userName,
            avatar: c.userAvatar,
            status: c.userStatus,
          }));

        const lastMessage = chatMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
        return {
          id: chatId,
          participants,
          messages: chatMessages.reverse(),
          lastMessage,
        };
      });

      setUserChats(processedChats);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isInitialized]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const createChat = useCallback(async (participantIds: string[]) => {
    if (!currentUserId || !participantIds.includes(currentUserId)) return null;

    try {
      const chatId = `chat${Date.now()}`;

      // Insert new chat and participants in a single transaction
      await db.transaction(async (tx) => {
        await tx.insert(chats).values({ id: chatId });

        const participantValues = participantIds.map(userId => ({
          id: `cp-${chatId}-${userId}`,
          chatId,
          userId,
        }));
        await tx.insert(chatParticipants).values(participantValues);
      });

      // Get user info for participants
      const participantUsers = await db
        .select()
        .from(users)
        .where(inArray(users.id, participantIds));

      const newChat: Chat = {
        id: chatId,
        participants: participantUsers.map(({ id, name, avatar, status }) => ({
          id, name, avatar, status
        })),
        messages: [],
      };

      setUserChats(prevChats => [...prevChats, newChat]);
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [currentUserId, isInitialized]);

  // Optimized message sending with batch updates
  const sendMessage = useCallback(async (
    chatId: string,
    text: string,
    senderId: string,
    media?: {
      type: 'image' | 'video' | 'audio' | 'file';
      uri: string;
      name?: string;
      size?: number;
    } | null
  ) => {
    if (!text.trim() && !media) return false;

    const messageId = `msg${Date.now()}`;
    const timestamp = Date.now();

    const validateMedia = async (media: Media | null | undefined) => {
      if (media && Platform.OS === 'ios') {
        const mediaInfo = await FileSystem.getInfoAsync(media.uri);
        if (!mediaInfo.exists) {
          throw new Error('El archivo multimedia no existe o no es accesible');
        }
      }
    };

    try {
      await validateMedia(media);
      // Batch insert message and update state
      await db.transaction(async (tx) => {
        await tx.insert(messages).values({
          id: messageId,
          chatId,
          senderId,
          text,
          timestamp,
          status: 'sent',
          mediaType: media?.type,
          mediaUrl: media?.uri,
          mediaSize: media?.size,
          mediaName: media?.name,
        });

        // Update state with optimistic update
        setUserChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === chatId) {
              const newMessage = {
                id: messageId,
                chatId,
                senderId,
                text,
                timestamp,
                status: 'sent' as const,
                mediaType: media?.type,
                mediaUrl: media?.uri,
                mediaSize: media?.size,
                mediaName: media?.name,
                reads: [],
              };

              return {
                ...chat,
                messages: [...chat.messages, newMessage],
                lastMessage: newMessage,
              };
            }
            return chat;
          });
        });
      });

      // Simulate message delivery after 1 second
      setTimeout(async () => {
        await db.transaction(async (tx) => {
          await tx.update(messages)
            .set({ status: 'delivered' })
            .where(eq(messages.id, messageId));

          setUserChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id === chatId) {
                return {
                  ...chat,
                  messages: chat.messages.map(msg => 
                    msg.id === messageId 
                      ? { ...msg, status: 'delivered' as const }
                      : msg
                  ),
                  lastMessage: chat.lastMessage?.id === messageId
                    ? { ...chat.lastMessage, status: 'delivered' as const }
                    : chat.lastMessage,
                };
              }
              return chat;
            });
          });
        });
      }, 1000);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  const markMessageAsRead = useCallback(async (messageId: string, userId: string) => {
    if (!isInitialized) {
      console.error('Database not initialized');
      return false;
    }

    try {
      const timestamp = Date.now();
      const readEntry = {
        id: `read${timestamp}`, // Cambiar a un id único
        messageId,
        userId,
        timestamp,
      };

      // Insertar lectura de mensaje y actualizar estado del mensaje
      await Promise.all([
        db.insert(messageReads).values(readEntry),
        db.update(messages).set({ status: 'read' }).where(eq(messages.id, messageId))
      ]);

      // Actualizar estado local
      setUserChats(prevChats => prevChats.map(chat => {
        const updatedMessages = chat.messages.map(msg => 
          msg.id === messageId 
            ? { 
                ...msg, 
                status: 'read' as const, 
                reads: [...(msg.reads || []), { userId, timestamp }] 
              }
            : msg
        );

        return {
          ...chat,
          messages: updatedMessages,
          lastMessage: chat.lastMessage?.id === messageId
            ? { ...chat.lastMessage, status: 'read' }
            : chat.lastMessage,
        };
      }));

      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }, [isInitialized]);

  const deleteMessage = useCallback(async (messageId: string, chatId: string) => {
    if (!isInitialized) {
      console.error('Database not initialized');
      return false;
    }

    try {
      // Eliminar el mensaje de la base de datos
      await db.delete(messages)
        .where(eq(messages.id, messageId));

      // Actualizar el estado local
      setUserChats(prevChats => prevChats.map(chat => 
        chat.id === chatId 
          ? {
              ...chat,
              messages: chat.messages.filter(msg => msg.id !== messageId),
              lastMessage: chat.messages.length > 1 
                ? chat.messages[chat.messages.length - 2]  // TODO: change to the last message
                : undefined
            }
          : chat
      ));

      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }, [isInitialized]);

  return {
    chats: userChats,
    createChat,
    sendMessage,
    markMessageAsRead,
    deleteMessage,
    loading: loading || !isInitialized,
  };
} 