// src/app/(app)/(tabs)/galleri.tsx — Galleri: hero + tight album grid (v23)
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useScrollToTop } from 'expo-router';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAula } from '../../../lib/aula-context';
import { getAlbums } from '../../../lib/aula-api';
import { albumThumb } from '../../../lib/media';
import { dateValue, relativeTime } from '../../../lib/format';
import type { AulaAlbum } from '../../../lib/aula-types';
import { PressableScale, Skeleton } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../../theme';
import { HEADER_ROW_HEIGHT } from '../../../lib/headerScrollContext';

type GalleryFilter = 'all' | 'mine';
type GallerySort = 'newest' | 'name';

// Small pill bottom-right on a thumbnail. Scrim over photo — white text allowed.
function CountBadge({ count }: { count?: number }) {
  const styles = useThemedStyles(makeStyles);
  if (count == null) return null;
  return (
    <View style={styles.countBadge}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </View>
  );
}

export default function GalleryScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { kids, guardianProfileId } = useAula();
  const { top: topInset } = useSafeAreaInsets();
  const headerPad = topInset + HEADER_ROW_HEIGHT;
  const [albums, setAlbums] = useState<AulaAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<GalleryFilter>('all');
  const [sort, setSort] = useState<GallerySort>('newest');
  const listRef = useRef<FlatList<AulaAlbum>>(null);
  useScrollToTop(listRef);

  function openSortSheet() {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Annuller', 'Nyeste', 'Navn'], cancelButtonIndex: 0 },
      (idx) => {
        if (idx === 1) setSort('newest');
        else if (idx === 2) setSort('name');
      },
    );
  }

  const childIds = useMemo(() => kids.map((k) => k.id), [kids]);
  const idsKey = childIds.join(',');

  async function load() {
    if (childIds.length === 0) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getAlbums(childIds, 0);
      setAlbums(res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente galleri');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const visible = useMemo(() => {
    let list = albums;
    if (filter === 'mine' && guardianProfileId != null) {
      list = list.filter((a) => a.creator?.profileId === guardianProfileId);
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'da'));
    else sorted.sort((a, b) => dateValue(b.creationDate) - dateValue(a.creationDate));
    return sorted;
  }, [albums, filter, sort, guardianProfileId]);

  // The newest album becomes a full-width hero; the rest go in the tight grid.
  const hero = useMemo(() => {
    if (visible.length === 0) return null;
    return visible.reduce(
      (best, a) => (dateValue(a.creationDate) > dateValue(best.creationDate) ? a : best),
      visible[0],
    );
  }, [visible]);
  const gridAlbums = useMemo(
    () => (hero ? visible.filter((a) => a.id !== hero.id) : visible),
    [visible, hero],
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const headerTop = (
    <View>
      <Text style={styles.eyebrow}>Fotos og video</Text>
      <Text style={styles.title}>Galleri</Text>
      <View style={styles.controls}>
        <View style={styles.segPill}>
          {(['all', 'mine'] as GalleryFilter[]).map((f) => {
            const active = filter === f;
            return (
              <Pressable key={f} onPress={() => setFilter(f)} style={[styles.seg, active && styles.segActive]}>
                <Text style={[styles.segText, active && styles.segTextActive]}>
                  {f === 'all' ? 'Alle' : 'Lavet af mig'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <PressableScale scaleTo={0.94} onPress={openSortSheet} style={styles.sortBtn}>
          <Text style={styles.sortLabel}>{sort === 'newest' ? 'Nyeste' : 'Navn'}</Text>
          <SymbolView name="chevron.up.chevron.down" size={11} tintColor={colors.secondaryLabel} />
        </PressableScale>
      </View>
    </View>
  );

  if (loading)
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
        <View style={styles.content}>
          {headerTop}
          {/* Ghost layout shaped like the real content: hero + 2-col grid */}
          <View style={styles.skelHero}>
            <Skeleton height={210} radius={radius.lg} />
            <Skeleton width="55%" height={16} style={styles.skelLine} />
            <Skeleton width="35%" height={12} style={styles.skelLineSm} />
          </View>
          {[0, 1].map((row) => (
            <View key={row} style={styles.skelRow}>
              {[0, 1].map((col) => (
                <View key={col} style={styles.skelCol}>
                  <Skeleton height={150} radius={radius.lg} />
                  <Skeleton width="70%" height={13} style={styles.skelLineSm} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </SafeAreaView>
    );

  if (error)
    return (
      <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
        <View style={styles.content}>
          {headerTop}
          <View style={styles.stateWrap}>
            <View style={styles.stateIcon}>
              <SymbolView name="exclamationmark.triangle" size={28} tintColor={colors.secondaryLabel} />
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
        </View>
      </SafeAreaView>
    );

  const heroThumb = hero ? albumThumb(hero) : undefined;
  const heroMeta = hero
    ? [hero.creationDate ? relativeTime(hero.creationDate) : null, hero.creator?.name]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: headerPad }]} edges={[]}>
      <FlatList
        ref={listRef}
        data={gridAlbums}
        keyExtractor={(a) => String(a.id)}
        numColumns={2}
        columnWrapperStyle={styles.colWrap}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.secondaryLabel} />
        }
        ListHeaderComponent={
          <View>
            {headerTop}
            {hero ? (
              <Animated.View entering={FadeInDown.duration(280)}>
                <Text style={styles.sectionLabel}>Seneste</Text>
                <PressableScale
                  onPress={() => router.push(`/(app)/album/${hero.id}`)}
                  style={styles.heroCard}
                >
                  <View style={styles.heroMedia}>
                    {heroThumb ? (
                      <Image
                        source={{ uri: heroThumb }}
                        style={styles.fillImg}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : (
                      <View style={styles.placeholderFill}>
                        <SymbolView name="photo" size={36} tintColor={colors.tertiaryLabel} />
                      </View>
                    )}
                    <CountBadge count={hero.mediaCount} />
                  </View>
                  <View style={styles.heroBody}>
                    <Text style={styles.heroTitle} numberOfLines={2}>
                      {hero.title || 'Album'}
                    </Text>
                    {heroMeta ? (
                      <Text style={styles.heroMeta} numberOfLines={1}>
                        {heroMeta}
                      </Text>
                    ) : null}
                  </View>
                </PressableScale>
              </Animated.View>
            ) : null}
            {gridAlbums.length > 0 ? (
              <Text style={styles.sectionLabel}>{`Alle album · ${gridAlbums.length}`}</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          visible.length === 0 ? (
            <View style={styles.stateWrap}>
              <View style={styles.stateIcon}>
                <SymbolView
                  name="photo.on.rectangle.angled"
                  size={28}
                  tintColor={colors.secondaryLabel}
                />
              </View>
              <Text style={styles.stateTitle}>
                {filter === 'mine' ? 'Ingen album fra dig' : 'Ingen album endnu'}
              </Text>
              <Text style={styles.stateHint}>
                {filter === 'mine'
                  ? 'Du har ikke oprettet nogen album.'
                  : 'Billeder og video fra institutionen vises her.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const thumb = albumThumb(item);
          return (
            <Animated.View
              style={styles.gridItem}
              entering={FadeInDown.duration(280).delay(Math.min(index, 8) * 40)}
            >
              <PressableScale onPress={() => router.push(`/(app)/album/${item.id}`)}>
                <View style={styles.gridThumbWrap}>
                  {thumb ? (
                    <Image
                      source={{ uri: thumb }}
                      style={styles.fillImg}
                      contentFit="cover"
                      transition={150}
                    />
                  ) : (
                    <View style={styles.placeholderFill}>
                      <SymbolView name="photo" size={26} tintColor={colors.tertiaryLabel} />
                    </View>
                  )}
                  <CountBadge count={item.mediaCount} />
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title || 'Album'}
                </Text>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.creationDate ? relativeTime(item.creationDate) : 'Album'}
                </Text>
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
    listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge, gap: spacing.lg },
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
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    segPill: {
      flexDirection: 'row',
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      padding: 3,
    },
    seg: {
      paddingHorizontal: spacing.lg,
      paddingVertical: 7,
      borderRadius: radius.pill,
    },
    segActive: {
      backgroundColor: c.card,
      shadowColor: '#000',
      shadowOpacity: c.scheme === 'light' ? 0.08 : 0,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
      borderWidth: c.scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
      borderColor: c.separator,
    },
    segText: { ...font.subhead, color: c.secondaryLabel },
    segTextActive: { color: c.label, fontWeight: '600' },
    sortBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    sortLabel: { ...font.caption, fontWeight: '600', color: c.secondaryLabel },
    sectionLabel: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginTop: spacing.xxl,
      marginBottom: spacing.md,
    },
    heroCard: { borderRadius: radius.lg, ...cardSurface(c) },
    heroMedia: {
      aspectRatio: 16 / 10,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: c.fill,
    },
    heroBody: { paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    heroTitle: { ...font.title3, color: c.label },
    heroMeta: { ...font.footnote, color: c.secondaryLabel, marginTop: spacing.xs },
    gridItem: { flex: 1, maxWidth: '48.5%' },
    gridThumbWrap: {
      aspectRatio: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
      backgroundColor: c.fill,
    },
    fillImg: { width: '100%', height: '100%' },
    placeholderFill: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.fill,
    },
    cardTitle: { ...font.callout, color: c.label, marginTop: spacing.sm },
    cardSub: { ...font.caption, color: c.secondaryLabel, marginTop: 2 },
    countBadge: {
      position: 'absolute',
      bottom: spacing.sm,
      right: spacing.sm,
      backgroundColor: 'rgba(0,0,0,0.55)',
      borderRadius: radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    countBadgeText: { ...font.caption, color: c.white },
    colWrap: { gap: spacing.md },
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
    stateHint: { ...font.footnote, color: c.secondaryLabel, textAlign: 'center' },
    retryBtn: {
      marginTop: spacing.md,
      backgroundColor: c.tint,
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    retryText: { ...font.headline, color: c.onTint },
    skelHero: { marginTop: spacing.xxl },
    skelRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    skelCol: { flex: 1 },
    skelLine: { marginTop: spacing.md },
    skelLineSm: { marginTop: spacing.sm },
  });
