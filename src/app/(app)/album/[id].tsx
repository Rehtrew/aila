// src/app/(app)/album/[id].tsx — Album media grid
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useAula } from '../../../lib/aula-context';
import { getMedia } from '../../../lib/aula-api';
import { mediaThumb } from '../../../lib/media';
import { downloadMedia, DOWNLOAD_ENABLED } from '../../../lib/download';
import { relativeTime } from '../../../lib/format';
import type { AulaAlbum, AulaMediaItem } from '../../../lib/aula-types';
import { Avatar, PressableScale, Skeleton } from '../../../components/ui';
import { MediaViewer } from '../../../components/MediaViewer';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../../theme';
import { personColor } from '../../../theme/childColors';

const GAP = 3;
const COLS = 3;

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { kids } = useAula();
  const [media, setMedia] = useState<AulaMediaItem[]>([]);
  const [album, setAlbum] = useState<AulaAlbum | null>(null);
  const [title, setTitle] = useState('Album');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const childIds = useMemo(() => kids.map((k) => k.id), [kids]);

  async function load(silent = false) {
    setError(null);
    if (!silent) setLoading(true);
    try {
      const res = await getMedia(id, childIds);
      setMedia(res.data?.results ?? []);
      setAlbum(res.data?.album ?? null);
      if (res.data?.album?.title) setTitle(res.data.album.title);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente album');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (childIds.length === 0) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, childIds.join(',')]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  function toggleSelect(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected(new Set());
  }

  const allSelected = media.length > 0 && selected.size === media.length;

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(media.map((_, i) => i)));
  }

  async function downloadSelected() {
    if (selected.size === 0 || downloading) return;
    setDownloading(true);
    try {
      const items = [...selected].map((i) => media[i]).filter(Boolean);
      await downloadMedia(items);
      exitSelect();
    } catch (e) {
      Alert.alert('Kunne ikke gemme', e instanceof Error ? e.message : 'Fejl');
    } finally {
      setDownloading(false);
    }
  }

  const size = (Dimensions.get('window').width - GAP * (COLS - 1)) / COLS;

  const renderItem = useCallback(
    ({ item, index }: { item: AulaMediaItem; index: number }) => {
      const uri = mediaThumb(item);
      const isSel = selected.has(index);
      return (
        <View style={{ width: size, height: size }}>
          <PressableScale
            scaleTo={0.97}
            style={styles.tile}
            onPress={() => (selectMode ? toggleSelect(index) : setViewer(index))}
            onLongPress={
              DOWNLOAD_ENABLED
                ? () => {
                    setSelectMode(true);
                    toggleSelect(index);
                  }
                : undefined
            }
          >
            {uri ? (
              <Image source={{ uri }} style={styles.img} contentFit="cover" transition={150} />
            ) : (
              <View style={[styles.img, styles.emptyThumb]}>
                <SymbolView
                  name={item.mediaType === 'video' ? 'film' : 'photo'}
                  size={22}
                  tintColor={colors.tertiaryLabel}
                />
              </View>
            )}
            {item.mediaType === 'video' && !selectMode ? (
              <View style={styles.playBadge}>
                <SymbolView name="play.fill" size={13} tintColor={colors.white} />
              </View>
            ) : null}
            {selectMode ? (
              <>
                {isSel ? <View pointerEvents="none" style={styles.selRing} /> : null}
                <View style={[styles.selectMark, isSel ? styles.selectMarkOn : styles.selectMarkOff]}>
                  <SymbolView
                    name={isSel ? 'checkmark.circle.fill' : 'circle'}
                    size={22}
                    tintColor={isSel ? colors.tint : colors.white}
                  />
                </View>
              </>
            ) : null}
          </PressableScale>
        </View>
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectMode, selected, size, colors, styles],
  );

  const creatorColor = personColor(undefined, album?.creator?.name);

  return (
    <View style={styles.fill}>
      {/* Hide the native Stack header — we render our own below */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.header} edges={['top']}>
        {/* Navigation row */}
        <View style={styles.navRow}>
          <PressableScale
            scaleTo={0.92}
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <SymbolView name="chevron.left" size={18} tintColor={colors.tint} />
            <Text style={styles.backLabel}>Tilbage</Text>
          </PressableScale>
          {media.length > 0 && DOWNLOAD_ENABLED ? (
            <PressableScale
              scaleTo={0.92}
              style={styles.selectBtn}
              onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
              hitSlop={10}
            >
              <Text style={styles.selectBtnText}>{selectMode ? 'Annuller' : 'Vælg'}</Text>
            </PressableScale>
          ) : null}
        </View>

        {/* Album title */}
        {loading ? (
          <Skeleton width="65%" height={26} style={styles.titleSkel} />
        ) : (
          <Text style={styles.albumTitle} numberOfLines={2}>
            {selectMode ? `${selected.size} valgt` : title}
          </Text>
        )}

        {/* Author row */}
        {loading ? (
          <View style={styles.authorRow}>
            <Skeleton width={36} height={36} radius={18} />
            <View style={styles.authorSkelLines}>
              <Skeleton width={140} height={12} />
              <Skeleton width={90} height={10} />
            </View>
          </View>
        ) : album?.creator?.name ? (
          <View style={styles.authorRow}>
            <Avatar name={album.creator.name} size={36} color={creatorColor} />
            <View style={styles.authorInfo}>
              <Text style={styles.authorName} numberOfLines={1}>
                {album.creator.name}
              </Text>
              {album.creator.metadata ? (
                <Text style={styles.authorMeta} numberOfLines={1}>
                  {album.creator.metadata}
                </Text>
              ) : null}
            </View>
            <View style={styles.authorRight}>
              {album.creationDate ? (
                <Text style={styles.albumDate}>{relativeTime(album.creationDate)}</Text>
              ) : null}
              <Text style={styles.mediaCount}>{media.length} medier</Text>
            </View>
          </View>
        ) : null}
      </SafeAreaView>

      {loading ? (
        <View style={styles.skelGrid}>
          {Array.from({ length: 18 }, (_, i) => (
            <Skeleton key={i} width={size} height={size} radius={0} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateIcon}>
            <SymbolView name="exclamationmark.triangle" size={28} tintColor={colors.secondaryLabel} />
          </View>
          <Text style={styles.stateTitle}>Noget gik galt</Text>
          <Text style={styles.stateHint}>{error}</Text>
          <PressableScale scaleTo={0.96} style={styles.retryBtn} onPress={() => load()}>
            <Text style={styles.retryText}>Prøv igen</Text>
          </PressableScale>
        </View>
      ) : (
        <>
          <FlatList
            data={media}
            keyExtractor={(m, i) => String(m.id ?? i)}
            numColumns={COLS}
            showsVerticalScrollIndicator={false}
            extraData={{ selectMode, selectedSize: selected.size }}
            columnWrapperStyle={{ gap: GAP }}
            contentContainerStyle={{ gap: GAP, paddingBottom: selectMode ? 110 : 0 }}
            refreshControl={
              selectMode ? undefined : (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.secondaryLabel}
                />
              )
            }
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <View style={styles.stateIcon}>
                  <SymbolView
                    name="photo.on.rectangle.angled"
                    size={28}
                    tintColor={colors.secondaryLabel}
                  />
                </View>
                <Text style={styles.stateTitle}>Ingen medier</Text>
                <Text style={styles.stateHint}>
                  Albummet indeholder ingen billeder eller video endnu.
                </Text>
              </View>
            }
            renderItem={renderItem}
          />

          {selectMode ? (
            <Animated.View
              entering={SlideInDown.duration(300)}
              exiting={SlideOutDown.duration(220)}
              style={styles.bottomBarWrap}
            >
              <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
                <View style={styles.bottomRow}>
                  <Pressable onPress={toggleSelectAll} hitSlop={10}>
                    <Text style={styles.selectAllText}>
                      {allSelected ? 'Fravælg alle' : 'Vælg alle'}
                    </Text>
                  </Pressable>
                  <PressableScale
                    scaleTo={0.97}
                    style={[styles.downloadBtn, selected.size === 0 && styles.downloadDisabled]}
                    onPress={downloadSelected}
                    disabled={selected.size === 0 || downloading}
                  >
                    {downloading ? (
                      <ActivityIndicator color={colors.onTint} />
                    ) : (
                      <Text
                        style={[styles.downloadText, selected.size === 0 && styles.downloadTextDisabled]}
                      >
                        {selected.size > 0 ? `Del ${selected.size} medier` : 'Vælg medier'}
                      </Text>
                    )}
                  </PressableScale>
                </View>
              </SafeAreaView>
            </Animated.View>
          ) : null}

          {viewer !== null ? (
            <MediaViewer items={media} initialIndex={viewer} onClose={() => setViewer(null)} />
          ) : null}
        </>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    header: {
      backgroundColor: c.bg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.lg,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    backLabel: { ...font.body, color: c.tint },
    selectBtn: {
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 6,
    },
    selectBtnText: { ...font.subhead, fontWeight: '600', color: c.label },
    albumTitle: {
      ...font.title,
      color: c.label,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    titleSkel: { marginTop: spacing.xl, marginBottom: spacing.xl },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    authorInfo: { flex: 1, minWidth: 0 },
    authorName: { ...font.subhead, color: c.label },
    authorMeta: { ...font.caption, color: c.secondaryLabel, marginTop: 1 },
    authorRight: { alignItems: 'flex-end' },
    authorSkelLines: { flex: 1, gap: 6 },
    albumDate: { ...font.caption, color: c.secondaryLabel },
    mediaCount: { ...font.caption, color: c.tertiaryLabel, marginTop: 1 },
    tile: { flex: 1 },
    img: { width: '100%', height: '100%' },
    emptyThumb: { backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' },
    playBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selRing: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderWidth: 2,
      borderColor: c.tint,
    },
    selectMark: { position: 'absolute', top: 6, right: 6, borderRadius: 11 },
    selectMarkOn: { backgroundColor: c.white },
    selectMarkOff: { backgroundColor: 'rgba(0,0,0,0.25)' },
    skelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
    stateWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.huge,
      paddingHorizontal: spacing.xxl,
      gap: spacing.sm,
    },
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
    bottomBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    bottomBar: {
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
    },
    bottomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
    selectAllText: { ...font.callout, fontWeight: '600', color: c.tint },
    downloadBtn: {
      flex: 1,
      backgroundColor: c.tint,
      borderRadius: radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
    },
    downloadDisabled: { backgroundColor: c.fillStrong },
    downloadText: { ...font.headline, color: c.onTint },
    downloadTextDisabled: { color: c.secondaryLabel },
  });
