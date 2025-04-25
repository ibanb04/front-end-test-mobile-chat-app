import { useCallback, useRef } from 'react';
import { ViewToken } from 'react-native';
import { useAppContext } from './AppContext';
import { Message } from '@/interfaces/chatTypes';
import { useChats } from './useChats';


export const useMessageStatus = (currentUserId: string, chatId: string) => {
  const { currentUser } = useAppContext();
  const { markMessagesAsRead } = useChats(currentUserId);
  const visibleMessageIds = useRef<Set<string>>(new Set());
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (!currentUser) return;

    const unreadMessages = viewableItems
      .filter((item) => {
        const message = item.item as Message;
        return message.senderId !== currentUserId && message.status !== 'read';
      })
      .map((item) => item.item.id);

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(id => visibleMessageIds.current.add(id));
      
      // Actualizar mensajes como leídos
      markMessagesAsRead(chatId, Array.from(visibleMessageIds.current));
    }
  }, [currentUserId, chatId, currentUser, markMessagesAsRead]);
  return {
    onViewableItemsChanged,
  };
}; 