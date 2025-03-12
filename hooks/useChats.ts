import { useState, useEffect } from 'react';
import { User } from './useUser';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  participants: string[];
  messages: Message[];
  lastMessage?: Message;
}

const initialChats: Chat[] = [
  {
    id: 'chat1',
    participants: ['1', '2'],
    messages: [
      {
        id: 'msg1',
        senderId: '2',
        text: 'Hey, how are you?',
        timestamp: Date.now() - 3600000,
      },
      {
        id: 'msg2',
        senderId: '1',
        text: 'I\'m good, thanks for asking!',
        timestamp: Date.now() - 1800000,
      },
    ],
  },
  {
    id: 'chat2',
    participants: ['1', '3'],
    messages: [
      {
        id: 'msg3',
        senderId: '3',
        text: 'Did you check the project?',
        timestamp: Date.now() - 86400000,
      },
    ],
  },
];

initialChats.forEach(chat => {
  if (chat.messages.length > 0) {
    chat.lastMessage = chat.messages[chat.messages.length - 1];
  }
});

export function useChats(currentUserId: string | null) {
  const [chats, setChats] = useState<Chat[]>(initialChats);
  const [userChats, setUserChats] = useState<Chat[]>([]);
  
  useEffect(() => {
    if (currentUserId) {
      const filteredChats = chats.filter(chat => 
        chat.participants.includes(currentUserId)
      );
      setUserChats(filteredChats);
    } else {
      setUserChats([]);
    }
  }, [currentUserId, chats]);

  const createChat = (participantIds: string[]) => {
    if (!currentUserId || !participantIds.includes(currentUserId)) {
      return null;
    }
    
    const newChat: Chat = {
      id: `chat${Date.now()}`,
      participants: participantIds,
      messages: [],
    };
    
    setChats(prevChats => [...prevChats, newChat]);
    return newChat;
  };

  const sendMessage = (chatId: string, text: string, senderId: string) => {
    if (!text.trim()) return false;
    
    const newMessage: Message = {
      id: `msg${Date.now()}`,
      senderId,
      text,
      timestamp: Date.now(),
    };
    
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === chatId) {
          const updatedChat = {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: newMessage,
          };
          return updatedChat;
        }
        return chat;
      });
    });
    
    return true;
  };

  return {
    chats: userChats,
    createChat,
    sendMessage,
  };
} 