// Error / empty / loading states. Icon in a 64pt soft circle, confident
// title, one quiet hint line. Loading renders skeleton ghost-cards that
// approximate real list rows — never a spinner.
import { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

interface StateIconProps {
  icon: SymbolName;
}

function StateIcon({ icon }: StateIconProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.iconCircle}>
      <SymbolView name={icon} size={28} tintColor={colors.secondaryLabel} type="hierarchical" />
    </View>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  /** Optional SF Symbol override. */
  icon?: SymbolName;
  /** Optional quiet secondary line under the message. */
  hint?: string;
}

export function ErrorState({
  message,
  onRetry,
  icon = 'wifi.exclamationmark',
  hint = 'Kontrollér din forbindelse, og prøv igen.',
}: ErrorStateProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <StateIcon icon={icon} />
      <Text style={styles.title}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {onRetry ? (
        <PressableScale onPress={onRetry} scaleTo={0.96} style={styles.retryBtn}>
          <Text style={styles.retryText}>Prøv igen</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

interface EmptyStateProps {
  message: string;
  /** Optional SF Symbol override. */
  icon?: SymbolName;
  /** Optional quiet secondary line under the message. */
  hint?: string;
}

export function EmptyState({ message, icon = 'tray', hint }: EmptyStateProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <StateIcon icon={icon} />
      <Text style={styles.title}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function GhostCard() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.ghostCard}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={styles.ghostLines}>
        <Skeleton width="58%" height={14} />
        <Skeleton width="84%" height={11} />
      </View>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View
      style={styles.loadingWrap}
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? 'Indlæser'}
    >
      <GhostCard />
      <GhostCard />
      <GhostCard />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxxl,
      paddingVertical: spacing.huge,
      minHeight: 220,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: { ...font.title3, color: c.label, textAlign: 'center' },
    hint: {
      ...font.footnote,
      color: c.secondaryLabel,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    retryBtn: {
      marginTop: spacing.xxl,
      backgroundColor: c.label,
      paddingHorizontal: spacing.xxxl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    retryText: { ...font.headline, color: c.bg },
    loadingWrap: {
      flex: 1,
      paddingVertical: spacing.lg,
      gap: spacing.md,
    },
    ghostCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: c.card,
      borderRadius: radius.lg,
      padding: spacing.xl,
      borderWidth: c.scheme === 'dark' ? StyleSheet.hairlineWidth : 0,
      borderColor: c.separator,
    },
    ghostLines: { flex: 1, gap: spacing.sm },
  });
