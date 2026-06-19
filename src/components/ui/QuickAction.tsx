// Small action tile: hierarchical SF Symbol over a tiny label.
// Accent color is reserved for the interactive glyph.
import { ComponentProps } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { PressableScale } from './PressableScale';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

interface Props {
  icon: SymbolName;
  label: string;
  color?: string;
  onPress?: () => void;
}

export function QuickAction({ icon, label, color, onPress }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} scaleTo={0.95} style={styles.btn}>
      <SymbolView name={icon} size={24} tintColor={color ?? colors.tint} type="hierarchical" />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    btn: {
      flex: 1,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.xs,
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 70,
      ...cardSurface(c),
    },
    label: { ...font.caption, color: c.label, fontSize: 11.5 },
  });
