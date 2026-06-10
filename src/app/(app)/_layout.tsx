import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getStoredTokens } from '../../lib/token-storage';

export default function AppLayout() {
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
  return <Stack screenOptions={{ headerShown: false }} />;
}
