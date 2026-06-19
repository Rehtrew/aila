// src/app/(auth)/login.tsx — Brand moment: calm canvas, big wordmark, one
// confident monochrome MitID button. All auth wiring unchanged.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AULA_OAUTH } from '../../constants/aula';
import { buildAuthUrl, exchangeCodeForTokens } from '../../lib/auth';
import { OAuthWebView } from '../../components/OAuthWebView';
import { PressableScale } from '../../components/ui/PressableScale';
import { useTheme, useThemedStyles } from '../../theme/ThemeContext';
import { font, radius, spacing, type Palette } from '../../theme';

interface OAuthSession {
  url: string;
  codeVerifier: string;
}

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthSession, setOAuthSession] = useState<OAuthSession | null>(null);
  const codeVerifierRef = useRef<string>('');

  async function handleLogin() {
    setLoading(true);
    setError(null);
    try {
      const session = await buildAuthUrl();
      codeVerifierRef.current = session.codeVerifier;
      setOAuthSession(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login fejlede');
      setLoading(false);
    }
  }

  // The WebView captures the OAuth code; we exchange it for tokens (stored in
  // SecureStore) and head to the home screen. API calls are plain native fetch
  // with the access_token — no session cookies needed (Aula API v23).
  async function handleCodeCaptured(code: string) {
    setOAuthSession(null);
    try {
      await exchangeCodeForTokens(code, codeVerifierRef.current);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Token-udveksling fejlede');
      setLoading(false);
    }
  }

  function handleOAuthCancel() {
    setOAuthSession(null);
    setLoading(false);
  }

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Animated.View entering={FadeInDown.duration(450)} style={styles.brand}>
          <Text style={styles.eyebrow}>Aula for forældre</Text>
          <Text style={styles.wordmark}>Aila</Text>
          <Text style={styles.value}>
            Opslag, beskeder og billeder fra dit barns hverdag — samlet ét sted.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(450).delay(140)} style={styles.bottom}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PressableScale
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            scaleTo={0.98}
          >
            {loading ? (
              <ActivityIndicator color={colors.bg} />
            ) : (
              <Text style={styles.buttonText}>Log ind med MitID</Text>
            )}
          </PressableScale>
          <Text style={styles.hint}>Du logger sikkert ind via Aula med MitID.</Text>
        </Animated.View>
      </SafeAreaView>

      {oauthSession && (
        <OAuthWebView
          url={oauthSession.url}
          callbackUrl={AULA_OAUTH.redirectUri}
          onCodeCaptured={handleCodeCaptured}
          onCancel={handleOAuthCancel}
        />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    safe: { flex: 1, paddingHorizontal: spacing.xxl },
    brand: { flex: 1, justifyContent: 'center' },
    eyebrow: { ...font.eyebrow, color: c.secondaryLabel, marginBottom: spacing.md },
    wordmark: { ...font.display, fontSize: 56, color: c.label },
    value: {
      ...font.footnote,
      color: c.secondaryLabel,
      lineHeight: 19,
      marginTop: spacing.lg,
      maxWidth: 280,
    },
    bottom: { paddingBottom: spacing.lg },
    error: {
      ...font.footnote,
      color: c.red,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    button: {
      backgroundColor: c.label,
      borderRadius: radius.pill,
      paddingVertical: 17,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 54,
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { ...font.headline, color: c.bg },
    hint: {
      ...font.caption,
      color: c.tertiaryLabel,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
