import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Link2, Send } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { apiRequest } from '@/lib/api-client';

export default function SubmitScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [clipUrl, setClipUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const trimmed = clipUrl.trim();
    if (!trimmed) return;

    // Basic URL validation for Twitch clips
    if (!trimmed.includes('twitch.tv') && !trimmed.includes('clips.twitch.tv')) {
      Alert.alert('Invalid URL', 'Please enter a valid Twitch clip URL');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/clips/request', {
        method: 'POST',
        body: { url: trimmed },
      });
      Alert.alert('Submitted!', 'Your clip has been submitted for processing.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit clip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [clipUrl, router]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Submit Clip' }} />
        <View style={styles.signInPrompt}>
          <Text style={styles.signInText}>Sign in to submit clips</Text>
          <Pressable style={styles.signInBtn} onPress={() => router.push('/auth/login' as any)}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Submit Clip' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.inputSection}>
          <Text style={styles.label}>Twitch Clip URL</Text>
          <View style={styles.inputRow}>
            <Link2 size={18} color={Colors.dark.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="https://clips.twitch.tv/..."
              placeholderTextColor={Colors.dark.textMuted}
              value={clipUrl}
              onChangeText={setClipUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <Text style={styles.hint}>
            Paste a Twitch clip URL to submit it to the community
          </Text>
        </View>

        <Pressable
          style={[styles.submitBtn, (!clipUrl.trim() || isSubmitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!clipUrl.trim() || isSubmitting}
        >
          <Send size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Submitting...' : 'Submit Clip'}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    padding: 16,
    gap: 24,
  },
  signInPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  signInText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600',
  },
  signInBtn: {
    backgroundColor: Colors.dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    gap: 8,
  },
  label: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  input: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    height: '100%',
  },
  hint: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dark.accent,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
