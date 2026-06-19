// src/components/SlideMenu.tsx — right-side slide-in navigation panel
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, Dimensions, Pressable } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { PressableScale } from './ui';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../theme';
import { clearTokens } from '../lib/token-storage';

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * 0.72);

type SymbolName = ComponentProps<typeof SymbolView>['name'];

interface NavItem {
  label: string;
  route: string;
  symbol: SymbolName;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Hjem', route: '/(app)/(tabs)/', symbol: 'house' },
  { label: 'Fremmøde', route: '/(app)/(tabs)/fremmoede', symbol: 'checkmark.circle' },
  { label: 'Beskeder', route: '/(app)/(tabs)/beskeder', symbol: 'bubble.left' },
  { label: 'Galleri', route: '/(app)/(tabs)/galleri', symbol: 'photo' },
];

interface Props {
  menuProgress: SharedValue<number>;
  onClose: () => void;
}

export function SlideMenu({ menuProgress, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(menuProgress.value, [0, 1], [0, 0.45], Extrapolation.CLAMP),
  }));

  const panelStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(menuProgress.value, [0, 1], [PANEL_WIDTH, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  function navigate(route: string) {
    onClose();
    router.navigate(route as Parameters<typeof router.navigate>[0]);
  }

  async function handleLogout() {
    onClose();
    await clearTokens();
    router.replace('/(auth)/login');
  }

  return (
    <>
      {/* Tap-to-close backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Panel */}
      <Animated.View style={[styles.panel, { paddingTop: insets.top }, panelStyle]}>
        {/* Close button */}
        <View style={styles.panelHeader}>
          <PressableScale scaleTo={0.88} hitSlop={10} onPress={onClose} style={styles.closeBtn}>
            <SymbolView name="xmark" size={16} tintColor={colors.secondaryLabel} />
          </PressableScale>
        </View>

        {/* Nav items */}
        <View style={styles.navList}>
          {NAV_ITEMS.map(({ label, route, symbol }) => (
            <PressableScale
              key={route}
              scaleTo={0.97}
              onPress={() => navigate(route)}
              style={styles.navItem}
            >
              <View style={[styles.navIconWrap, { backgroundColor: colors.fill }]}>
                <SymbolView name={symbol} size={20} tintColor={colors.label} />
              </View>
              <Text style={styles.navLabel}>{label}</Text>
            </PressableScale>
          ))}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Settings + Logout */}
        <View style={styles.bottomList}>
          <PressableScale
            scaleTo={0.97}
            onPress={() => navigate('/(app)/indstillinger')}
            style={styles.navItem}
          >
            <View style={[styles.navIconWrap, { backgroundColor: colors.fill }]}>
              <SymbolView name="gearshape" size={20} tintColor={colors.label} />
            </View>
            <Text style={styles.navLabel}>Indstillinger</Text>
          </PressableScale>

          <PressableScale scaleTo={0.97} onPress={handleLogout} style={styles.navItem}>
            <View style={[styles.navIconWrap, { backgroundColor: colors.red + '18' }]}>
              <SymbolView name="rectangle.portrait.and.arrow.right" size={20} tintColor={colors.red} />
            </View>
            <Text style={[styles.navLabel, { color: colors.red }]}>Log ud</Text>
          </PressableScale>
        </View>
      </Animated.View>
    </>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    backdrop: {
      backgroundColor: '#000',
    },
    panel: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: PANEL_WIDTH,
      backgroundColor: c.card,
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: c.separator,
    },
    panelHeader: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navList: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      gap: spacing.xs,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.lg,
    },
    navIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navLabel: { ...font.title3, color: c.label },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.separator,
      marginHorizontal: spacing.xl,
      marginVertical: spacing.lg,
    },
    bottomList: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xl,
      gap: spacing.xs,
    },
  });
