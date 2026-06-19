// src/app/(app)/(tabs)/notifikationer.tsx — collected notifications, grouped by day.
import { useMemo, useRef, useState, type ComponentProps } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useScrollToTop } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAula } from '../../../lib/aula-context';
import { getCachedPost } from '../../../lib/aula-api';
import { HEADER_ROW_HEIGHT } from '../../../lib/headerScrollContext';
import { capitalizeFirst, dateValue, relativeTime } from '../../../lib/format';
import { mediaThumb, postMediaItems } from '../../../lib/media';
import type { AulaNotification } from '../../../lib/aula-types';
import { PressableScale, Skeleton } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../../theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function areaMeta(area?: string): { label: string; icon: SymbolName } {
  switch ((area ?? '').toLowerCase()) {
    case 'posts':
      return { label: 'Opslag', icon: 'doc.text' };
    case 'messages':
      return { label: 'Besked', icon: 'bubble.left' };
    case 'presence':
      return { label: 'Fremmøde', icon: 'checkmark.circle' };
    case 'gallery':
      return { label: 'Galleri', icon: 'photo' };
    case 'calendar':
      return { label: 'Kalender', icon: 'calendar' };
    default:
      return { label: 'Aula', icon: 'bell' };
  }
}

function dayKeyOf(iso?: string | null): string {
  if (!iso) return 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'unknown';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabelOf(iso?: string | null): string {
  if (!iso) return 'Tidligere';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Tidligere';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfThat) / 86400000);
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  const raw = d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  return capitalizeFirst(raw.toLowerCase());
}

type ListItem =
  | { kind: 'header'; key: string; label: string; first: boolean }
  | { kind: 'row'; key: string; n: AulaNotification; sep: boolean };

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { top: topInset } = useSafeAreaInsets();
  const headerPad = topInset + HEADER_ROW_HEIGHT;
  const styles = useThemedStyles(makeStyles);
  const { notificationList, markPostRead, markAllRead, reload, kids, loading } = useAula();
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);

  const kidNameById = useMemo(
    () => new Map(kids.map((k) => [k.id, k.firstName])),
    [kids],
  );

  const items = useMemo<ListItem[]>(() => {
    const sorted = [...notificationList].sort(
      (a, b) => dateValue(b.triggered) - dateValue(a.triggered),
    );
    const out: ListItem[] = [];
    let lastDay: string | null = null;
    sorted.forEach((n, i) => {
      const day = dayKeyOf(n.triggered);
      if (day !== lastDay) {
        out.push({
          kind: 'header',
          key: `day-${day}`,
          label: dayLabelOf(n.triggered),
          first: out.length === 0,
        });
        lastDay = day;
      } else {
        const prev = out[out.length - 1];
        if (prev.kind === 'row') prev.sep = true;
      }
      out.push({ kind: 'row', key: n.notificationId ?? `n-${i}`, n, sep: false });
    });
    return out;
  }, [notificationList]);

  const rowCount = notificationList.length;
  const countLabel =
    rowCount === 0 ? 'Alt er læst' : rowCount === 1 ? '1 ny' : `${rowCount} nye`;

  async function onRefresh() {
    setRefreshing(true);
    reload();
    setRefreshing(false);
  }

  function onTap(n: AulaNotification) {
    if ((n.notificationArea ?? '').toLowerCase() === 'posts' && n.postId != null) {
      markPostRead(n.postId);
      router.push(`/(app)/opslag/${n.postId}`);
    } else if ((n.notificationArea ?? '').toLowerCase() === 'messages') {
      router.navigate('/(app)/(tabs)/beskeder');
    }
  }

  const header = (
    <View>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>{countLabel}</Text>
          <Text style={styles.title}>Notifikationer</Text>
        </View>
        {rowCount > 0 ? (
          <PressableScale scaleTo={0.92} onPress={markAllRead} hitSlop={10}>
            <Text style={styles.markAllBtn}>Markér alle læst</Text>
          </PressableScale>
        ) : null}
      </View>
    </View>
  );

  if (loading && rowCount === 0) {
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
        <View style={styles.content}>
          {header}
          <Skeleton width={90} height={11} style={{ marginBottom: spacing.md }} />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.ghostRow}>
              <Skeleton width={36} height={36} radius={18} />
              <View style={styles.ghostText}>
                <Skeleton width={i % 2 ? '72%' : '58%'} height={14} />
                <Skeleton width="34%" height={10} style={{ marginTop: 7 }} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <SymbolView
                name="bell.slash"
                size={28}
                tintColor={colors.secondaryLabel}
                type="hierarchical"
              />
            </View>
            <Text style={styles.emptyTitle}>Ingen notifikationer</Text>
            <Text style={styles.emptyHint}>Du er helt ajour.</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          if (item.kind === 'header') {
            return (
              <Animated.Text
                entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}
                style={[styles.dayHeader, item.first && styles.dayHeaderFirst]}
              >
                {item.label}
              </Animated.Text>
            );
          }
          const m = areaMeta(item.n.notificationArea);
          const childName =
            item.n.relatedChildInstitutionProfileId != null
              ? kidNameById.get(item.n.relatedChildInstitutionProfileId)
              : undefined;
          const cachedPost = item.n.postId != null ? getCachedPost(item.n.postId) : undefined;
          const postThumb = cachedPost ? mediaThumb(postMediaItems(cachedPost)[0]) : undefined;
          return (
            <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}>
              <PressableScale onPress={() => onTap(item.n)} style={styles.rowOuter}>
                {item.sep ? <View style={styles.sep} /> : null}
                <View style={styles.row}>
                  <View style={styles.unreadDot} />
                  <View style={styles.iconCircle}>
                    <SymbolView
                      name={m.icon}
                      size={17}
                      tintColor={colors.label}
                      type="hierarchical"
                    />
                  </View>
                  <View style={styles.mid}>
                    <Text style={styles.rowTitle} numberOfLines={2}>
                      {item.n.postTitle || m.label}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {[m.label, childName].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {postThumb ? (
                    <Image
                      source={{ uri: postThumb }}
                      style={styles.rowThumb}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : null}
                  <Text style={styles.time}>{relativeTime(item.n.triggered)}</Text>
                </View>
              </PressableScale>
            </Animated.View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: spacing.xl,
    },
    eyebrow: {
      fontSize: 30,
      fontWeight: '400' as const,
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
    },
    markAllBtn: { ...font.subhead, color: c.tint, paddingBottom: 2 },

    dayHeader: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
    dayHeaderFirst: { marginTop: spacing.lg },

    rowOuter: { borderRadius: radius.sm },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginLeft: 6 + spacing.md + 36 + spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.tint },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mid: { flex: 1, minWidth: 0 },
    rowTitle: { ...font.callout, color: c.label },
    rowSub: { ...font.caption, color: c.secondaryLabel, marginTop: 2 },
    rowThumb: {
      width: 44,
      height: 44,
      borderRadius: radius.sm,
      backgroundColor: c.fill,
    },
    time: { ...font.caption, color: c.tertiaryLabel },

    ghostRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    ghostText: { flex: 1 },

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
  });
