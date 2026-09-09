import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';

import { Button, Field, Screen, Wordmark } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors } from '@/theme';

/**
 * Email and password. No emails are sent at any point: the session listener
 * in lib/auth takes over the moment either call returns a session.
 */
export default function SignIn() {
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'in' | 'up' | null>(null);

  const validate = () => {
    const address = email.trim().toLowerCase();
    if (!address.includes('@')) {
      setError('That does not look like an email address.');
      return null;
    }
    if (password.length < 8) {
      setError('Password needs to be at least 8 characters.');
      return null;
    }
    setError(null);
    return address;
  };

  const signIn = async () => {
    const address = validate();
    if (!address) return;
    setBusy('in');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
    setBusy(null);
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Wrong email or password. New here? Create an account below.'
          : signInError.message
      );
    }
  };

  const createAccount = async () => {
    const address = validate();
    if (!address) return;
    setBusy('up');
    const { data, error: signUpError } = await supabase.auth.signUp({ email: address, password });
    setBusy(null);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setError('Account created, but email confirmation is still on in Supabase. Turn it off and sign in.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1 px-6" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-center gap-8">
          <View className="items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.ink }}>
              <Wordmark size={18} color={colors.canvas} />
            </View>
            <Text className="text-ink font-display text-[32px]" style={{ letterSpacing: -0.8 }}>
              Log in or sign up
            </Text>
          </View>

          <View className="gap-3">
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              inputMode="email"
              textContentType="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Field
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              error={error}
              placeholder="Password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void signIn()}
            />
            <Button label="Continue" onPress={() => void signIn()} loading={busy === 'in'} disabled={busy === 'up'} />
            <Text className="text-ink-soft py-1 text-center text-[15px]">or</Text>
            <Button label="Create an account" variant="outline" onPress={() => void createAccount()} loading={busy === 'up'} disabled={busy === 'in'} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
