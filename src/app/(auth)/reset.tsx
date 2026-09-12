import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';

import { Body, Button, Field, Heading, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/**
 * Forgot password, without a link to click. Supabase emails a six-digit
 * code (the "Reset password" template must include {{ .Token }}); the code
 * signs you in as a recovery session and you set a new password.
 */
export default function ResetPassword() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    const address = email.trim().toLowerCase();
    if (!address.includes('@')) {
      setError('That does not look like an email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.resetPasswordForEmail(address);
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    setStep('code');
  };

  const checkCode = async () => {
    if (code.trim().length < 6) {
      setError('The code is six digits.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'recovery' });
    setBusy(false);
    if (e) {
      setError(e.message.includes('expired') || e.message.includes('invalid') ? 'That code is wrong or has expired. Send another.' : e.message);
      return;
    }
    setStep('password');
  };

  const savePassword = async () => {
    if (password.length < 8) {
      setError('Password needs to be at least 8 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (e) {
      setError(e.message);
      return;
    }
    // The recovery session is a real session: the auth redirect takes over.
    router.replace('/');
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1 px-6" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 justify-center gap-8">
          <View className="gap-3">
            <Heading>{step === 'email' ? 'Forgot your password?' : step === 'code' ? 'Check your email' : 'Pick a new password'}</Heading>
            <Body>
              {step === 'email'
                ? 'We will email you a six-digit code.'
                : step === 'code'
                  ? `We sent a code to ${email.trim().toLowerCase()}. It lasts an hour.`
                  : 'Eight characters or more. You will stay signed in.'}
            </Body>
          </View>

          <View className="gap-3">
            {step === 'email' ? (
              <>
                <Field value={email} onChangeText={setEmail} error={error} placeholder="Email" autoCapitalize="none" autoComplete="email" autoCorrect={false} keyboardType="email-address" inputMode="email" returnKeyType="go" onSubmitEditing={() => void sendCode()} autoFocus />
                <Button label="Send me a code" onPress={() => void sendCode()} loading={busy} />
              </>
            ) : step === 'code' ? (
              <>
                <Field value={code} onChangeText={setCode} error={error} placeholder="123456" keyboardType="number-pad" inputMode="numeric" autoComplete="one-time-code" maxLength={6} returnKeyType="go" onSubmitEditing={() => void checkCode()} autoFocus />
                <Button label="Continue" onPress={() => void checkCode()} loading={busy} disabled={code.trim().length < 6} />
                <Pressable onPress={() => void sendCode()} className="items-center py-2">
                  <Text className="text-you text-[15px] font-bold">Send another code</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Field value={password} onChangeText={setPassword} error={error} placeholder="New password" secureTextEntry autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" onSubmitEditing={() => void savePassword()} autoFocus />
                <Button label="Save and sign in" onPress={() => void savePassword()} loading={busy} />
              </>
            )}
            <Pressable onPress={() => router.back()} className="items-center py-2">
              <Text className="text-ink-soft text-[15px] font-semibold">Back to sign in</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
