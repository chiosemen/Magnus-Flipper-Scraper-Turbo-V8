import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { initializeSentry, setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry';
import { trackScreenView } from '@/lib/analytics';

// Initialize Sentry at app startup
initializeSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Auth Guard Component
 *
 * NAVIGATION LOGIC:
 * - If !user and not in (auth) group -> router.replace('/login')
 * - If user and in (auth) group -> router.replace('/') (Home)
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Track screen views
  useEffect(() => {
    if (segments.length > 0) {
      const screenName = segments.join('/');
      trackScreenView(screenName);
    }
  }, [segments]);

  // Set Sentry user context
  useEffect(() => {
    if (user) {
      setSentryUser({ id: user.uid, email: user.email || undefined });
    } else {
      clearSentryUser();
    }
  }, [user]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // User not authenticated and not in auth group -> redirect to login
      router.replace('/login');
    } else if (user && inAuthGroup) {
      // User authenticated and in auth group -> redirect to home
      router.replace('/');
    }
  }, [user, isLoading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGuard>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ title: 'Home' }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AuthGuard>
      </AuthProvider>
    </QueryClientProvider>
  );
}
