import React, { createContext, useContext, useMemo } from 'react';
import { useUser } from './useUser';
import { useChats, type Chat } from './useChats';
import { DatabaseProvider } from '../database/DatabaseProvider';
import { useDatabase } from './useDatabase';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

type Theme = {
  colors: typeof Colors.light;
};

interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
}

interface Media {
  type: 'image' | 'video' | 'audio' | 'file';
  uri: string;
  name?: string;
  size?: number;
}

interface AppContextType {
  currentUser: User | null;
  users: User[];
  chats: Chat[];
  createChat: (participants: string[]) => Promise<Chat | null>;
  sendMessage: (chatId: string, text: string, senderId: string, media?: Media | null) => Promise<boolean>;
  markMessageAsRead: (messageId: string, userId: string) => Promise<boolean>;
  deleteMessage: (messageId: string, chatId: string) => Promise<boolean>;
  login: (userId: string) => Promise<boolean>;
  logout: () => void;
  isLoggedIn: boolean;
  loading: boolean;
  theme: Theme;
}

const AppContext = createContext<AppContextType | null>(null);

function AppContent({ children }: { children: React.ReactNode }) {
  const { isInitialized } = useDatabase();
  const { currentUser, users, login, isLoggedIn, loading: userLoading, logout } = useUser();
  const { chats, createChat, sendMessage, markMessageAsRead, loading: chatsLoading, deleteMessage } = useChats(currentUser?.id || null);
  const colorScheme = useColorScheme();
  const loading = useMemo(() => !isInitialized || userLoading || chatsLoading, [isInitialized, userLoading, chatsLoading]);

  const theme = useMemo(() => ({
    colors: Colors[colorScheme ?? 'light']
  }), [colorScheme]);

  const contextValue = {
    currentUser,
    users,
    chats,
    createChat,
    sendMessage,
    markMessageAsRead,
    login,
    isLoggedIn,
    loading,
    theme,
    logout,
    deleteMessage,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <DatabaseProvider>
      <AppContent>{children}</AppContent>
    </DatabaseProvider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
} 