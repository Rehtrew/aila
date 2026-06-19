// Compact per-child card for grid layouts: ringed avatar, first name,
// status or subtitle. Spring-scale touch feedback.
import { StyleSheet, Text } from 'react-native';
import { Avatar } from './Avatar';
import { StatusPill } from './StatusPill';
import { PressableScale } from './PressableScale';
import { useThemedStyles } from '../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../theme';

interface Props {
  name: string;
  subtitle?: string;
  uri?: string | null;
  color: string;
  statusColor?: string;
  statusLabel?: string;
  onPress?: () => void;
}

export function ChildChip({
  name,
  subtitle,
  uri,
  color,
  statusColor,
  statusLabel,
  onPress,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.chip}>
      <Avatar uri={uri} name={name} size={52} color={color} />
      <Text style={styles.name} numberOfLines={1}>
        {name.split(' ')[0]}
      </Text>
      {statusLabel ? (
        <StatusPill color={statusColor} label={statusLabel} />
      ) : subtitle ? (
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </PressableScale>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    chip: {
      flex: 1,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      gap: spacing.sm,
      ...cardSurface(c),
    },
    name: { ...font.subhead, fontWeight: '600', color: c.label },
    sub: { ...font.caption, color: c.secondaryLabel },
  });
