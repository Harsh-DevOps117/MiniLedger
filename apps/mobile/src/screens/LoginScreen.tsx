import { Feather } from '@expo/vector-icons';
import { phoneSchema, verifyOtpSchema } from '@miniledger/contracts';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { KeyboardFormScrollView } from '../components/KeyboardFormScrollView';
import { AppText as Text } from '../components/Typography';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/format';
import { colors, headingFont, ui } from '../theme';

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { api, signIn, notice } = useAuth();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function sendCode() {
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await api.requestOtp(parsed.data);
      setPhone(parsed.data);
      setSent(true);
      setOtp('');
      setCooldown(result.retryAfterSeconds);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    const parsed = verifyOtpSchema.safeParse({ phone, otp });
    if (!parsed.success) {
      setError(parsed.error.issues[0]!.message);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signIn(await api.verifyOtp(parsed.data.phone, parsed.data.otp));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={ui.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled={Platform.OS !== 'web'}
      keyboardVerticalOffset={insets.top}
    >
      <KeyboardFormScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Feather name="book-open" size={23} color="white" />
          </View>
          <Text style={styles.brandName}>
            MiniLedger<Text style={{ color: colors.green }}>.</Text>
          </Text>
        </View>
        <View style={styles.card}>
          <View style={styles.eyebrow}>
            <View style={styles.dot} />
            <Text style={styles.eyebrowText}>A LITTLE CLARITY GOES A LONG WAY</Text>
          </View>
          <Text style={styles.headline}>Good friends.{'\n'}Clear accounts.</Text>
          <Text style={[ui.body, { marginTop: 14, marginBottom: 32 }]}>
            Keep track of what you lend, without keeping it all in your head.
          </Text>
          <Text style={styles.formTitle}>
            {sent ? 'Check your code' : 'Welcome to your ledger'}
          </Text>
          <Text style={[ui.body, { fontSize: 13, marginBottom: 24 }]}>
            {sent
              ? `Enter the 6-digit code for ${phone}.`
              : 'Sign in with your phone number to get started.'}
          </Text>
          {!sent ? (
            <Field
              label="Phone number"
              value={phone}
              onChangeText={setPhone}
              placeholder="+919876543210"
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!busy}
              onSubmitEditing={() => void sendCode()}
            />
          ) : (
            <Field
              label="Verification code"
              value={otp}
              onChangeText={setOtp}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              editable={!busy}
              onSubmitEditing={() => void verify()}
            />
          )}
          {(error || notice) && (
            <View style={ui.errorBox}>
              <Text accessibilityRole="alert" style={ui.error}>
                {error || notice}
              </Text>
            </View>
          )}
          <Button
            title={sent ? 'Verify & open ledger' : 'Send verification code'}
            busy={busy}
            onPress={() => void (sent ? verify() : sendCode())}
          />
          {sent && (
            <View style={[ui.between, { marginTop: 12 }]}>
              <Button
                title="Change number"
                variant="quiet"
                disabled={busy}
                onPress={() => {
                  setSent(false);
                  setError(null);
                }}
              />
              <Button
                title={cooldown ? `Resend in ${cooldown}s` : 'Resend code'}
                variant="quiet"
                disabled={busy || cooldown > 0}
                onPress={() => void sendCode()}
              />
            </View>
          )}
        </View>
        <Text style={styles.footer}>A small ledger. A little more peace of mind..</Text>
      </KeyboardFormScrollView>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 48,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 25, fontWeight: '700', color: colors.ink, letterSpacing: -1 },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.white,
    padding: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
  },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  eyebrowText: { fontSize: 9, letterSpacing: 1.3, fontWeight: '700', color: colors.green },
  headline: {
    fontFamily: headingFont,
    fontSize: 35,
    lineHeight: 49,
    letterSpacing: -1.3,
    color: colors.ink,
  },
  formTitle: { fontSize: 17, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  demo: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 22,
    marginTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoText: { flex: 1, color: colors.muted, fontSize: 12, lineHeight: 19 },
  footer: { marginTop: 26, fontSize: 12, color: colors.muted },
});
