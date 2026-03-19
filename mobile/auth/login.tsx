import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import Colors from '@/constants/colors';
import ENV from '@/constants/env';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const { login } = useAuth();

  const handleTwitchLogin = useCallback(async () => {
    const authUrl = `${ENV.API_URL}/api/${ENV.API_VERSION}/auth/twitch`;
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      'clipper://auth/callback',
    );

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      if (accessToken && refreshToken) {
        await login(accessToken, refreshToken);
      }
    }
  }, [login]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <Text style={styles.logo}>Clipper</Text>
        <Text style={styles.subtitle}>The best Twitch clips, curated by the community</Text>

        <Pressable style={styles.twitchBtn} onPress={handleTwitchLogin}>
          <Text style={styles.twitchBtnText}>Sign in with Twitch</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          By signing in, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  logo: {
    color: Colors.dark.accent,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.dark.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  twitchBtn: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  twitchBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
