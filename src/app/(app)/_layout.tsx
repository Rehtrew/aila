import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getStoredTokens } from '../../lib/token-storage';
import { AulaProvider } from '../../lib/aula-context';
import { useTheme } from '../../theme/ThemeContext';
import { font } from '../../theme';

export default function AppLayout() {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    getStoredTokens().then((tokens) => {
      setAuthenticated(!!tokens?.accessToken);
      setReady(true);
    });
  }, []);

  if (!ready) return null;
  if (!authenticated) return <Redirect href="/(auth)/login" />;

  return (
    <AulaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          headerTintColor: colors.tint,
          headerTitleStyle: { ...font.headline, color: colors.label },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerBackTitle: 'Tilbage',
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="besked/[id]" options={{ headerShown: true, title: 'Besked' }} />
        <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="opslag/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="ny-besked"
          options={{ headerShown: true, title: 'Ny besked', presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="indstillinger" options={{ headerShown: false }} />
      </Stack>
    </AulaProvider>
  );
}
