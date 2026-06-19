// src/components/ChildCard.tsx — collapsible per-child card with quick-links.
import { ComponentProps, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Avatar, Card, ListRow, PressableScale, StatusPill } from './ui';
import type { Kid } from '../lib/aula-context';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { font, spacing, tint, type Palette } from '../theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export interface QuickLink {
  icon: SymbolName;
  label: string;
  color?: string;
  onPress: () => void;
}

interface Props {
  kid: Kid;
  subtitle: string;
  statusLabel?: string;
  statusColor?: string;
  links: QuickLink[];
}

export function ChildCard({ kid, subtitle, statusLabel, statusColor, links }: Props) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dark = colors.scheme === 'dark';

  return (
    <Card padded={false} style={styles.card}>
      <PressableScale onPress={() => setOpen((o) => !o)} scaleTo={0.98} style={styles.header}>
        <Avatar uri={kid.pictureUrl} name={kid.name} size={48} color={kid.color} />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {kid.firstName}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {statusLabel ? <StatusPill color={statusColor} label={statusLabel} /> : null}
        <SymbolView
          name={open ? 'chevron.up' : 'chevron.down'}
          size={14}
          tintColor={colors.tertiaryLabel}
        />
      </PressableScale>

      {open ? (
        <Animated.View entering={FadeIn.duration(180)} style={styles.links}>
          {links.map((l, i) => {
            const accent = l.color ?? colors.tint;
            const iconFg = dark ? tint(accent, 0.35) : accent;
            const iconBg = accent + (dark ? '30' : '1A');
            return (
              <View key={l.label} style={i > 0 ? styles.divider : undefined}>
                <ListRow
                  title={l.label}
                  onPress={l.onPress}
                  chevron
                  leading={
                    <View style={[styles.icon, { backgroundColor: iconBg }]}>
                      <SymbolView name={l.icon} size={16} tintColor={iconFg} type="hierarchical" />
                    </View>
                  }
                />
              </View>
            );
          })}
        </Animated.View>
      ) : null}
    </Card>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { marginBottom: spacing.md },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.xl,
    },
    headerText: { flex: 1, minWidth: 0 },
    name: { ...font.title3, color: c.label },
    sub: { ...font.footnote, color: c.secondaryLabel, marginTop: 2 },
    links: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.separator },
    icon: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
