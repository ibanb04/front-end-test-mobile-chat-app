import { useState, useEffect, useCallback } from 'react';
import { useDatabaseStatus } from '../../database/DatabaseProvider';
import { Chat, Media } from '@/interfaces/chatTypes';
import { ChatRepository } from '@/database/repositories/ChatRepository';
import { ChatError } from '@/interfaces/chatRepository';

export function useChatsDb(currentUserId: string | null) {
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { isInitialized } = useDatabaseStatus();
  const chatRepository = new ChatRepository();

  const handleError = (error: unknown, action: string) => {
    if (error instanceof ChatError) {
      console.error(`Error al ${action}: ${error.message}`);
    } else {
      console.error(`Error desconocido al ${action}:`, error);
    }
  };

  const loadChats = useCallback(async () => {
    if (!isInitialized || !currentUserId) {
      setUserChats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const chats = await chatRepository.loadChats(currentUserId);
      setUserChats(chats);
    } catch (error) {
      handleError(error, 'cargar chats');
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
      const newChat = await chatRepository.createChat(participantIds);
      if (newChat) setUserChats(prevChats => [...prevChats, newChat]);
      return newChat;
    } catch (error) {
      handleError(error, 'crear chat');
      return null;
    }
  }, [currentUserId]);

  const sendMessage = useCallback(async (chatId: string, text: string, senderId: string, media?: Media | null) => {
    try {
      const newMessage = await chatRepository.sendMessage(chatId, text, senderId, media);
      // Actualizar el estado inicial con el mensaje enviado
      setUserChats(prevChats => prevChats.map(chat => 
        chat.id === chatId ? 
        { ...chat, messages: [...chat.messages, newMessage], lastMessage: newMessage } 
        : chat
      ));

      // Simular el cambio de estado a delivered después de 1 segundo
      setTimeout(() => {
        setUserChats(prevChats => prevChats.map(chat => 
          chat.id === chatId ? {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
            ),
            lastMessage: chat.lastMessage?.id === newMessage.id 
              ? { ...chat.lastMessage, status: 'delivered' } 
              : chat.lastMessage
          } : chat
        ));
      }, 1000);

      return true;
    } catch (error) {
      handleError(error, 'enviar mensaje');
      return false;
    }
  }, []);

  // Todo: fix this
 

  const deleteMessage = useCallback(async (messageId: string, chatId: string) => {
    try {
      const success = await chatRepository.deleteMessage(messageId, chatId);
      if (success) {
        setUserChats(prevChats => prevChats.map(chat => 
          chat.id === chatId ? { ...chat, messages: chat.messages.filter(msg => msg.id !== messageId), lastMessage: chat.messages.length > 1 ? chat.messages[chat.messages.length - 2] : undefined } : chat
        ));
      }
      return success;
    } catch (error) {
      handleError(error, 'eliminar mensaje');
      return false;
    }
  }, []);

  const markMessagesAsRead = useCallback(async (chatId: string, messageIds: string[]) => {
    try {
      if (!currentUserId || messageIds.length === 0) return;
      
      await chatRepository.markMessagesAsRead(chatId, currentUserId, messageIds);
      
      setUserChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            const updatedMessages = chat.messages.map(msg => 
              messageIds.includes(msg.id) ? { ...msg, status: 'read' as const } : msg
            );
            
            const lastMessage = chat.lastMessage && messageIds.includes(chat.lastMessage.id)
              ? { ...chat.lastMessage, status: 'read' as const }
              : chat.lastMessage;
              
            return {
              ...chat,
              messages: updatedMessages,
              lastMessage,
            };
          }
          return chat;
        });
      });
    } catch (error) {
      console.error('Error al marcar mensajes como leídos:', error);
      handleError(error, 'marcar mensajes como leídos');
    }
  }, [currentUserId]);

  return {
    chats: userChats,
    createChat,
    sendMessage,
    deleteMessage,
    markMessagesAsRead,
    loading: loading || !isInitialized,
  };
}