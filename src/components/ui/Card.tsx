// Elevated surface — soft shadow in light, hairline border in dark.
// Tappable cards get the standard spring-scale feedback.
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { PressableScale } from './PressableScale';
import { useThemedStyles } from '../../theme/ThemeContext';
import { cardSurface, radius, spacing, type Palette } from '../../theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ children, style, onPress, padded = true }: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const cardStyle = [styles.card, padded && styles.padded, style];

  if (onPress) {
    return (
      <PressableScale onPress={onPress} scaleTo={0.98} style={cardStyle}>
        {children}
      </PressableScale>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { borderRadius: radius.lg, ...cardSurface(c) },
    padded: { padding: spacing.xl },
  });
