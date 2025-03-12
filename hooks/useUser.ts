import { useState } from 'react';

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
}

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    avatar: 'https://i.pravatar.cc/150?img=1',
    status: 'online',
  },
  {
    id: '2',
    name: 'Jane Smith',
    avatar: 'https://i.pravatar.cc/150?img=2',
    status: 'offline',
  },
  {
    id: '3',
    name: 'Mike Johnson',
    avatar: 'https://i.pravatar.cc/150?img=3',
    status: 'away',
  },
  {
    id: '4',
    name: 'Sarah Williams',
    avatar: 'https://i.pravatar.cc/150?img=4',
    status: 'online',
  },
];

export function useUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const login = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return {
    users: mockUsers,
    currentUser,
    login,
    logout,
    isLoggedIn: !!currentUser,
  };
} 