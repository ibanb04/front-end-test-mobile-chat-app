import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useUser } from './useUser';
import { useChats, type Chat, type Message } from './useChats';
import { DatabaseProvider } from '../database/DatabaseProvider';
import { useDatabase } from './useDatabase';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

type Theme = {
  colors: typeof Colors.light;
};

interface AppContextType {
  currentUser: {
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
  } | null;
  users: Array<{
    id: string;
    name: string;
    avatar: string;
    status: 'online' | 'offline' | 'away';
  }>;
  chats: Chat[];
  createChat: (participants: string[]) => Promise<Chat | null>;
  sendMessage: (
    chatId: string,
    text: string,
    senderId: string,
    media?: {
      type: 'image' | 'video' | 'audio' | 'file';
      uri: string;
      name?: string;
      size?: number;
    } | null
  ) => Promise<boolean>;
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
  const loading = !isInitialized || userLoading || chatsLoading;

  const theme = {
    colors: Colors[colorScheme ?? 'light']
  };

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
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