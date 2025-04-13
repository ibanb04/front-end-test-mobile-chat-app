import { useChatsDb, Chat, Message } from './db/useChatsDb';

export { Chat, Message };

export function useChats(currentUserId: string | null) {
  const { 
    chats, 
    createChat, 
    sendMessage, 
    loading 
  } = useChatsDb(currentUserId);

  // aux function to sort chats by last message timestamp in descending order
  const sortChatsByLastMessage = (chats: Chat[]): Chat[] => {
    return [...chats].sort((a, b) => {
      const lastMessageA = a.lastMessage?.timestamp || 0;
      const lastMessageB = b.lastMessage?.timestamp || 0;
      return lastMessageB - lastMessageA; // descending order
    });
  };

  return {
    chats: sortChatsByLastMessage(chats),
    createChat,
    sendMessage,
    loading,
  };
} 