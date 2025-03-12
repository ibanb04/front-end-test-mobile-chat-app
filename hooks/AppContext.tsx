import React, { createContext, useContext, ReactNode } from 'react';
import { useUser, User } from './useUser';
import { useChats, Chat } from './useChats';

type AppContextType = {
  users: User[];
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (userId: string) => boolean;
  logout: () => void;
  chats: Chat[];
  createChat: (participantIds: string[]) => Chat | null;
  sendMessage: (chatId: string, text: string, senderId: string) => boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const userContext = useUser();
  const chatContext = useChats(userContext.currentUser?.id || null);

  const value = {
    ...userContext,
    ...chatContext,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
} 