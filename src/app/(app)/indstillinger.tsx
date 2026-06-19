// src/app/(app)/indstillinger.tsx — Settings: appearance, profile, data, session.
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAula } from '../../lib/aula-context';
import { clearTokens } from '../../lib/token-storage';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { cardSurface, font, radius, shade, spacing, tint, type Palette, type ThemeMode } from '../../theme';
import { Avatar } from '../../components/ui';

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Lys', icon: 'sun.max' },
  { mode: 'dark', label: 'Mørk', icon: 'moon' },
  { mode: 'system', label: 'System', icon: 'circle.lefthalf.filled' },
];

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { guardian, kids } = useAula();
  const styles = useThemedStyles(makeStyles);
  const [clearing, setClearing] = useState(false);

  async function clearImageCache() {
    if (clearing) return;
    setClearing(true);
    try {
      await Image.clearDiskCache();
      await Image.clearMemoryCache();
      Alert.alert('Cache ryddet', 'Alle midlertidige billeder er fjernet.');
    } finally {
      setClearing(false);
    }
  }

  function logOut() {
    Alert.alert('Log ud', 'Du skal logge ind med MitID igen næste gang.', [
      { text: 'Annuller', style: 'cancel' },
      {
        text: 'Log ud',
        style: 'destructive',
        onPress: async () => {
          await clearTokens();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <View style={styles.fill}>
      <SafeAreaView edges={['top']}>
        <View style={styles.navRow}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.tint} />
            <Text style={styles.backLabel}>Tilbage</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Indstillinger</Text>

        {/* Appearance */}
        <Animated.View entering={FadeInDown.duration(300)}>
          <Text style={styles.eyebrow}>Udseende</Text>
          <View style={styles.segmentRow}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.mode;
              return (
                <Pressable
                  key={opt.mode}
                  onPress={() => setMode(opt.mode)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <SymbolView
                    name={opt.icon as never}
                    size={22}
                    tintColor={active ? colors.tint : colors.secondaryLabel}
                  />
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Profile */}
        <Animated.View entering={FadeInDown.duration(300).delay(60)}>
          <Text style={styles.eyebrow}>Profil</Text>
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <Avatar uri={guardian?.pictureUrl} name={guardian?.name} size={52} />
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{guardian?.name ?? 'Forælder'}</Text>
                {guardian?.institutionName ? (
                  <Text style={styles.profileMeta}>{guardian.institutionName}</Text>
                ) : null}
              </View>
            </View>
            {kids.length > 0 ? (
              <>
                <View style={styles.cardSep} />
                {kids.map((k) => (
                  <View key={k.id} style={styles.kidRow}>
                    <Avatar uri={k.pictureUrl} name={k.name} size={34} color={k.color} />
                    <View style={styles.profileText}>
                      <Text style={styles.kidName}>{k.name}</Text>
                      <Text style={styles.profileMeta}>
                        {[k.groupName, k.institutionName].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </Animated.View>

        {/* Data */}
        <Animated.View entering={FadeInDown.duration(300).delay(120)}>
          <Text style={styles.eyebrow}>Data</Text>
          <View style={styles.card}>
            <Pressable style={styles.actionRow} onPress={clearImageCache} disabled={clearing}>
              <SymbolView name="trash" size={18} tintColor={colors.secondaryLabel} />
              <Text style={styles.actionLabel}>
                {clearing ? 'Rydder…' : 'Ryd billedcache'}
              </Text>
              <SymbolView name="chevron.right" size={13} tintColor={colors.tertiaryLabel} />
            </Pressable>
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.duration(300).delay(180)}>
          <Text style={styles.eyebrow}>Om</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Version</Text>
              <Text style={styles.infoValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
            </View>
            <View style={styles.cardSep} />
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Aula API</Text>
              <Text style={styles.infoValue}>v23</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(240)}>
          <Pressable style={styles.logoutBtn} onPress={logOut}>
            <Text style={styles.logoutText}>Log ud</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backLabel: { ...font.body, color: c.tint },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
    title: { ...font.largeTitle, color: c.label, marginTop: spacing.md, marginBottom: spacing.xxl },
    eyebrow: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginBottom: spacing.sm,
      marginTop: spacing.xxl,
    },
    segmentRow: { flexDirection: 'row', gap: spacing.sm },
    segment: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
      paddingVertical: spacing.lg,
      borderRadius: radius.lg,
      backgroundColor: c.groupedBg,
      borderWidth: 1.5,
      borderColor: 'transparent',
    },
    segmentActive: {
      backgroundColor: c.card,
      borderColor: c.tint,
      ...cardSurface(c),
      borderWidth: 1.5,
    },
    segmentLabel: { ...font.subhead, color: c.secondaryLabel },
    segmentLabelActive: { color: c.label, fontWeight: '600' },
    card: { borderRadius: radius.lg, padding: spacing.lg, ...cardSurface(c) },
    cardSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginVertical: spacing.md,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    profileText: { flex: 1, minWidth: 0 },
    profileName: { ...font.headline, color: c.label },
    profileMeta: { ...font.footnote, color: c.secondaryLabel, marginTop: 1 },
    kidRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    kidName: { ...font.callout, color: c.label },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    actionLabel: { ...font.callout, color: c.label, flex: 1 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoKey: { ...font.callout, color: c.label },
    infoValue: { ...font.callout, color: c.secondaryLabel },
    logoutBtn: {
      marginTop: spacing.xxxl,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      backgroundColor: c.scheme === 'light' ? tint(c.red, 0.88) : shade(c.red, 0.78),
    },
    logoutText: { ...font.headline, color: c.red },
  });
