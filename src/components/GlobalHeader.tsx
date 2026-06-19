// src/components/GlobalHeader.tsx — persistent top bar (transparent on home, white on scroll)
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useAula } from '../lib/aula-context';
import { useHeaderScrollY } from '../lib/headerScrollContext';
import { Avatar, PressableScale } from './ui';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../theme';
import { personColor } from '../theme/childColors';

// ── Time-of-day gradient data (used by home screen too) ──────────────────────

export type HourGradient =
  | { type: 'solid'; color: string }
  | { type: 'gradient'; colors: readonly [string, string, ...string[]]; locations: readonly [number, number, ...number[]] };

type Phase = 'night' | 'twilight' | 'dawn' | 'morning' | 'noon' | 'sunset' | 'dusk';

export const PHASE_GRADIENTS: Record<Phase, HourGradient> = {
  twilight: { type: 'gradient', colors: ['#01112A', '#487197', '#F2BE8F'],            locations: [0, 0.5,    1] },
  dawn:     { type: 'gradient', colors: ['#04092E', '#00619D', '#FFA24B', '#FF2E00'], locations: [0, 0.3317, 0.66, 1] },
  morning:  { type: 'gradient', colors: ['#0067B9', '#00A5C8', '#EBD59C', '#FFB169'], locations: [0, 0.33,   0.66, 1] },
  noon:     { type: 'gradient', colors: ['#004FC4', '#E8FEFE'],                        locations: [0, 1] },
  sunset:   { type: 'gradient', colors: ['#262568', '#A45361', '#FF924F', '#FF4622'], locations: [0, 0.33,   0.66, 1] },
  dusk:     { type: 'gradient', colors: ['#180D27', '#6B1841', '#C04139', '#FF6227'], locations: [0, 0.33,   0.66, 1] },
  night:    { type: 'gradient', colors: ['#001231', '#004864', '#00A6A1'],             locations: [0, 0.5,    1] },
};

// Phase schedule in minutes-since-midnight — Copenhagen, June (sunrise 04:26, sunset 21:58)
const PHASE_SCHEDULE: [Phase, number][] = [
  ['night',    0],      // 00:00 — deep night
  ['twilight', 210],    // 03:30 — civil twilight begins
  ['dawn',     266],    // 04:26 — sunrise
  ['morning',  390],    // 06:30 — golden hour ends, full daylight
  ['noon',     660],    // 11:00 — midday
  ['sunset',   1110],   // 18:30 — golden hour begins (~2.5h before sunset)
  ['dusk',     1318],   // 21:58 — after sunset
  ['night',    1380],   // 23:00 — full night
];

export function getTimeGradient(date = new Date()): HourGradient {
  const m = date.getHours() * 60 + date.getMinutes();
  let phase: Phase = 'night';
  for (const [p, start] of PHASE_SCHEDULE) {
    if (m >= start) phase = p;
  }
  return PHASE_GRADIENTS[phase];
}

export function getPreviousGradient(date = new Date()): HourGradient {
  const m = date.getHours() * 60 + date.getMinutes();
  let prevPhase: Phase = 'night';
  let phase: Phase = 'night';
  for (const [p, start] of PHASE_SCHEDULE) {
    if (m >= start) { prevPhase = phase; phase = p; }
  }
  return PHASE_GRADIENTS[prevPhase];
}

// All phase gradients have dark top colours — white status-bar icons always
export const LIGHT_HOURS = new Set<number>([]);

interface Props {
  onMenuPress: () => void;
  isHomeActive: boolean;
}

export function GlobalHeader({ onMenuPress, isHomeActive }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { notifications, guardian } = useAula();
  const scrollY = useHeaderScrollY();
  const badgeCount = notifications.total;

  const lightGradient = false;

  const [gradientVisible, setGradientVisible] = useState(isHomeActive);

  useAnimatedReaction(
    () => {
      const sv = scrollY?.value ?? 999;
      return isHomeActive ? sv < 50 : false;
    },
    (cur, prev) => {
      if (cur !== prev) runOnJS(setGradientVisible)(cur);
    },
    [isHomeActive, scrollY],
  );

  useEffect(() => {
    if (!isHomeActive) setGradientVisible(false);
  }, [isHomeActive]);

  // White overlay fades in as user scrolls — transparent at top on all tabs
  const overlayStyle = useAnimatedStyle(() => {
    const sv = scrollY?.value ?? 0;
    return { opacity: interpolate(sv, [0, 80], [0, 1], Extrapolation.CLAMP) };
  });

  // Bottom border appears on scroll
  const borderStyle = useAnimatedStyle(() => {
    const sv = scrollY?.value ?? 0;
    return { opacity: interpolate(sv, [20, 80], [0, 1], Extrapolation.CLAMP) };
  });

  // Icon circle backgrounds animate from semi-transparent to solid
  const circleDarkFrom = lightGradient ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.28)';
  const circleStyle = useAnimatedStyle(() => {
    if (!isHomeActive) return { backgroundColor: colors.fill };
    const sv = scrollY?.value ?? 0;
    return { backgroundColor: interpolateColor(sv, [0, 80], [circleDarkFrom, colors.fill]) };
  });

  // Search bar background
  const searchBgFrom = lightGradient ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.30)';
  const searchBgStyle = useAnimatedStyle(() => {
    if (!isHomeActive) return { backgroundColor: colors.groupedBg };
    const sv = scrollY?.value ?? 0;
    return { backgroundColor: interpolateColor(sv, [0, 80], [searchBgFrom, colors.groupedBg]) };
  });

  const onGradient = gradientVisible;
  const iconColor = onGradient ? (lightGradient ? colors.label : '#ffffff') : colors.secondaryLabel;
  const searchTextColor = onGradient ? (lightGradient ? colors.tertiaryLabel : 'rgba(255,255,255,0.7)') : colors.tertiaryLabel;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* White overlay (fades in on scroll / always visible on non-home tabs) */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.whiteOverlay, overlayStyle]}
        pointerEvents="none"
      />

      {/* Bottom border fades in on scroll */}
      <Animated.View style={[styles.borderBottom, borderStyle]} pointerEvents="none" />

      {/* Content row */}
      <View style={styles.row}>
        {/* Search pill */}
        <PressableScale
          scaleTo={0.98}
          accessibilityLabel="Søg"
          style={styles.searchOuter}
        >
          <Animated.View style={[styles.searchWrap, searchBgStyle]}>
            <SymbolView name="magnifyingglass" size={14} tintColor={searchTextColor} />
            <Text style={[styles.searchPlaceholder, { color: searchTextColor }]}>Søg...</Text>
          </Animated.View>
        </PressableScale>

        {/* Bell with badge */}
        <PressableScale
          scaleTo={0.88}
          hitSlop={10}
          onPress={() => router.navigate('/(app)/(tabs)/notifikationer')}
          accessibilityLabel={badgeCount > 0 ? `${badgeCount} notifikationer` : 'Notifikationer'}
        >
          <Animated.View style={[styles.iconCircle, circleStyle]}>
            <SymbolView name="bell" size={20} tintColor={iconColor} />
            {badgeCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
              </View>
            ) : null}
          </Animated.View>
        </PressableScale>

        {/* Avatar */}
        <PressableScale scaleTo={0.88} hitSlop={8} onPress={() => router.push('/(app)/indstillinger')}>
          <Avatar
            uri={guardian?.pictureUrl}
            name={guardian?.name}
            size={32}
            color={personColor('guardian')}
          />
        </PressableScale>

        {/* Hamburger menu */}
        <PressableScale scaleTo={0.88} hitSlop={10} onPress={onMenuPress} accessibilityLabel="Menu">
          <Animated.View style={[styles.iconCircle, circleStyle]}>
            <SymbolView name="line.3.horizontal" size={20} tintColor={iconColor} />
          </Animated.View>
        </PressableScale>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    root: {
      overflow: 'hidden',
    },
    whiteOverlay: {
      backgroundColor: c.card,
    },
    borderBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: c.scheme === 'light' ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.14)',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      height: 60,
    },
    searchOuter: { flex: 1 },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.button,
      paddingHorizontal: spacing.md,
      height: 36,
    },
    searchPlaceholder: {
      ...font.callout,
      fontWeight: '400',
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: c.red,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  });
