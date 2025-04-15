import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Message } from '@/interfaces/chatTypes';
import { useColorScheme } from '@/hooks/useColorScheme';

interface MessageStatusProps {
  message: Message;
}

export function MessageStatus({ message }: MessageStatusProps) {
  const isDark = useColorScheme() === 'dark';
  const color = message.status === 'read' ? '#0084FF' : (isDark ? '#8E8E93' : '#8F8F8F');

  return (
    <View style={styles.container}>
      {message.status === 'sent' ? (
        <IconSymbol
          name="checkmark"
          size={12}
          color={color}
        />
      ) : (
        <View style={styles.doubleCheckContainer}>
          <IconSymbol
            name="checkmark"
            size={12}
            color={color}
            style={styles.firstCheck}
          />
          <IconSymbol
            name="checkmark"
            size={12}
            color={color}
            style={styles.secondCheck}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 16,
    height: 12,
  },
  firstCheck: {
    position: 'absolute',
    left: 0,
  },
  secondCheck: {
    position: 'absolute',
    left: 4,
  },
});