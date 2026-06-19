// src/app/(app)/besked/[id].tsx — Message thread detail
import { Fragment, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { Stack, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getMessagesForThread, sendMessageToThread } from '../../../lib/aula-api';
import { useAula } from '../../../lib/aula-context';
import { capitalizeFirst, messageText } from '../../../lib/format';
import type { AulaMessage } from '../../../lib/aula-types';
import { Avatar, PressableScale, Skeleton } from '../../../components/ui';
import { useTheme, useThemedStyles } from '../../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../../theme';
import { personColor } from '../../../theme/childColors';

function senderName(m: AulaMessage): string {
  return m.sender?.fullName ?? m.sender?.mailBoxOwner?.fullName ?? 'Ukendt';
}

/** Local-calendar-day key, used to detect day changes between messages. */
function dayKey(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 'I dag' / 'I går' / 'tirsdag 9. juni' — rendered uppercase via font.eyebrow. */
function dayLabel(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThat = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfThat) / 86_400_000);
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  return capitalizeFirst(d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }));
}

/** Clock time like '14.32' (Danish convention). */
function clockTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guardian } = useAula();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [messages, setMessages] = useState<AulaMessage[]>([]);
  const [subject, setSubject] = useState('Besked');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await getMessagesForThread(id);
      setMessages(
        (res.data?.messages ?? []).filter((m) => (m.messageType ?? 'Message') === 'Message'),
      );
      if (res.data?.subject) setSubject(res.data.subject);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Kunne ikke hente besked';
      setError(
        msg.includes('403')
          ? 'Det her er en følsom besked. Åbn Aula med MitID for at læse den.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleSend() {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await sendMessageToThread(id, text);
      setReply('');
      await load();
    } catch (e) {
      Alert.alert('Fejl', e instanceof Error ? e.message : 'Kunne ikke sende besked');
    } finally {
      setSending(false);
    }
  }

  function isMine(m: AulaMessage): boolean {
    if (!guardian?.name) return false;
    return senderName(m).toLowerCase() === guardian.name.toLowerCase();
  }

  return (
    <View style={styles.fill}>
      <Stack.Screen options={{ title: subject }} />
      {loading ? (
        <View style={styles.skelWrap}>
          <Skeleton width={120} height={14} radius={7} style={styles.skelCenter} />
          <Skeleton width={150} height={38} radius={18} style={styles.skelLeft} />
          <Skeleton width={230} height={58} radius={18} style={styles.skelLeft} />
          <Skeleton width={190} height={44} radius={18} style={styles.skelRight} />
          <Skeleton width={250} height={66} radius={18} style={styles.skelLeft} />
          <Skeleton width={130} height={38} radius={18} style={styles.skelRight} />
        </View>
      ) : error ? (
        <View style={styles.stateWrap}>
          <View style={styles.stateIcon}>
            <SymbolView
              name={error.includes('følsom') ? 'lock' : 'exclamationmark.bubble'}
              size={28}
              tintColor={colors.secondaryLabel}
            />
          </View>
          <Text style={styles.stateTitle}>
            {error.includes('følsom') ? 'Følsom besked' : 'Noget gik galt'}
          </Text>
          <Text style={styles.stateHint}>{error}</Text>
          <PressableScale scaleTo={0.96} style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Prøv igen</Text>
          </PressableScale>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {messages.length === 0 ? (
              <View style={styles.stateWrap}>
                <View style={styles.stateIcon}>
                  <SymbolView name="bubble.left" size={28} tintColor={colors.secondaryLabel} />
                </View>
                <Text style={styles.stateTitle}>Ingen beskeder</Text>
                <Text style={styles.stateHint}>Tråden er tom — skriv den første besked nedenfor.</Text>
              </View>
            ) : null}
            {messages.map((m, i) => {
              const mine = isMine(m);
              const name = senderName(m);
              const prev = i > 0 ? messages[i - 1] : null;
              const next = i < messages.length - 1 ? messages[i + 1] : null;
              const newDay = !prev || dayKey(prev.sendDateTime) !== dayKey(m.sendDateTime);
              // A "run" = consecutive messages from the same sender on the same day.
              const firstOfRun = newDay || !prev || senderName(prev) !== name;
              const lastOfRun =
                !next ||
                dayKey(next.sendDateTime) !== dayKey(m.sendDateTime) ||
                senderName(next) !== name;
              return (
                <Fragment key={String(m.id) + i}>
                  {newDay ? (
                    <Text style={styles.daySep}>{dayLabel(m.sendDateTime)}</Text>
                  ) : null}
                  <Animated.View
                    entering={FadeInDown.duration(280).delay(Math.min(i, 8) * 40)}
                    style={[
                      styles.row,
                      mine ? styles.rowMine : styles.rowOther,
                      lastOfRun && styles.rowRunEnd,
                    ]}
                  >
                    {!mine ? (
                      lastOfRun ? (
                        <View style={styles.avatar}>
                          <Avatar name={name} size={30} color={personColor(undefined, name)} />
                        </View>
                      ) : (
                        <View style={styles.avatarSpacer} />
                      )
                    ) : null}
                    <View style={[styles.msgCol, mine && styles.msgColMine]}>
                      {!mine && firstOfRun ? (
                        <Text style={styles.senderLabel}>{name}</Text>
                      ) : null}
                      <View
                        style={[
                          styles.bubble,
                          mine ? styles.bubbleMine : styles.bubbleOther,
                          mine && lastOfRun && styles.tailMine,
                          !mine && lastOfRun && styles.tailOther,
                        ]}
                      >
                        <Text style={[styles.bubbleText, mine ? styles.textMine : styles.textOther]}>
                          {messageText(m.text)}
                        </Text>
                      </View>
                      {lastOfRun ? (
                        <Text style={[styles.timestamp, mine ? styles.tsRight : styles.tsLeft]}>
                          {clockTime(m.sendDateTime)}
                        </Text>
                      ) : null}
                    </View>
                  </Animated.View>
                </Fragment>
              );
            })}
          </ScrollView>

          {/* Reply input */}
          <SafeAreaView style={styles.inputBar} edges={['bottom']}>
            <TextInput
              style={styles.input}
              placeholder="Besked…"
              placeholderTextColor={colors.tertiaryLabel}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <PressableScale
              scaleTo={0.92}
              onPress={handleSend}
              disabled={!reply.trim() || sending}
              hitSlop={10}
              style={styles.sendBtn}
              accessibilityLabel="Send"
            >
              <SymbolView
                name="arrow.up.circle.fill"
                size={32}
                tintColor={reply.trim() && !sending ? colors.tint : colors.tertiaryLabel}
              />
            </PressableScale>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    content: { paddingTop: spacing.sm, paddingBottom: spacing.md },
    daySep: {
      ...font.eyebrow,
      color: c.tertiaryLabel,
      textAlign: 'center',
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      marginBottom: 2,
    },
    rowRunEnd: { marginBottom: spacing.lg },
    rowMine: { justifyContent: 'flex-end' },
    rowOther: { justifyContent: 'flex-start' },
    avatar: { marginBottom: 19 },
    avatarSpacer: { width: 30 },
    msgCol: { maxWidth: '75%', gap: 3 },
    msgColMine: { alignItems: 'flex-end' },
    senderLabel: {
      ...font.caption,
      color: c.secondaryLabel,
      marginLeft: spacing.md,
      marginTop: spacing.xs,
    },
    bubble: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleMine: { backgroundColor: c.tint, alignSelf: 'flex-end' },
    bubbleOther: {
      backgroundColor: c.scheme === 'light' ? c.card : c.fill,
      alignSelf: 'flex-start',
    },
    tailMine: { borderBottomRightRadius: 4 },
    tailOther: { borderBottomLeftRadius: 4 },
    bubbleText: { ...font.body, lineHeight: 21 },
    textMine: { color: c.onTint },
    textOther: { color: c.label },
    timestamp: { ...font.caption, color: c.tertiaryLabel },
    tsRight: { textAlign: 'right', marginRight: 4 },
    tsLeft: { textAlign: 'left', marginLeft: spacing.md },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.sm,
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.separator,
    },
    input: {
      flex: 1,
      ...font.body,
      color: c.label,
      backgroundColor: c.groupedBg,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 10,
      maxHeight: 120,
      minHeight: 42,
    },
    sendBtn: { paddingBottom: 5 },
    skelWrap: { flex: 1, padding: spacing.lg, gap: spacing.md, paddingTop: spacing.xl },
    skelCenter: { alignSelf: 'center', marginBottom: spacing.md },
    skelLeft: { alignSelf: 'flex-start' },
    skelRight: { alignSelf: 'flex-end' },
    stateWrap: {
      alignItems: 'center',
      paddingVertical: spacing.huge,
      paddingHorizontal: spacing.xxl,
      gap: spacing.sm,
    },
    stateIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.fill,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    stateTitle: { ...font.title3, color: c.label },
    stateHint: {
      ...font.footnote,
      color: c.secondaryLabel,
      textAlign: 'center',
      maxWidth: 280,
    },
    retryBtn: {
      marginTop: spacing.md,
      backgroundColor: c.fill,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radius.pill,
    },
    retryText: { ...font.headline, color: c.tint },
  });
