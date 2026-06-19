// Small tracked-uppercase pill used to tag feed items with the
// child/context they belong to. Scheme-aware tinting.
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { font, radius, tint } from '../../theme';

interface Props {
  label: string;
  color: string;
}

export function Tag({ label, color }: Props) {
  const { colors } = useTheme();
  const dark = colors.scheme === 'dark';
  const fg = dark ? tint(color, 0.4) : color;
  const bg = color + (dark ? '2E' : '1A');

  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      <Text style={[styles.txt, { color: fg }]} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  txt: { ...font.caption, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
});
