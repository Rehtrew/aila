// src/app/(app)/(tabs)/fremmoede.tsx — Presence: who arrived, who went home, who picks up.
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollToTop } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAula, type Kid } from '../../../lib/aula-context';
import { getDailyOverview, getPresenceTemplates } from '../../../lib/aula-api';
import { HEADER_ROW_HEIGHT } from '../../../lib/headerScrollContext';
import { capitalizeFirst, timeOfDay } from '../../../lib/format';
import type { PresenceDailyOverview, PresenceDayTemplate } from '../../../lib/aula-types';
import { Avatar, PressableScale, Skeleton } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../../theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function statusOf(
  c: Palette,
  ov?: PresenceDailyOverview,
  tmpl?: PresenceDayTemplate,
): { label: string; color: string } {
  if (tmpl?.isOnVacation) return { label: 'Ferie / fri', color: c.orange };
  if (ov?.status === 1) return { label: 'Syg', color: c.red };
  if (ov?.checkOutTime) return { label: 'Gået hjem', color: c.secondaryLabel };
  if (ov?.checkInTime) return { label: 'Til stede', color: c.green };
  return { label: 'Ikke kommet', color: c.tertiaryLabel };
}

// Writes (presence.updateStatusByInstitutionProfileIds / updatePresenceTemplate)
// are known by name but the request body isn't captured yet, so the send stays
// guarded — we don't push guessed data to the live school.
function guarded(title: string) {
  Alert.alert(
    title,
    'Vi kan vise hentetider nu. Selve registreringen (der skriver til skolen) aktiveres, så snart request-formatet er bekræftet.',
    [{ text: 'OK' }],
  );
}

function MetaRow({ icon, children }: { icon: SymbolName; children: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.metaRow}>
      <SymbolView name={icon} size={15} tintColor={colors.secondaryLabel} type="hierarchical" />
      <Text style={styles.metaText} numberOfLines={2}>
        {children}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: SymbolName;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} scaleTo={0.96} style={styles.action}>
      <SymbolView name={icon} size={17} tintColor={color} type="hierarchical" />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </PressableScale>
  );
}

function SkeletonCard() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.cardProfile}>
        <Skeleton width={72} height={72} radius={36} />
        <Skeleton width="50%" height={18} style={{ marginTop: 4 }} />
        <Skeleton width="35%" height={13} style={{ marginTop: 4 }} />
      </View>
      <View style={styles.heroRow}>
        <View style={styles.heroCol}>
          <Skeleton width={34} height={10} />
          <Skeleton width={78} height={36} style={{ marginTop: 8 }} />
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroCol}>
          <Skeleton width={34} height={10} />
          <Skeleton width={78} height={36} style={{ marginTop: 8 }} />
        </View>
      </View>
      <Skeleton width="70%" height={13} style={{ marginTop: spacing.lg }} />
    </View>
  );
}

export default function PresenceScreen() {
  const { colors } = useTheme();
  const { top: topInset } = useSafeAreaInsets();
  const headerPad = topInset + HEADER_ROW_HEIGHT;
  const styles = useThemedStyles(makeStyles);
  const { kids, loading: kidsLoading, error: kidsError, reload } = useAula();
  const [overview, setOverview] = useState<Record<number, PresenceDailyOverview>>({});
  const [templates, setTemplates] = useState<Record<number, PresenceDayTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const childIds = useMemo(() => kids.map((k) => k.id), [kids]);
  const childIdsKey = childIds.join(',');

  const todayLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
    return capitalizeFirst(raw.toLowerCase());
  }, []);

  async function load() {
    if (childIds.length === 0) return;
    setError(null);
    const today = isoDate(new Date());
    const weekEnd = isoDate(new Date(Date.now() + 6 * 86400000));

    const [ovRes, tmplRes] = await Promise.allSettled([
      getDailyOverview(childIds),
      getPresenceTemplates(childIds, today, weekEnd),
    ]);

    if (ovRes.status === 'fulfilled') {
      const map: Record<number, PresenceDailyOverview> = {};
      (ovRes.value.data ?? []).forEach((ov, i) => {
        const id = ov.institutionProfileId ?? childIds[i];
        if (id != null) map[id] = ov;
      });
      setOverview(map);
    } else {
      setError(ovRes.reason instanceof Error ? ovRes.reason.message : 'Kunne ikke hente fremmøde');
    }

    if (tmplRes.status === 'fulfilled') {
      const map: Record<number, PresenceDayTemplate> = {};
      for (const wt of tmplRes.value.data?.presenceWeekTemplates ?? []) {
        const kidId = wt.institutionProfile?.id;
        const todayTmpl = wt.dayTemplates?.find((d) => d.byDate === today);
        if (kidId != null && todayTmpl) map[kidId] = todayTmpl;
      }
      setTemplates(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childIdsKey]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const showSkeletons = kidsLoading || (loading && kids.length > 0);

  return (
    <SafeAreaView edges={[]} style={[styles.safe, { paddingTop: headerPad }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondaryLabel}
          />
        }
      >
        <Text style={styles.eyebrow}>{todayLabel}</Text>
        <Text style={styles.title}>Fremmøde</Text>

        {kidsError ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name="exclamationmark.triangle"
                size={28}
                tintColor={colors.secondaryLabel}
                type="hierarchical"
              />
            </View>
            <Text style={styles.emptyTitle}>Noget gik galt</Text>
            <Text style={styles.emptyHint}>{kidsError}</Text>
            <PressableScale onPress={reload} scaleTo={0.96} style={styles.retryBtn}>
              <Text style={styles.retryLabel}>Prøv igen</Text>
            </PressableScale>
          </View>
        ) : showSkeletons ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {error ? <Text style={styles.err}>{error}</Text> : null}

            {kids.map((kid: Kid, index: number) => {
              const ov = overview[kid.id];
              const tmpl = templates[kid.id];
              const st = statusOf(colors, ov, tmpl);
              const plannedEntry = tmpl?.entryTime ?? ov?.entryTime;
              const plannedExit = tmpl?.exitTime ?? ov?.exitTime;
              const exitWith = tmpl?.exitWith ?? ov?.exitWith;
              const comment = tmpl?.comment ?? ov?.comment;
              const planned =
                plannedEntry && plannedExit
                  ? `Planlagt ${timeOfDay(plannedEntry)} – ${timeOfDay(plannedExit)}`
                  : plannedExit
                    ? `Hentes kl. ${timeOfDay(plannedExit)}`
                    : plannedEntry
                      ? `Kommer kl. ${timeOfDay(plannedEntry)}`
                      : null;

              return (
                <Animated.View
                  key={kid.id}
                  entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}
                >
                  <View style={styles.card}>
                    {/* Profile section — centered avatar, name, school, status */}
                    <View style={styles.cardProfile}>
                      <Avatar uri={kid.pictureUrl} name={kid.name} size={72} color={kid.color} />
                      <Text style={styles.kidName} numberOfLines={1}>
                        {kid.name}
                      </Text>
                      <Text style={styles.kidGroup} numberOfLines={1}>
                        {kid.groupName || kid.institutionName}
                      </Text>
                      <View style={styles.statusWrap}>
                        <View style={[styles.statusDot, { backgroundColor: st.color }]} />
                        <Text style={[styles.statusLabel, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>

                    {/* The day's two key moments — big, calm numerals. */}
                    <View style={styles.heroRow}>
                      <View style={styles.heroCol}>
                        <Text style={styles.heroLabel}>Kom</Text>
                        <Text
                          style={[styles.heroTime, !ov?.checkInTime && styles.heroTimeEmpty]}
                        >
                          {ov?.checkInTime ? timeOfDay(ov.checkInTime) : '—'}
                        </Text>
                      </View>
                      <View style={styles.heroDivider} />
                      <View style={styles.heroCol}>
                        <Text style={styles.heroLabel}>Gik</Text>
                        <Text
                          style={[styles.heroTime, !ov?.checkOutTime && styles.heroTimeEmpty]}
                        >
                          {ov?.checkOutTime ? timeOfDay(ov.checkOutTime) : '—'}
                        </Text>
                      </View>
                    </View>

                    {planned || exitWith || comment ? (
                      <View style={styles.metaBlock}>
                        {planned ? <MetaRow icon="clock">{planned}</MetaRow> : null}
                        {exitWith ? <MetaRow icon="person">{`Hentes af ${exitWith}`}</MetaRow> : null}
                        {comment ? <MetaRow icon="text.bubble">{comment}</MetaRow> : null}
                      </View>
                    ) : null}
                  </View>

                  {/* Action buttons sit below the card */}
                  <View style={styles.actions}>
                    <ActionButton
                      icon="thermometer.medium"
                      label="Meld syg"
                      color={colors.red}
                      onPress={() => guarded('Meld syg')}
                    />
                    <ActionButton
                      icon="sun.max"
                      label="Hold fri"
                      color={colors.orange}
                      onPress={() => guarded('Hold fri')}
                    />
                    <ActionButton
                      icon="clock"
                      label="Hentetid"
                      color={colors.tint}
                      onPress={() => guarded('Sæt hentetid')}
                    />
                  </View>
                </Animated.View>
              );
            })}

            {kids.length === 0 ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <SymbolView
                    name="person.2"
                    size={28}
                    tintColor={colors.secondaryLabel}
                    type="hierarchical"
                  />
                </View>
                <Text style={styles.emptyTitle}>Ingen børn fundet</Text>
                <Text style={styles.emptyHint}>Træk ned for at opdatere.</Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
    eyebrow: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: c.secondaryLabel,
      marginTop: spacing.md,
    },
    title: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: c.label,
      marginTop: 2,
      marginBottom: spacing.xl,
    },
    err: { ...font.footnote, color: c.red, marginBottom: spacing.md },

    card: {
      borderRadius: radius.lg,
      padding: spacing.xl,
      marginBottom: spacing.sm,
      ...cardSurface(c),
    },
    cardProfile: {
      alignItems: 'center',
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    kidName: { ...font.title3, color: c.label },
    kidGroup: { ...font.footnote, color: c.secondaryLabel },
    statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { ...font.footnote, fontWeight: '600' as const },

    heroRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      marginTop: spacing.xl,
    },
    heroCol: { flex: 1, gap: 6 },
    heroDivider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginRight: spacing.xl,
    },
    heroLabel: { ...font.eyebrow, color: c.secondaryLabel },
    heroTime: { fontSize: 36, fontWeight: '700' as const, letterSpacing: -0.5, color: c.label, fontVariant: ['tabular-nums'] },
    heroTimeEmpty: { color: c.tertiaryLabel, fontWeight: '400' as const },

    metaBlock: { marginTop: spacing.lg, gap: spacing.sm },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    metaText: { ...font.footnote, color: c.secondaryLabel, flex: 1 },

    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    action: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.card,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      ...(c.scheme === 'light' ? {
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
      } : { borderWidth: StyleSheet.hairlineWidth, borderColor: c.separator }),
    },
    actionLabel: { ...font.subhead },

    empty: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyTitle: { ...font.title3, color: c.label },
    emptyHint: { ...font.footnote, color: c.secondaryLabel, textAlign: 'center' },
    retryBtn: {
      marginTop: spacing.md,
      backgroundColor: c.groupedBg,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.md,
    },
    retryLabel: { ...font.headline, color: c.tint },
  });
