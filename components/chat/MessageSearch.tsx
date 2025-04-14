import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
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
      style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleResultPress(item.chatId)}
    >
      <View style={styles.resultContent}>
        <View style={styles.messageInfo}>
          <ThemedText style={styles.chatName}>
            {item.chatName}
          </ThemedText>
          <ThemedText style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
            {formatDate(item.timestamp)}
          </ThemedText>
        </View>
        <ThemedText
          style={[styles.messageText, { color: theme.colors.textSecondary }]}
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
      return <ThemedText style={styles.error}>{error}</ThemedText>;
    }

    if (isSearching) {
      return <ActivityIndicator style={styles.loader} color={theme.colors.primary} />;
    }

    if (results.length > 0) {
      return (
        <FlatList<SearchResult>
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.resultsList}
        />
      );
    }

    if (searchText) {
      return (
        <View style={styles.noResultsContainer}>
          <IconSymbol name="search" size={48} color={theme.colors.textSecondary} />
          <ThemedText style={[styles.noResults, { color: theme.colors.textSecondary }]}>
            No messages found
          </ThemedText>
        </View>
      );
    }

    return null;
  }, [error, isSearching, results, searchText, renderItem, keyExtractor, theme.colors.primary, theme.colors.textSecondary]);

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, { borderBottomColor: theme.colors.border }]}>
        <IconSymbol name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.colors.text }]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 17,
    marginHorizontal: 8,
    paddingVertical: 8,
  },
  resultsList: {
    paddingTop: 8,
  },
  resultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultContent: {
    flex: 1,
  },
  messageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
  },
  loader: {
    marginTop: 20,
  },
  error: {
    color: '#FF3B30',
    textAlign: 'center',
    margin: 16,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: '20%',
  },
  noResults: {
    marginTop: 12,
    fontSize: 15,
  },
}); 