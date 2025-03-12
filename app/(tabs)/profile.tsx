import React, { useEffect } from 'react';
import { StyleSheet, FlatList } from 'react-native';
import { useAppContext } from '@/hooks/AppContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Avatar } from '@/components/Avatar';
import { UserListItem } from '@/components/UserListItem';

export default function ProfileScreen() {
  const { users, currentUser, login, isLoggedIn } = useAppContext();

  useEffect(() => {
    if (!isLoggedIn && users.length > 0) {
      login(users[0].id);
    }
  }, [isLoggedIn, users]);

  const handleUserSelect = (userId: string) => {
    login(userId);
  };

  return (
    <ThemedView style={styles.container}>
      {currentUser ? (
        <ThemedView style={styles.profileHeader}>
          <Avatar user={currentUser} size={100} />
          <ThemedView style={styles.profileInfo}>
            <ThemedText type="title">{currentUser.name}</ThemedText>
            <ThemedText style={styles.statusText}>
              {currentUser.status.charAt(0).toUpperCase() + currentUser.status.slice(1)}
            </ThemedText>
          </ThemedView>
        </ThemedView>
      ) : (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText>Loading user profile...</ThemedText>
        </ThemedView>
      )}
      
      <ThemedView style={styles.section}>
        <ThemedText type="subtitle">Switch User</ThemedText>
        <ThemedText style={styles.sectionDescription}>
          Select a user from the list below to switch accounts
        </ThemedText>
      </ThemedView>
      
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserListItem
            user={item}
            onSelect={() => handleUserSelect(item.id)}
            isSelected={currentUser?.id === item.id}
          />
        )}
        contentContainerStyle={styles.listContainer}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  statusText: {
    fontSize: 16,
    color: '#8F8F8F',
    marginTop: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E1E1E1',
  },
  sectionDescription: {
    marginTop: 8,
    color: '#8F8F8F',
  },
  listContainer: {
    paddingBottom: 20,
  },
});
