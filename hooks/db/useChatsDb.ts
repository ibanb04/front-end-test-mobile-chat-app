import { useState, useEffect, useCallback } from 'react';
import { db } from '../../database/db';
import { chats, chatParticipants, messages, messageReads } from '../../database/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { useDatabaseStatus } from '../../database/DatabaseProvider';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reads?: Array<{
    userId: string;
    timestamp: number;
  }>;
}

export interface Chat {
  id: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
}

export function useChatsDb(currentUserId: string | null) {
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { isInitialized } = useDatabaseStatus();

  useEffect(() => {
    console.log('useChatsDb effect triggered, isInitialized:', isInitialized, 'currentUserId:', currentUserId);
    
    if (!isInitialized) {
      console.log('Database not initialized yet, waiting...');
      setLoading(false);
      return;
    }

    if (!currentUserId) {
      setUserChats([]);
      setLoading(false);
      return;
    }

    const loadChats = async () => {
      setLoading(true);
      try {
        // Get all chats where the current user is a participant
        console.log('Fetching participant chats...');
        const participantChats = await db
          .select()
          .from(chatParticipants)
          .where(eq(chatParticipants.userId, currentUserId));
        
        console.log('Found participant chats:', participantChats.length);
        const chatIds = participantChats.map(pc => pc.chatId);
        
        if (chatIds.length === 0) {
          setUserChats([]);
          setLoading(false);
          return;
        }
        
        // Get all participants for these chats
        console.log('Fetching all participants for chats:', chatIds);
        const allParticipants = await db
          .select()
          .from(chatParticipants)
          .where(inArray(chatParticipants.chatId, chatIds));
        
        console.log('Found participants:', allParticipants.length);
        
        // Group participants by chat
        const participantsByChat = allParticipants.reduce((acc, p) => {
          if (!acc[p.chatId]) {
            acc[p.chatId] = [];
          }
          acc[p.chatId].push(p.userId);
          return acc;
        }, {} as Record<string, string[]>);
        
        // Get all messages for these chats
        console.log('Fetching messages for chats');
        const messagesData = await db
          .select()
          .from(messages)
          .where(inArray(messages.chatId, chatIds))
          .orderBy(desc(messages.timestamp));
        
        console.log('Found messages:', messagesData.length);
        
        // Group messages by chat
        const messagesByChat = messagesData.reduce((acc, m) => {
          if (!acc[m.chatId]) {
            acc[m.chatId] = [];
          }
          acc[m.chatId].push(m);
          return acc;
        }, {} as Record<string, typeof messagesData>);
        
        // Build the chat objects
        console.log('Building chat objects...');
        const loadedChats: Chat[] = [];
        
        for (const chatId of chatIds) {
          const participantIds = participantsByChat[chatId] || [];
          const chatMessages = await Promise.all((messagesByChat[chatId] || []).map(async m => {
            const reads = await db
              .select()
              .from(messageReads)
              .where(eq(messageReads.messageId, m.id));
              
            return {
              id: m.id,
              chatId: m.chatId,
              senderId: m.senderId,
              text: m.text,
              timestamp: m.timestamp,
              status: m.status as 'sent' | 'delivered' | 'read',
              reads: reads.map(r => ({
                userId: r.userId,
                timestamp: r.timestamp,
              })),
            };
          }));
          
          const reversedMessages = chatMessages.reverse();
          
          // Determine last message
          const lastMessage = reversedMessages.length > 0 
            ? reversedMessages[reversedMessages.length - 1] 
            : undefined;
          
          loadedChats.push({
            id: chatId,
            participants: participantIds,
            messages: reversedMessages,
            lastMessage,
          });
        }

        setUserChats(loadedChats);
      } catch (error) {
        console.error('Error loading chats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChats();
  }, [currentUserId, isInitialized]);

  const createChat = useCallback(async (participantIds: string[]) => {
    if (!currentUserId || !participantIds.includes(currentUserId)) {
      return null;
    }
    
    try {
      const chatId = `chat${Date.now()}`;
      
      // Insert new chat
      await db.insert(chats).values({
        id: chatId,
      });
      
      // Insert participants
      for (const userId of participantIds) {
        await db.insert(chatParticipants).values({
          id: `cp-${chatId}-${userId}`,
          chatId: chatId,
          userId: userId,
        });
      }
      
      const newChat: Chat = {
        id: chatId,
        participants: participantIds,
        messages: [],
      };
      
      setUserChats(prevChats => [...prevChats, newChat]);
      return newChat;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  }, [currentUserId, isInitialized]);

  const sendMessage = useCallback(async (chatId: string, text: string, senderId: string) => {
    if (!text.trim()) return false;
    
    try {
      const messageId = `msg${Date.now()}`;
      const timestamp = Date.now();
      
      // Insert new message
      await db.insert(messages).values({
        id: messageId,
        chatId: chatId,
        senderId: senderId,
        text: text,
        timestamp: timestamp,
        status: 'sent',
      });
      
      const newMessage: Message = {
        id: messageId,
        chatId,
        senderId,
        text,
        timestamp,
        status: 'sent',
        reads: [],
      };
      
      // Update state
      setUserChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: newMessage,
            };
          }
          return chat;
        });
      });
      
      // Simulate message delivery after 1 second
      setTimeout(async () => {
        await db.update(messages)
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
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, [isInitialized]);

  const markMessageAsRead = useCallback(async (messageId: string, userId: string) => {
    if (!isInitialized) {
      console.error('Database not initialized');
      return false;
    }

    try {
      const timestamp = Date.now();
      
      // Insert message read
      await db.insert(messageReads).values({
        id: `read${timestamp}`, //  to be changed to a unique id
        messageId: messageId,
        userId: userId,
        timestamp: timestamp,
      });
      
      // Update message status
      await db.update(messages)
        .set({ status: 'read' })
        .where(eq(messages.id, messageId));
      
      // Update state
      setUserChats(prevChats => {
        return prevChats.map(chat => {
          const updatedMessages = chat.messages.map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                status: 'read' as const,
                reads: [
                  ...(msg.reads || []),
                  { userId, timestamp },
                ],
              };
            }
            return msg;
          });
          
          return {
            ...chat,
            messages: updatedMessages,
            lastMessage: chat.lastMessage?.id === messageId
              ? { ...chat.lastMessage, status: 'read' as const }
              : chat.lastMessage,
          };
        });
      });
      
      return true;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return false;
    }
  }, [isInitialized]);

  return {
    chats: userChats,
    createChat,
    sendMessage,
    markMessageAsRead,
    loading: loading || !isInitialized,
  };
} 