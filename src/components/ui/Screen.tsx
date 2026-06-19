// Screen scaffold: safe-area canvas with optional scroll + pull-to-refresh.
import { ReactNode, RefObject } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { spacing, type Palette } from '../../theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  grouped?: boolean;
  contentStyle?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: readonly Edge[];
  padded?: boolean;
  scrollRef?: RefObject<ScrollView>;
}

export function Screen({
  children,
  scroll,
  grouped,
  contentStyle,
  refreshing,
  onRefresh,
  edges = [],
  padded = true,
  scrollRef,
}: ScreenProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bg = grouped ? colors.groupedBg : colors.bg;
  const pad = padded ? styles.padded : null;

  const inner = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[styles.content, pad, contentStyle]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondaryLabel}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.fill, pad, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.fill, { backgroundColor: bg }]}>
      {inner}
    </SafeAreaView>
  );
}

const makeStyles = (_c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    content: { paddingBottom: spacing.huge },
    padded: { paddingHorizontal: spacing.xl },
  });
