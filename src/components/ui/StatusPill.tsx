// Small status indicator: dot + label on a translucent tinted pill.
// Text is lightened in dark mode for contrast on near-black surfaces.
import { StyleSheet, Text, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { font, radius, tint, type Palette } from '../../theme';

interface Props {
  color?: string;
  label: string;
}

export function StatusPill({ color, label }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dark = colors.scheme === 'dark';
  const accent = color ?? colors.green;
  const fg = dark ? tint(accent, 0.35) : accent;
  const bg = accent + (dark ? '2E' : '1A');

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (_c: Palette) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: radius.pill,
      alignSelf: 'center',
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    label: { ...font.caption, fontWeight: '600', letterSpacing: 0.2 },
  });
