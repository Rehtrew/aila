// src/app/(app)/opslag/[id].tsx — Post (opslag) detail, optimized for reading.
import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getCachedPost } from '../../../lib/aula-api';
import { useAula } from '../../../lib/aula-context';
import { useBookmarks } from '../../../lib/bookmarks';
import { htmlToText, relativeTime } from '../../../lib/format';
import { mediaThumb, postMediaItems } from '../../../lib/media';
import { Avatar, PressableScale, Tag } from '../../../components/ui';
import { MediaViewer } from '../../../components/MediaViewer';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../../theme';
import { personColor } from '../../../theme/childColors';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 3;

/** "Onsdag 10. juni" (year appended when it isn't the current one). */
function fullDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  const s = d.toLocaleDateString('da-DK', opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { kids } = useAula();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [viewer, setViewer] = useState<number | null>(null);
  const post = getCachedPost(Number(id));
  const saved = isBookmarked(Number(id));

  if (!post) {
    return (
      <View style={styles.fill}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerRow}>
            <PressableScale onPress={() => router.back()} scaleTo={0.92} hitSlop={12} style={styles.headerBtn}>
              <SymbolView name="chevron.left" size={18} tintColor={colors.tint} />
            </PressableScale>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCircle}>
            <SymbolView name="doc.text" size={28} tintColor={colors.secondaryLabel} />
          </View>
          <Text style={styles.emptyTitle}>Opslaget er ikke indlæst</Text>
          <Text style={styles.emptyHint}>Åbn opslaget fra forsiden igen.</Text>
        </View>
      </View>
    );
  }

  const related = post.relatedProfiles ?? [];
  const kid = kids.find((k) =>
    related.some((rp) => rp.id === k.id || rp.profileId === k.profileId),
  );
  const group = post.sharedWithGroups?.[0]?.name ?? '';
  const body = htmlToText(post.content?.html);
  const media = postMediaItems(post);
  const videoCount = media.filter((m) => m.mediaType === 'video').length;
  const galleryLabel =
    videoCount > 0
      ? `Galleri · ${media.length}`
      : `${media.length} ${media.length === 1 ? 'billede' : 'billeder'}`;

  // Tile size: 1 item → full-width hero, 2 → two-up, 3+ → tight three-up grid.
  const contentW = SCREEN_W - spacing.xl * 2;
  const cols = media.length === 1 ? 1 : media.length === 2 ? 2 : 3;
  const tileSize = (contentW - GRID_GAP * (cols - 1)) / cols;

  return (
    <View style={styles.fill}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <PressableScale onPress={() => router.back()} scaleTo={0.92} hitSlop={12} style={styles.headerBtn}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.tint} />
          </PressableScale>
          <View style={styles.headerRight}>
            <PressableScale onPress={() => toggleBookmark(Number(id))} scaleTo={0.92} hitSlop={12} style={styles.headerBtn}>
              <SymbolView
                name={saved ? 'bookmark.fill' : 'bookmark'}
                size={20}
                tintColor={saved ? colors.tint : colors.secondaryLabel}
              />
            </PressableScale>
          </View>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(280)}>
          <View style={styles.eyebrowRow}>
            {post.timestamp ? <Text style={styles.eyebrow}>{fullDate(post.timestamp)}</Text> : null}
            {post.isImportant ? <Tag label="Vigtigt" color={colors.orange} /> : null}
          </View>
          <Text style={styles.title}>{post.title}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(280).delay(60)} style={styles.byline}>
          <Avatar
            uri={post.ownerProfile?.profilePicture?.url}
            name={post.ownerProfile?.fullName}
            size={40}
            color={personColor(post.ownerProfile?.role, post.ownerProfile?.profileId)}
          />
          <View style={styles.bylineText}>
            <Text style={styles.author} numberOfLines={1}>
              {post.ownerProfile?.fullName ?? 'Aula'}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[
                group || post.ownerProfile?.metadata || '',
                post.timestamp ? relativeTime(post.timestamp) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          {kid ? <Tag label={kid.firstName} color={kid.color} /> : null}
        </Animated.View>

        {body ? (
          <Animated.View entering={FadeInDown.duration(280).delay(120)}>
            <Text style={styles.body}>{body}</Text>
          </Animated.View>
        ) : null}

        {media.length > 0 ? (
          <Animated.View entering={FadeInDown.duration(280).delay(180)}>
            <Text style={styles.galleryEyebrow}>{galleryLabel}</Text>
            <View style={styles.grid}>
              {media.map((m, i) => (
                <PressableScale
                  key={m.id ?? i}
                  onPress={() => setViewer(i)}
                  scaleTo={0.98}
                  style={[
                    styles.tile,
                    cols === 1
                      ? { width: contentW, aspectRatio: 4 / 3 }
                      : { width: tileSize, height: tileSize },
                  ]}
                >
                  <Image
                    source={{ uri: mediaThumb(m) }}
                    style={[styles.tileImg, cols === 1 && styles.tileImgHero]}
                    contentFit="cover"
                    transition={150}
                  />
                  {m.mediaType === 'video' ? (
                    <View style={styles.playBadge}>
                      <SymbolView name="play.fill" size={12} tintColor={colors.white} />
                    </View>
                  ) : null}
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        ) : null}

        {(post.commentCount ?? 0) > 0 ? (
          <Animated.View entering={FadeInDown.duration(280).delay(240)} style={styles.footer}>
            <SymbolView name="bubble.left" size={14} tintColor={colors.tertiaryLabel} />
            <Text style={styles.footerText}>
              {post.commentCount === 1
                ? '1 kommentar i Aula'
                : `${post.commentCount} kommentarer i Aula`}
            </Text>
          </Animated.View>
        ) : null}
      </ScrollView>

      {viewer !== null ? (
        <MediaViewer items={media} initialIndex={viewer} onClose={() => setViewer(null)} />
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    header: { backgroundColor: c.bg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      height: 48,
    },
    headerBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    eyebrow: { ...font.eyebrow, color: c.secondaryLabel },
    title: { ...font.title, color: c.label, marginTop: spacing.md, marginBottom: spacing.xl },
    byline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.lg,
      marginBottom: spacing.xl,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    bylineText: { flex: 1, minWidth: 0 },
    author: { ...font.subhead, fontWeight: '600', color: c.label },
    meta: { ...font.caption, color: c.secondaryLabel, marginTop: 2 },
    body: { ...font.body, lineHeight: 26, color: c.label },
    galleryEyebrow: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
    tile: { borderRadius: radius.sm, overflow: 'hidden' },
    tileImg: { width: '100%', height: '100%', backgroundColor: c.fill },
    tileImgHero: { borderRadius: radius.md },
    playBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xxl,
      paddingTop: spacing.lg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    footerText: { ...font.footnote, color: c.tertiaryLabel },
    emptyWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.huge,
      paddingHorizontal: spacing.xxl,
    },
    emptyCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: { ...font.title3, color: c.label, textAlign: 'center' },
    emptyHint: {
      ...font.footnote,
      color: c.secondaryLabel,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
  });
