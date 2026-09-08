import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput, View } from 'react-native';

import { Body, Button, Field, Heading, Screen, Wordmark } from '@/components/ui';
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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    setBusy(null);
    if (signInError) {
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'Wrong email or password. New here? Use Create account.'
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
    // No session back means the project still has "Confirm email" switched
    // on in Supabase. Say so plainly rather than leaving a dead button.
    if (!data.session) {
      setError('Account created, but email confirmation is still on in Supabase. Turn it off and sign in.');
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        className="flex-1 justify-between px-6 py-8"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="gap-3 pt-16">
          <Wordmark size={40} color={colors.ale} />
          <Heading>Your London, one pub at a time.</Heading>
          <Body>Log the pubs you go to. Turn boroughs gold. See where your mates have been.</Body>
        </View>

        <View className="gap-5">
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
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
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={error}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={() => void signIn()}
          />
          <Button label="Sign in" onPress={() => void signIn()} loading={busy === 'in'} disabled={busy === 'up'} />
          <Button
            label="Create account"
            variant="quiet"
            onPress={() => void createAccount()}
            loading={busy === 'up'}
            disabled={busy === 'in'}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
