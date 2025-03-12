import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useSegments, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppProvider, useAppContext } from '@/hooks/AppContext';

SplashScreen.preventAutoHideAsync();

function useProtectedRoute(isLoggedIn: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === 'login';
    
    if (!isLoggedIn && !inAuthGroup) {
      // Redirect to the login page if not logged in
      router.replace('/login');
    } else if (isLoggedIn && inAuthGroup) {
      // Redirect to the home page if logged in and trying to access login page
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments]);
}

function RootLayoutNav() {
  const { isLoggedIn } = useAppContext();
  
  // Use the helper hook to protect routes
  useProtectedRoute(isLoggedIn);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="login" 
        options={{ headerShown: false, gestureEnabled: false }} 
      />
      <Stack.Screen 
        name="ChatRoom" 
        options={{ headerShown: true }} 
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </AppProvider>
    </ThemeProvider>
  );
}
