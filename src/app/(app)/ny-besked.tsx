// src/app/(app)/ny-besked.tsx — Compose a new message thread
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { router, Stack } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { cardSurface, font, radius, spacing, type Palette } from '../../theme';

export default function ComposeScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!recipient.trim() || !subject.trim() || !body.trim()) {
      Alert.alert('Mangler info', 'Udfyld modtager, emne og besked.');
      return;
    }
    setSending(true);
    try {
      // TODO: implement messaging.createThread API call with proper recipient lookup.
      // The Aula API requires a mailbox ID for recipients, which needs a separate
      // recipient-search call. For now, show a helpful message.
      Alert.alert(
        'Ikke implementeret endnu',
        'Oprettelse af nye beskedtråde kræver opslag af modtager-ID via Aula API.\n\nBrug Aula-appen til at starte nye tråde — du kan svare på eksisterende tråde her.',
        [{ text: 'OK' }],
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.fill}>
      <Stack.Screen
        options={{
          title: 'Ny besked',
          headerRight: () => (
            <Pressable onPress={handleSend} disabled={sending} hitSlop={10}>
              <Text style={[styles.sendText, sending && styles.sendDisabled]}>Send</Text>
            </Pressable>
          ),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.cancelText}>Annuller</Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(300)}>
            <Text style={styles.eyebrow}>Modtager</Text>
            <View style={styles.card}>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Til</Text>
                <TextInput
                  style={styles.input}
                  value={recipient}
                  onChangeText={setRecipient}
                  placeholder="Modtagerens navn"
                  placeholderTextColor={colors.tertiaryLabel}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
              <View style={styles.cardSep} />
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Emne</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Emnelinje"
                  placeholderTextColor={colors.tertiaryLabel}
                  returnKeyType="next"
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(300).delay(60)}>
            <Text style={styles.eyebrow}>Besked</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.bodyInput}
                value={body}
                onChangeText={setBody}
                placeholder="Skriv din besked her…"
                placeholderTextColor={colors.tertiaryLabel}
                multiline
                textAlignVertical="top"
              />
            </View>
            <View style={styles.hintRow}>
              <SymbolView name="info.circle" size={14} tintColor={colors.tertiaryLabel} />
              <Text style={styles.hint}>
                Nye tråde kan endnu ikke oprettes her — du kan svare på eksisterende tråde under
                Beskeder.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        <SafeAreaView edges={['bottom']} />
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    flex: { flex: 1 },
    sendText: { ...font.headline, color: c.tint },
    sendDisabled: { color: c.tertiaryLabel },
    cancelText: { ...font.body, color: c.tint },
    form: { paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
    eyebrow: {
      ...font.eyebrow,
      color: c.secondaryLabel,
      marginTop: spacing.xxl,
      marginBottom: spacing.sm,
    },
    card: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xs,
      ...cardSurface(c),
    },
    fieldRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      gap: spacing.md,
    },
    label: { ...font.subhead, color: c.secondaryLabel, width: 56 },
    input: { flex: 1, ...font.body, color: c.label, paddingVertical: 0 },
    cardSep: { height: StyleSheet.hairlineWidth, backgroundColor: c.separator },
    bodyInput: {
      ...font.body,
      color: c.label,
      lineHeight: 24,
      minHeight: 200,
      paddingVertical: spacing.md,
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    hint: { ...font.footnote, color: c.tertiaryLabel, flex: 1 },
  });
