import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { PressableScale } from './ui/PressableScale';
import { useTheme, useThemedStyles } from '../theme/ThemeContext';
import { font, spacing, type Palette } from '../theme';

interface Props {
  url: string;
  callbackUrl: string;
  onCodeCaptured: (code: string) => void;
  onCancel: () => void;
}

/**
 * Modal WebView that runs the MitID OAuth flow and captures the authorization
 * code from the redirect to `callbackUrl` (app-private.aula.dk).
 *
 * We must intercept the callback in `onShouldStartLoadWithRequest` and return
 * `false` BEFORE the navigation commits — otherwise iOS Universal Links hand
 * the URL to the official Aula app instead of letting us read the `code`.
 */
export function OAuthWebView({ url, callbackUrl, onCodeCaptured, onCancel }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(true);
  const codeCapturedRef = useRef(false);

  const handleShouldStartLoad = ({ url: reqUrl }: { url: string }) => {
    if (reqUrl.startsWith(callbackUrl) && !codeCapturedRef.current) {
      const code = new URL(reqUrl).searchParams.get('code');
      if (code) {
        codeCapturedRef.current = true;
        onCodeCaptured(code);
        return false; // block navigation so Universal Links don't fire
      }
    }
    // Open non-http schemes (e.g. mitid://) in the system handler.
    if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) {
      Linking.openURL(reqUrl).catch(() => {});
      return false;
    }
    return true;
  };

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.spacer} />
          <Text style={styles.title}>Log ind</Text>
          <PressableScale onPress={onCancel} scaleTo={0.92} hitSlop={10} style={styles.cancelBtn}>
            <Text style={styles.cancel}>Annuller</Text>
          </PressableScale>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.secondaryLabel} />
          </View>
        )}
        <WebView
          source={{ uri: url }}
          style={styles.webView}
          onShouldStartLoadWithRequest={handleShouldStartLoad}
          onLoadEnd={() => setLoading(false)}
          onLoadStart={() => setLoading(true)}
        />
      </SafeAreaView>
    </Modal>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.card },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.separator,
    },
    spacer: { width: 64 },
    title: { ...font.headline, color: c.label },
    cancelBtn: { width: 64, alignItems: 'flex-end' },
    cancel: { ...font.body, color: c.tint },
    webView: { flex: 1 },
    loadingOverlay: {
      position: 'absolute',
      top: 60,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.card,
      zIndex: 10,
    },
  });
