// Avatar with image or initials fallback. Initials adapt to the active
// scheme: pastel fill + saturated text in light, translucent fill +
// lightened text in dark.
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { tint } from '../../theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  color?: string;
  ring?: boolean;
}

function initialsOf(name?: string): string {
  return (name ?? '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ uri, name, size = 40, color, ring }: AvatarProps) {
  const { colors } = useTheme();
  const accent = color ?? colors.tint;
  const r = size / 2;
  const ringStyle = ring ? { borderWidth: 2, borderColor: accent } : null;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          { width: size, height: size, borderRadius: r, backgroundColor: colors.fill },
          ringStyle,
        ]}
        contentFit="cover"
        transition={150}
      />
    );
  }

  const dark = colors.scheme === 'dark';
  const bg = dark ? accent + '33' : tint(accent, 0.86);
  const fg = dark ? tint(accent, 0.4) : accent;

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: r, backgroundColor: bg },
        ringStyle,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4, color: fg }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '600' },
});
