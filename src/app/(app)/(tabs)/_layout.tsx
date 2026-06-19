import type { ComponentProps } from 'react';
import { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, View, type ColorValue } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../../theme/ThemeContext';
import { GlobalHeader, LIGHT_HOURS } from '../../../components/GlobalHeader';
import { SlideMenu } from '../../../components/SlideMenu';
import { HeaderScrollContext } from '../../../lib/headerScrollContext';
import { font } from '../../../theme';

const PANEL_WIDTH = Math.round(Dimensions.get('window').width * 0.72);

type SymbolName = ComponentProps<typeof SymbolView>['name'];

function tabIcon(name: SymbolName) {
  return ({ color }: { color: ColorValue }) => (
    <SymbolView name={name} size={24} tintColor={color as string} />
  );
}

const NON_HOME_TABS = ['fremmoede', 'beskeder', 'galleri', 'notifikationer'];

export default function TabsLayout() {
  const { colors } = useTheme();
  const pathname = usePathname();
  const isHomeActive = !NON_HOME_TABS.some((tab) => pathname.includes(tab));

  const scrollY = useSharedValue(0);
  const menuProgress = useSharedValue(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const hour = new Date().getHours();
  const lightGradient = LIGHT_HOURS.has(hour);
  const [statusStyle, setStatusStyle] = useState<'light' | 'dark'>(
    isHomeActive && !lightGradient ? 'light' : 'dark',
  );

  useAnimatedReaction(
    () => {
      if (!isHomeActive) return true;
      if (lightGradient) return true;
      return scrollY.value > 50;
    },
    (isDark, prev) => {
      if (isDark !== prev) runOnJS(setStatusStyle)(isDark ? 'dark' : 'light');
    },
    [isHomeActive, lightGradient],
  );

  const openMenu = useCallback(() => {
    setMenuOpen(true);
    menuProgress.value = withTiming(1, { duration: 300 });
  }, [menuProgress]);

  const closeMenu = useCallback(() => {
    menuProgress.value = withTiming(0, { duration: 260 }, (finished) => {
      if (finished) runOnJS(setMenuOpen)(false);
    });
  }, [menuProgress]);

  const contentShiftStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          menuProgress.value,
          [0, 1],
          [0, -PANEL_WIDTH * 0.25],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <HeaderScrollContext.Provider value={scrollY}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <StatusBar style={statusStyle} />
        <Animated.View style={[styles.fill, contentShiftStyle]}>
          {/* Tabs fills full height; screens render from y=0 */}
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.tint,
              tabBarInactiveTintColor: colors.tertiaryLabel,
              tabBarStyle: {
                backgroundColor: colors.card,
                borderTopColor: colors.separator,
              },
              tabBarLabelStyle: { ...font.caption, fontSize: 10 },
              tabBarBadgeStyle: { backgroundColor: colors.red, color: colors.white },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{ title: 'Hjem', tabBarIcon: tabIcon('house') }}
            />
            <Tabs.Screen
              name="fremmoede"
              options={{ title: 'Fremmøde', tabBarIcon: tabIcon('checkmark.circle') }}
            />
            <Tabs.Screen
              name="beskeder"
              options={{ title: 'Beskeder', tabBarIcon: tabIcon('bubble.left') }}
            />
            <Tabs.Screen
              name="galleri"
              options={{ title: 'Galleri', tabBarIcon: tabIcon('photo') }}
            />
            <Tabs.Screen
              name="notifikationer"
              options={{
                tabBarButton: () => null,
                tabBarItemStyle: { display: 'none' },
              }}
            />
          </Tabs>

          {/* GlobalHeader overlays from top — rendered last so it paints above Tabs */}
          <View style={styles.headerOverlay}>
            <GlobalHeader onMenuPress={openMenu} isHomeActive={isHomeActive} />
          </View>
        </Animated.View>

        {menuOpen ? <SlideMenu menuProgress={menuProgress} onClose={closeMenu} /> : null}
      </View>
    </HeaderScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
