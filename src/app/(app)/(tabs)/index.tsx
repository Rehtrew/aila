// src/app/(app)/(tabs)/index.tsx — Dashboard (Hjem) + opslagstavle
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { AppState, Dimensions, LayoutAnimation, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useScrollToTop } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import Animated, { Extrapolation, FadeInDown, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAula, type Kid } from '../../../lib/aula-context';
import { getDailyOverview, getPosts } from '../../../lib/aula-api';
import { clearTokens } from '../../../lib/token-storage';
import { useBookmarks } from '../../../lib/bookmarks';
import { messageText, relativeTime, timeOfDay } from '../../../lib/format';
import { mediaThumb, postMediaItems } from '../../../lib/media';
import { personColor } from '../../../theme/childColors';
import type { AulaPost, PresenceDailyOverview } from '../../../lib/aula-types';
import { Avatar, ErrorState, PressableScale, Skeleton, Tag } from '../../../components/ui';
import { ChildCard, type QuickLink } from '../../../components/ChildCard';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../../theme';
import { HEADER_ROW_HEIGHT, useHeaderScrollY } from '../../../lib/headerScrollContext';
import { PHASE_GRADIENTS, getPreviousGradient, getTimeGradient } from '../../../components/GlobalHeader';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

type FilterKey = 'all' | 'unread' | 'important' | 'staff' | 'parents' | 'own' | 'saved';
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'unread', label: 'Ulæste' },
  { key: 'important', label: 'Vigtige' },
  { key: 'staff', label: 'Personale' },
  { key: 'parents', label: 'Forældre' },
  { key: 'own', label: 'Egne' },
  { key: 'saved', label: 'Gemte' },
];

// Pure-JS gradient — no native modules, works in Expo Go.
const _STEPS = Array.from({ length: 64 }, (_, i) => i / 63);

function _hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function _sample(colors: readonly string[], locs: readonly number[], t: number): string {
  for (let i = 0; i < locs.length - 1; i++) {
    if (t <= locs[i + 1]) {
      const p = Math.max(0, Math.min(1, (t - locs[i]) / (locs[i + 1] - locs[i])));
      const [r1, g1, b1] = _hexRgb(colors[i]);
      const [r2, g2, b2] = _hexRgb(colors[i + 1]);
      return `rgb(${Math.round(r1+(r2-r1)*p)},${Math.round(g1+(g2-g1)*p)},${Math.round(b1+(b2-b1)*p)})`;
    }
  }
  return colors[colors.length - 1];
}

function alpha(hex: string, a: number): string {
  const [r, g, b] = _hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function SkyGradient({ colors, locations, style }: {
  colors: readonly string[];
  locations: readonly number[];
  style?: ComponentProps<typeof View>['style'];
}) {
  return (
    <View style={[style, { overflow: 'hidden' }]}>
      {_STEPS.map((t, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: _sample(colors, locations, t) }} />
      ))}
    </View>
  );
}

const WIN_H = Dimensions.get('window').height;

// Animates children in from the right when they scroll into the viewport.
function FadeInView({ children }: { children: ReactNode }) {
  const scrollY = useHeaderScrollY();
  const itemY = useSharedValue(-1);
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => {
      if (itemY.value < 0) return false;
      return (scrollY?.value ?? 0) + WIN_H > itemY.value + 40;
    },
    (visible) => {
      if (visible && progress.value === 0) {
        progress.value = withDelay(80, withTiming(1, { duration: 450 }));
      }
    },
  );

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: interpolate(progress.value, [0, 1], [22, 0], Extrapolation.CLAMP) }],
  }));

  return (
    <Animated.View style={style} onLayout={(e) => { itemY.value = e.nativeEvent.layout.y; }}>
      {children}
    </Animated.View>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'Godmorgen';
  if (h < 18) return 'Goddag';
  return 'Godaften';
}
function dayGroup(iso?: string | null): string {
  if (!iso) return 'Tidligere';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 'Tidligere';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startOfToday) return 'I dag';
  if (t >= startOfToday - 86400000) return 'I går';
  if (t >= startOfToday - 6 * 86400000) return 'Denne uge';
  return 'Tidligere';
}
function ageLabel(birthday?: string | null): string | undefined {
  if (!birthday) return undefined;
  const d = new Date(birthday);
  if (Number.isNaN(d.getTime())) return undefined;
  const age = Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
  return age > 0 && age < 30 ? `${age} år` : undefined;
}
function presenceFor(kid: Kid, c: Palette, ov?: PresenceDailyOverview): { label: string; color: string; chipBg: string } {
  if (!ov) return { label: kid.groupName || '—', color: c.tertiaryLabel, chipBg: c.fill };
  if (ov.checkOutTime) return { label: `Gået ${timeOfDay(ov.checkOutTime)}`, color: c.secondaryLabel, chipBg: c.fill };
  if (ov.checkInTime) return { label: `Kom ${timeOfDay(ov.checkInTime)}`, color: c.green, chipBg: alpha(c.green, 0.13) };
  return { label: 'Ikke kommet', color: c.tertiaryLabel, chipBg: c.fill };
}

export default function DashboardScreen() {
  const { guardian, kids, institutionProfileIds, unreadPostIds, guardianProfileId, loading, error, reload, markPostRead } =
    useAula();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { isBookmarked } = useBookmarks();
  const { top: topInset } = useSafeAreaInsets();
  const headerPad = topInset + HEADER_ROW_HEIGHT;
  // Measured via onLayout on the first child card — exact midpoint of that card.
  const [cardMidY, setCardMidY] = useState<number | null>(null);
  const gradientEndY = cardMidY ?? headerPad + 180;
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const headerScrollY = useHeaderScrollY();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      if (headerScrollY) headerScrollY.value = e.contentOffset.y;
    },
  });

  const [gradientDef, setGradientDef] = useState(getTimeGradient);
  const [stickyExpanded, setStickyExpanded] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const lightGradient = false;

  // Dark mode always shows night gradient; light mode uses current time phase
  const effectiveGradient = colors.scheme === 'dark' ? PHASE_GRADIENTS.night : gradientDef;

  // Entry animation: fade from previous phase (or twilight in dark) to current
  const [fromGradientDef] = useState(() =>
    colors.scheme === 'dark' ? PHASE_GRADIENTS.twilight : getPreviousGradient(),
  );
  const transitionProgress = useSharedValue(0);

  const fromGradStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transitionProgress.value, [0, 0.8], [1, 0], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    transitionProgress.value = withTiming(1, { duration: 2200 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const update = () => setGradientDef(getTimeGradient());
    const interval = setInterval(update, 60_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') update(); });
    return () => { clearInterval(interval); sub.remove(); };
  }, []);

  useAnimatedReaction(
    () => (headerScrollY?.value ?? 0) >= 110,
    (v, prev) => { if (v !== prev) runOnJS(setIsSticky)(v); },
  );

  useEffect(() => {
    if (!isSticky && stickyExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setStickyExpanded(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSticky]);

  // Gradient white overlay: fades in over the gradient as user scrolls
  const bgOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(headerScrollY?.value ?? 0, [0, 200], [0, 1], Extrapolation.CLAMP),
  }));

  // Greeting parallax: scrolls at 40% of scroll speed, clipped by gradient container
  const greetParallaxStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -(headerScrollY?.value ?? 0) * 0.4 }],
  }));

  // Sticky child card: fades in when greeting scrolls behind the header
  const stickyStyle = useAnimatedStyle(() => {
    const sv = headerScrollY?.value ?? 0;
    return {
      opacity: interpolate(sv, [70, 110], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateY: interpolate(sv, [70, 110], [-6, 0], Extrapolation.CLAMP) }],
    };
  });
  const [presence, setPresence] = useState<Record<number, PresenceDailyOverview>>({});
  const [posts, setPosts] = useState<AulaPost[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const childIds = useMemo(() => kids.map((k) => k.id), [kids]);
  const ipIdsKey = institutionProfileIds.join(',');
  const unread = useMemo(() => new Set(unreadPostIds), [unreadPostIds]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchFeed = useCallback(async () => {
    if (childIds.length === 0) return;
    const [presRes, postsRes] = await Promise.allSettled([
      getDailyOverview(childIds),
      getPosts(institutionProfileIds, 50),
    ]);
    if (!mounted.current) return;
    if (presRes.status === 'fulfilled') {
      const map: Record<number, PresenceDailyOverview> = {};
      (presRes.value.data ?? []).forEach((ov, i) => {
        const id = ov.institutionProfileId ?? childIds[i];
        if (id != null) map[id] = ov;
      });
      setPresence(map);
    }
    if (postsRes.status === 'fulfilled') setPosts(postsRes.value.data?.posts ?? []);
    setFeedLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipIdsKey]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  useEffect(() => {
    if (error && (error.includes('udløbet') || error.includes('Ikke logget'))) {
      clearTokens().then(() => router.replace('/(auth)/login'));
    }
  }, [error]);

  function matchesFilter(key: FilterKey, p: AulaPost): boolean {
    switch (key) {
      case 'unread':
        return unread.has(p.id);
      case 'important':
        return !!p.isImportant;
      case 'staff':
        return p.ownerProfile?.role === 'employee';
      case 'parents':
        return p.ownerProfile?.role === 'guardian';
      case 'own':
        return guardianProfileId != null && p.ownerProfile?.profileId === guardianProfileId;
      case 'saved':
        return isBookmarked(p.id);
      default:
        return true;
    }
  }

  const counts = useMemo(() => {
    const c = {} as Record<FilterKey, number>;
    for (const f of FILTERS) c[f.key] = posts.filter((p) => matchesFilter(f.key, p)).length;
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, unread, guardianProfileId, isBookmarked]);

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      if (q && !`${p.title} ${messageText(p.content)}`.toLowerCase().includes(q)) return false;
      return matchesFilter(filter, p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, query, filter, unread, guardianProfileId, isBookmarked]);

  async function onRefresh() {
    setRefreshing(true);
    reload();
    await fetchFeed();
    if (mounted.current) setRefreshing(false);
  }

  const postSkeleton = (key: number) => (
    <View key={key} style={styles.postCard}>
      <View style={styles.postHead}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={styles.postHeadText}>
          <Skeleton width={150} height={13} />
          <Skeleton width={92} height={11} style={styles.skeletonGapSm} />
        </View>
      </View>
      <Skeleton width="74%" height={16} style={styles.skeletonGapMd} />
      <Skeleton width="100%" height={12} style={styles.skeletonGapMd} />
      <Skeleton width="58%" height={12} style={styles.skeletonGapSm} />
    </View>
  );

  if (loading && kids.length === 0)
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Skeleton width={132} height={12} />
            <Skeleton width={230} height={36} radius={10} style={styles.skeletonGapMd} />
          </View>
          <Skeleton width={56} height={11} style={styles.skeletonSection} />
          <Skeleton height={80} radius={radius.lg} style={styles.skeletonGapMd} />
          <Skeleton width={110} height={11} style={styles.skeletonSection} />
          <View style={styles.feed}>{[0, 1, 2].map(postSkeleton)}</View>
        </View>
      </SafeAreaView>
    );
  if (error && kids.length === 0)
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
        <View style={styles.contentContainer}>
          <ErrorState message={error} onRetry={reload} />
        </View>
      </SafeAreaView>
    );

  const multiChild = kids.length > 1;

  function linksFor(): QuickLink[] {
    return [
      { icon: 'checkmark.circle.fill', label: 'Fremmøde', color: colors.green, onPress: () => router.navigate('/(app)/(tabs)/fremmoede') },
      { icon: 'thermometer.medium', label: 'Meld syg', color: colors.red, onPress: () => router.navigate('/(app)/(tabs)/fremmoede') },
      { icon: 'sun.max.fill', label: 'Hold fri', color: colors.orange, onPress: () => router.navigate('/(app)/(tabs)/fremmoede') },
      { icon: 'photo.fill', label: 'Galleri', color: colors.tint, onPress: () => router.navigate('/(app)/(tabs)/galleri') },
    ];
  }

  const emptyContent: { icon: SymbolName; title: string; hint: string } = (() => {
    if (posts.length === 0)
      return { icon: 'tray' as SymbolName, title: 'Ingen opslag', hint: 'Nye opslag fra institutionen vises her.' };
    if (query.trim())
      return { icon: 'magnifyingglass' as SymbolName, title: 'Ingen resultater', hint: 'Prøv et andet søgeord.' };
    if (filter === 'unread')
      return { icon: 'checkmark.circle' as SymbolName, title: 'Alt er læst', hint: 'Du har ingen ulæste opslag lige nu.' };
    if (filter === 'saved')
      return { icon: 'bookmark' as SymbolName, title: 'Ingen gemte opslag', hint: 'Opslag du gemmer, samles her.' };
    return { icon: 'line.3.horizontal.decrease.circle' as SymbolName, title: 'Ingen opslag matcher', hint: 'Prøv et andet filter.' };
  })();

  // Build the feed with date-group eyebrow separators.
  const feedRows: ReactNode[] = [];
  let lastGroup: string | null = null;
  visiblePosts.forEach((post, index) => {
    const delay = Math.min(index, 8) * 40;
    const group = dayGroup(post.timestamp);
    if (group !== lastGroup) {
      lastGroup = group;
      feedRows.push(
        <Animated.Text
          key={`group-${group}-${index}`}
          entering={FadeInDown.duration(280).delay(delay)}
          style={styles.groupLabel}
        >
          {group}
        </Animated.Text>,
      );
    }
    const media = postMediaItems(post);
    const thumb = mediaThumb(media[0]);
    const isVideo = media[0]?.mediaType === 'video';
    const kid = kids.find((k) =>
      (post.relatedProfiles ?? []).some((rp) => rp.id === k.id || rp.profileId === k.profileId),
    );
    const isUnread = unread.has(post.id);
    feedRows.push(
      <FadeInView key={post.id}>
        <PressableScale
          scaleTo={0.98}
          style={styles.postCard}
          onPress={() => {
            markPostRead(post.id);
            router.push(`/(app)/opslag/${post.id}`);
          }}
        >
          <View style={styles.postHead}>
            <Avatar
              uri={post.ownerProfile?.profilePicture?.url}
              name={post.ownerProfile?.fullName}
              size={40}
              color={personColor(post.ownerProfile?.role, post.ownerProfile?.profileId)}
            />
            <View style={styles.postHeadText}>
              <Text style={styles.author} numberOfLines={1}>
                {post.ownerProfile?.fullName ?? 'Aula'}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[post.sharedWithGroups?.[0]?.name, post.timestamp ? relativeTime(post.timestamp) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            {multiChild && kid ? <Tag label={kid.firstName} color={kid.color} /> : null}
          </View>
          <View style={styles.postBody}>
            <View style={styles.postText}>
              <View style={styles.titleRow}>
                {isUnread ? <View style={styles.unreadDot} /> : null}
                {post.isImportant ? (
                  <SymbolView name="exclamationmark.circle.fill" size={14} tintColor={colors.orange} />
                ) : null}
                <Text style={[styles.postTitle, isUnread && styles.postTitleUnread]} numberOfLines={2}>
                  {post.title}
                </Text>
              </View>
              {messageText(post.content) ? (
                <Text style={styles.postPreview} numberOfLines={3}>
                  {messageText(post.content)}
                </Text>
              ) : null}
            </View>
            {thumb ? (
              <View style={styles.thumbWrap}>
                <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" transition={150} />
                {isVideo ? (
                  <View style={styles.playBadge}>
                    <SymbolView name="play.fill" size={11} tintColor={colors.white} />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </PressableScale>
      </FadeInView>,
    );
  });

  const greetColor = lightGradient ? colors.secondaryLabel : 'rgba(255,255,255,0.75)';
  const nameColor = lightGradient ? colors.label : '#ffffff';

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Gradient clip container — greeting parallaxes inside, clipped at bottom */}
      <View
        style={[styles.gradientBg, { height: gradientEndY, overflow: 'hidden' }]}
        pointerEvents="none"
      >
        {/* Current (to) gradient */}
        {effectiveGradient.type === 'gradient' ? (
          <SkyGradient
            colors={effectiveGradient.colors}
            locations={effectiveGradient.locations}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: effectiveGradient.color }]} />
        )}
        {/* Previous (from) gradient fades out on mount */}
        <Animated.View style={[StyleSheet.absoluteFill, fromGradStyle]} pointerEvents="none">
          {fromGradientDef.type === 'gradient' ? (
            <SkyGradient
              colors={fromGradientDef.colors}
              locations={fromGradientDef.locations}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
        <Animated.View
          style={[styles.greetingAbs, { top: headerPad + spacing.md }, greetParallaxStyle]}
        >
          <Text style={[styles.greetWord, { color: greetColor }]}>{greeting()},</Text>
          <Text style={[styles.nameLine, { color: nameColor }]}>{guardian?.firstName ?? ''}</Text>
        </Animated.View>
      </View>

      {/* White overlay fades in as user scrolls */}
      <Animated.View
        style={[styles.gradientBg, { height: gradientEndY, backgroundColor: colors.bg }, bgOverlayStyle]}
        pointerEvents="none"
      />

    <Animated.ScrollView
      ref={scrollRef as React.RefObject<Animated.ScrollView>}
      onScroll={scrollHandler}
      scrollEventThrottle={16}
      contentContainerStyle={[styles.contentContainer, { paddingTop: headerPad }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.secondaryLabel}
          progressViewOffset={headerPad}
        />
      }
    >
      {/* Invisible layout spacer — keeps child cards below greeting height */}
      <View style={styles.header} pointerEvents="none">
        <Text style={[styles.greetWord, { color: 'transparent' }]} selectable={false}>{greeting()},</Text>
        <Text style={[styles.nameLine, { color: 'transparent' }]} selectable={false}>{guardian?.firstName ?? ''}</Text>
      </View>

      {kids.map((kid, i) => {
        const pv = presenceFor(kid, colors, presence[kid.id]);
        const subtitle = [ageLabel(kid.birthday), kid.groupName, kid.institutionName].filter(Boolean).join(' · ');
        return (
          <Animated.View
            key={kid.id}
            entering={FadeInDown.duration(280).delay(Math.min(i, 8) * 40)}
            onLayout={i === 0 ? (e) => {
              const { y, height } = e.nativeEvent.layout;
              setCardMidY(y + height / 2);
            } : undefined}
          >
            <ChildCard
              kid={kid}
              subtitle={subtitle}
              statusLabel={pv.label}
              statusColor={pv.color}
              links={linksFor()}
            />
          </Animated.View>
        );
      })}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const on = filter === f.key;
          const n = counts[f.key] ?? 0;
          return (
            <Pressable key={f.key} onPress={() => setFilter(f.key)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f.label}</Text>
              {n > 0 ? (
                <View style={[styles.count, on && styles.countOn]}>
                  <Text style={[styles.countText, on && styles.countTextOn]}>{n}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {feedLoading && kids.length > 0 ? (
        <View style={styles.feed}>{[0, 1, 2].map(postSkeleton)}</View>
      ) : visiblePosts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <SymbolView name={emptyContent.icon} size={28} tintColor={colors.secondaryLabel} />
          </View>
          <Text style={styles.emptyTitle}>{emptyContent.title}</Text>
          <Text style={styles.emptyHint}>{emptyContent.hint}</Text>
        </View>
      ) : (
        <View style={styles.feed}>{feedRows}</View>
      )}
    </Animated.ScrollView>

    {/* Compact child summary sticks below header when greeting scrolls away */}
    {kids.length > 0 ? (
      <Animated.View style={[styles.stickyCard, { top: headerPad }, stickyStyle]}>
        <PressableScale
          scaleTo={0.99}
          onPress={() => {
            if (!isSticky) return;
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setStickyExpanded((v) => !v);
          }}
        >
          <View style={styles.stickyInner}>
            {kids.map((kid) => {
              const pv = presenceFor(kid, colors, presence[kid.id]);
              return (
                <View key={kid.id} style={styles.stickyKid}>
                  <Avatar uri={kid.pictureUrl} name={kid.name} size={28} color={kid.color} />
                  <Text style={styles.stickyKidName}>{kid.firstName}</Text>
                  <View style={{ flex: 1 }} />
                  <View style={[styles.stickyChip, { backgroundColor: pv.chipBg }]}>
                    <Text style={[styles.stickyChipText, { color: pv.color }]}>{pv.label}</Text>
                  </View>
                  <SymbolView name="chevron.up.chevron.down" size={12} tintColor={colors.tertiaryLabel} />
                </View>
              );
            })}
            {stickyExpanded && (
              <View style={styles.stickyLinks}>
                {linksFor().map((link, idx) => (
                  <PressableScale key={idx} onPress={link.onPress} scaleTo={0.94} style={styles.stickyLink}>
                    <View style={[styles.stickyLinkIcon, { backgroundColor: alpha(link.color ?? colors.tint, 0.12) }]}>
                      <SymbolView name={link.icon as SymbolName} size={16} tintColor={link.color ?? colors.tint} />
                    </View>
                    <Text style={[styles.stickyLinkText, { color: colors.label }]}>{link.label}</Text>
                  </PressableScale>
                ))}
              </View>
            )}
          </View>
        </PressableScale>
      </Animated.View>
    ) : null}
    </SafeAreaView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    gradientBg: { position: 'absolute', top: 0, left: 0, right: 0 },
    contentContainer: {
      flexGrow: 1,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xxxl,
    },
    header: {
      marginTop: spacing.md,
      marginBottom: spacing.xxl,
    },
    greetWord: {
      fontSize: 30,
      fontWeight: '500' as const,
      letterSpacing: -0.3,
    },
    nameLine: {
      fontSize: 30,
      fontWeight: '500' as const,
      letterSpacing: -0.3,
      marginTop: 2,
    },
    filterScroll: { marginHorizontal: -spacing.xl },
    filterRow: {
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    chipOn: { backgroundColor: c.label },
    chipText: { ...font.subhead, color: c.secondaryLabel },
    chipTextOn: { color: c.bg, fontWeight: '600' },
    count: {
      backgroundColor: c.fillStrong,
      borderRadius: radius.pill,
      minWidth: 20,
      paddingHorizontal: 6,
      paddingVertical: 1,
      alignItems: 'center',
    },
    countOn: { backgroundColor: c.bg },
    countText: { ...font.caption, fontSize: 11, color: c.secondaryLabel },
    countTextOn: { color: c.label },
    feed: { gap: spacing.md, marginTop: spacing.sm },
    groupLabel: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginTop: spacing.md,
      marginBottom: -spacing.xs,
    },
    postCard: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      backgroundColor: c.card,
      ...(c.scheme === 'dark' ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.separator } : {}),
    },
    postHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    postHeadText: { flex: 1, minWidth: 0 },
    author: { ...font.subhead, fontWeight: '600', color: c.label },
    meta: { ...font.caption, color: c.secondaryLabel, marginTop: 1 },
    postBody: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
    postText: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.tint },
    postTitle: { ...font.headline, color: c.label, flex: 1 },
    postTitleUnread: { fontWeight: '700' },
    postPreview: { ...font.footnote, color: c.secondaryLabel, marginTop: 4, lineHeight: 18 },
    thumbWrap: { width: 66, height: 66 },
    thumb: { width: 66, height: 66, borderRadius: radius.sm, backgroundColor: c.fill },
    playBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyWrap: { alignItems: 'center', paddingVertical: spacing.huge },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: { ...font.title3, color: c.label },
    emptyHint: { ...font.footnote, color: c.secondaryLabel, marginTop: spacing.xs, textAlign: 'center' },
    skeletonGapSm: { marginTop: 6 },
    skeletonGapMd: { marginTop: spacing.md },
    skeletonSection: { marginTop: spacing.xxl, marginBottom: spacing.md },
    greetingAbs: {
      position: 'absolute',
      left: spacing.xl,
      right: spacing.xl,
    },
    stickyCard: {
      position: 'absolute',
      left: 0,
      right: 0,
    },
    stickyInner: {
      backgroundColor: c.card,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    stickyLinks: {
      flexDirection: 'row',
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      gap: spacing.xs,
    },
    stickyLink: {
      flex: 1,
      alignItems: 'center',
      gap: 5,
      paddingVertical: spacing.sm,
    },
    stickyLinkIcon: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stickyLinkText: {
      ...font.caption,
      fontWeight: '500' as const,
    },
    stickyKid: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    stickyKidName: {
      ...font.callout,
      fontWeight: '600' as const,
      color: c.label,
    },
    stickyChip: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    stickyChipText: {
      ...font.caption,
      fontWeight: '500' as const,
    },
  });
