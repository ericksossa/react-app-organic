import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/app/navigation/AppNavigator';
import { useBootstrapAuth } from './src/services/auth/useBootstrapAuth';
import { AppErrorBoundary } from './src/shared/ui/AppErrorBoundary';
import { useTheme } from './src/shared/theme/useTheme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: 0
    }
  }
});

export default function App() {
  useBootstrapAuth();
  const { isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <AppErrorBoundary>
            <AppNavigator />
          </AppErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
