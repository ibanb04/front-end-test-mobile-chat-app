import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  ListRenderItem
} from 'react-native';
import { useMessageSearch, type SearchResult } from '@/hooks/useMessageSearch';
import { ThemedText } from '@/components/common/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/hooks/AppContext';
import { messageSearchStyles } from '@/styles/components/messageSearch.styles';

interface MessageSearchProps {
  chatId?: string;
  onClose?: () => void;
}

export const MessageSearch = ({ chatId, onClose }: MessageSearchProps) => {
  const [searchText, setSearchText] = useState('');
  const { results, isSearching, error, search, clearSearch } = useMessageSearch();
  const router = useRouter();
  const { theme } = useAppContext();

  // Manejar la búsqueda de mensajes
  const handleSearch = useCallback((text: string) => {
    setSearchText(text);
    if (text.trim()) {
      search(text, chatId || '');
    } else {
      clearSearch();
    }
  }, [search, clearSearch, chatId]);

  const handleResultPress = useCallback((chatId: string) => {
    router.push(`/ChatRoom?chatId=${chatId}`);
    onClose?.();
  }, [router, onClose]);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();

    const isToday = isSameDay(date, today);

    if (isToday) {
      return formatTimeOnly(date);
    }

    const isYesterday = isSameDay(date, getPreviousDay(today));
    if (isYesterday) {
      return 'Yesterday';
    }

    return formatDateOnly(date, today);
  }, []);

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  };

  const getPreviousDay = (date: Date) => {
    const previousDay = new Date(date);
    previousDay.setDate(date.getDate() - 1);
    return previousDay;
  };

  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (date: Date, today: Date) => {
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderItem: ListRenderItem<SearchResult> = useCallback(({ item }) => (
    <Pressable
      style={[messageSearchStyles.resultItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleResultPress(item.chatId)}
    >
      <View style={messageSearchStyles.resultContent}>
        <View style={messageSearchStyles.messageInfo}>
          <ThemedText style={messageSearchStyles.chatName}>
            {item.chatName}
          </ThemedText>
          <ThemedText style={[messageSearchStyles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatDate(item.timestamp)}
          </ThemedText>
        </View>
        <ThemedText
          style={[messageSearchStyles.messageText, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.text}
        </ThemedText>
      </View>
    </Pressable>
  ), [theme.colors.border, theme.colors.textSecondary, handleResultPress, formatDate]);

  // Extraer la clave única para cada elemento
  const keyExtractor = useCallback((item: SearchResult) => item.id, []);

  // Renderizar el contenido según el estado
  const renderContent = useMemo(() => {
    if (error) {
      return <ThemedText style={messageSearchStyles.error}>{error}</ThemedText>;
    }

    if (isSearching) return <ActivityIndicator style={messageSearchStyles.loader} color={theme.colors.primary} />;


    if (results.length > 0) {
      return (
        <FlatList<SearchResult>
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={messageSearchStyles.resultsList}
        />
      );
    }

    if (searchText) {
      return (
        <View style={messageSearchStyles.noResultsContainer}>
          <IconSymbol name="search" size={48} color={theme.colors.textSecondary} />
          <ThemedText style={[messageSearchStyles.noResults, { color: theme.colors.textSecondary }]}>
            No messages found
          </ThemedText>
        </View>
      );
    }

    return null;
  },
    [
      error,
      isSearching,
      results, searchText,
      renderItem,
      keyExtractor,
      theme.colors.primary,
      theme.colors.textSecondary
    ]);

  return (
    <View style={messageSearchStyles.container}>
      <View style={[messageSearchStyles.searchBar, { borderBottomColor: theme.colors.border }]}>
        <IconSymbol name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[messageSearchStyles.input, { color: theme.colors.text }]}
          value={searchText}
          onChangeText={handleSearch}
          placeholder="Search messages..."
          placeholderTextColor={theme.colors.textSecondary}
          autoFocus
        />
        {searchText ? (
          <Pressable onPress={() => handleSearch('')}>
            <IconSymbol name="close-circle" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {renderContent}
    </View>
  );
};

