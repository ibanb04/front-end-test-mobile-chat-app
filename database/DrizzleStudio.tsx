import React from 'react';
import { View } from 'react-native';
import * as SQLite from 'expo-sqlite';

// We'll use this as a placeholder in case the plugin isn't available
const NoopStudio = () => null;

// Import only in development
let useDrizzleStudio: any = NoopStudio;

// Only try to load the plugin in development mode
if (__DEV__) {
  try {
    // This package may not be installed, so wrap in try-catch
    const expoDrizzleStudioPlugin = require('expo-drizzle-studio-plugin');
    if (expoDrizzleStudioPlugin && expoDrizzleStudioPlugin.useDrizzleStudio) {
      useDrizzleStudio = expoDrizzleStudioPlugin.useDrizzleStudio;
    }
  } catch (error) {
    console.warn('Drizzle Studio plugin not available, skipping integration', error);
  }
}

export function DrizzleStudioDevTool() {
  // Only use Drizzle Studio in development and if the plugin is available
  if (__DEV__ && useDrizzleStudio !== NoopStudio) {
    try {
      const db = SQLite.openDatabaseSync('chat-app.db');
      useDrizzleStudio(db);
    } catch (error) {
      console.warn('Failed to initialize Drizzle Studio:', error);
    }
  }
  
  // Return an empty view - the actual UI will be provided by the plugin if available
  return <View />;
} 