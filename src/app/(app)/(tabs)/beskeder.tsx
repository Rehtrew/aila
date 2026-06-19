// src/app/(app)/(tabs)/beskeder.tsx — Messages list
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useScrollToTop } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { getThreads } from '../../../lib/aula-api';
import { HEADER_ROW_HEIGHT } from '../../../lib/headerScrollContext';
import { messageText, relativeTime } from '../../../lib/format';
import type { MessageThread } from '../../../lib/aula-types';
import { Avatar, PressableScale, Skeleton } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../../theme';
import { personColor } from '../../../theme/childColors';

function participantCount(t: MessageThread): number {
  return t.recipients?.length ?? 0;
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { top: topInset } = useSafeAreaInsets();
  const headerPad = topInset + HEADER_ROW_HEIGHT;
  const styles = useThemedStyles(makeStyles);
  const listRef = useRef<FlatList>(null);
  useScrollToTop(listRef);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');

  async function load() {
    setError(null);
    try {
      const res = await getThreads(0);
      setThreads(res.data?.threads ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente beskeder');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => {
      const hay = [t.subject, messageText(t.latestMessage?.text), ...(t.recipients ?? []).map((r) => r.fullName)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [threads, query]);

  const unreadCount = useMemo(() => threads.filter((t) => !t.read).length, [threads]);

  const header = (
    <View>
      <Text style={styles.eyebrow}>
        {unreadCount > 0 ? `${unreadCount} ulæste` : 'Indbakke'}
      </Text>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Beskeder</Text>
        <PressableScale
          scaleTo={0.92}
          onPress={() => router.push('/(app)/ny-besked')}
          hitSlop={10}
          style={styles.composeBtn}
          accessibilityLabel="Ny besked"
        >
          <SymbolView name="square.and.pencil" size={20} tintColor={colors.tint} />
        </PressableScale>
      </View>
      <View style={styles.search}>
        <SymbolView name="magnifyingglass" size={16} tintColor={colors.secondaryLabel} />
        <TextInput
          style={styles.searchInput}
          placeholder="Søg i beskeder"
          placeholderTextColor={colors.tertiaryLabel}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
      <FlatList
        ref={listRef}
        data={loading || error ? [] : visible}
        keyExtractor={(t) => String(t.id)}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondaryLabel}
          />
        }
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          loading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skelRow}>
                  <Skeleton width={48} height={48} radius={24} />
                  <View style={styles.skelMid}>
                    <Skeleton width="58%" height={15} />
                    <Skeleton width="92%" height={12} />
                    <Skeleton width="70%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateIcon}>
                <SymbolView
                  name="exclamationmark.bubble"
                  size={28}
                  tintColor={colors.secondaryLabel}
                />
              </View>
              <Text style={styles.stateTitle}>Noget gik galt</Text>
              <Text style={styles.stateHint}>{error}</Text>
              <PressableScale
                scaleTo={0.96}
                style={styles.retryBtn}
                onPress={() => {
                  setLoading(true);
                  load();
                }}
              >
                <Text style={styles.retryText}>Prøv igen</Text>
              </PressableScale>
            </View>
          ) : (
            <View style={styles.stateWrap}>
              <View style={styles.stateIcon}>
                <SymbolView
                  name={query ? 'magnifyingglass' : 'bubble.left'}
                  size={28}
                  tintColor={colors.secondaryLabel}
                />
              </View>
              <Text style={styles.stateTitle}>
                {query ? 'Ingen resultater' : 'Ingen beskeder'}
              </Text>
              <Text style={styles.stateHint}>
                {query
                  ? 'Prøv et andet søgeord.'
                  : 'Beskeder fra skole og institution vises her.'}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => {
          const sender = item.recipients?.[0]?.fullName ?? item.subject;
          const count = participantCount(item);
          const isGroup = count > 1;
          const unread = !item.read;
          const preview = item.sensitive
            ? 'Følsom besked — åbn for at læse'
            : messageText(item.latestMessage?.text);
          const when = item.latestMessage?.sendDateTime ?? item.lastMessageDateTime;
          return (
            <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}>
              <PressableScale
                scaleTo={0.98}
                onPress={() => router.push(`/(app)/besked/${item.id}`)}
                style={styles.row}
              >
                <Avatar name={sender} size={48} color={personColor(undefined, sender)} />
                <View style={styles.mid}>
                  <View style={styles.rowTop}>
                    {unread ? <View style={styles.unreadDot} /> : null}
                    <Text
                      style={[styles.subject, unread && styles.subjectUnread]}
                      numberOfLines={1}
                    >
                      {item.subject || 'Uden emne'}
                    </Text>
                    <Text style={styles.time}>{relativeTime(when)}</Text>
                  </View>
                  <View style={styles.rowBottom}>
                    <Text style={styles.preview} numberOfLines={2}>
                      {preview}
                    </Text>
                    {isGroup ? (
                      <View style={styles.groupBadge}>
                        <SymbolView
                          name="person.2.fill"
                          size={11}
                          tintColor={colors.secondaryLabel}
                        />
                        <Text style={styles.groupCount}>{count}</Text>
                      </View>
                    ) : null}
                  </View>
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
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    eyebrow: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: c.secondaryLabel,
      marginTop: spacing.md,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
      marginBottom: spacing.xl,
    },
    title: {
      fontSize: 30,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: c.label,
    },
    composeBtn: {
      width: 38,
      height: 38,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.groupedBg,
    },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.groupedBg,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 44,
      marginBottom: spacing.sm,
    },
    searchInput: { flex: 1, ...font.callout, fontWeight: '400', color: c.label },
    sep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginLeft: 48 + spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    mid: { flex: 1, minWidth: 0 },
    rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    rowBottom: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    subject: { ...font.headline, color: c.label, flex: 1 },
    subjectUnread: { fontWeight: '700' },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.tint },
    time: { ...font.caption, color: c.tertiaryLabel },
    preview: { ...font.footnote, color: c.secondaryLabel, marginTop: 3, flex: 1 },
    groupBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginTop: 3,
    },
    groupCount: { ...font.caption, fontSize: 11, color: c.secondaryLabel },
    skelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.lg,
    },
    skelMid: { flex: 1, gap: spacing.sm },
    stateWrap: { alignItems: 'center', paddingVertical: spacing.huge, gap: spacing.sm },
    stateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    stateTitle: { ...font.title3, color: c.label },
    stateHint: {
      ...font.footnote,
      color: c.secondaryLabel,
      textAlign: 'center',
      maxWidth: 260,
    },
    retryBtn: {
      marginTop: spacing.md,
      backgroundColor: c.fill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    retryText: { ...font.headline, color: c.tint },
  });
