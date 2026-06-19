// Standard list row: leading slot, title/subtitle, unread dot, trailing
// slot, optional chevron. Spring-scale touch feedback.
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { PressableScale } from './PressableScale';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { font, spacing, type Palette } from '../../theme';

interface Props {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  unread?: boolean;
}

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  chevron,
  unread,
}: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={styles.row}>
      {leading}
      <View style={styles.mid}>
        <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {unread ? <View style={styles.unread} /> : null}
      {trailing}
      {chevron ? (
        <SymbolView name="chevron.right" size={13} tintColor={colors.tertiaryLabel} />
      ) : null}
    </PressableScale>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.md + 2,
    },
    mid: { flex: 1, minWidth: 0 },
    title: { ...font.headline, color: c.label },
    titleUnread: { fontWeight: '800' },
    sub: { ...font.footnote, color: c.secondaryLabel, marginTop: 2 },
    unread: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.tint },
  });
