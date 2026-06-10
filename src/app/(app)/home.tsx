// src/app/(app)/home.tsx
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getProfilesByLogin, getProfileContext } from '../../lib/aula-api';
import { clearTokens } from '../../lib/token-storage';
import type { AulaProfile, AulaChild } from '../../lib/aula-types';

export default function HomeScreen() {
  const [profile, setProfile] = useState<AulaProfile | null>(null);
  const [children, setChildren] = useState<AulaChild[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, contextRes] = await Promise.all([
          getProfilesByLogin(),
          getProfileContext(),
        ]);
        setProfile(profileRes.data.profiles[0] ?? null);
        setChildren(contextRes.data.children ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ukendt fejl');
      }
    }
    load();
  }, []);

  async function handleLogout() {
    await clearTokens();
    router.replace('/(auth)/login');
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log ud og prøv igen</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Henter profil…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Hjem</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logoutText}>Log ud</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Logget ind som</Text>
        <Text style={styles.cardName}>{profile.displayName}</Text>
        <Text style={styles.cardSub}>
          {profile.institutionProfiles[0]?.institutionName ?? ''}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Børn</Text>
      <FlatList
        data={children}
        keyExtractor={(item) => String(item.profileId)}
        renderItem={({ item }) => (
          <View style={styles.childRow}>
            <Text style={styles.childName}>{item.displayName}</Text>
            <Text style={styles.childRole}>{item.currentUniRole}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Ingen børn fundet</Text>
        }
      />

      <View style={styles.badge}>
        <Text style={styles.badgeText}>✓ API forbundet · v22</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  logoutText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  card: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 2,
  },
  cardName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  childRow: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  childName: {
    fontSize: 14,
    fontWeight: '600',
  },
  childRole: {
    fontSize: 12,
    color: '#888',
  },
  empty: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  badge: {
    marginTop: 'auto',
    padding: 8,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#888',
    marginTop: 8,
  },
});
