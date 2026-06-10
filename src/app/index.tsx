import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getStoredTokens } from '../lib/token-storage';

export default function Index() {
  const [destination, setDestination] = useState<
    '/(auth)/login' | '/(app)/home' | null
  >(null);

  useEffect(() => {
    getStoredTokens().then((tokens) => {
      setDestination(tokens ? '/(app)/home' : '/(auth)/login');
    });
  }, []);

  if (!destination) return null;
  return <Redirect href={destination} />;
}
