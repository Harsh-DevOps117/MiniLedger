import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from '../components/Button';
import { AppText as Text } from '../components/Typography';
import { colors, ui } from '../theme';

const pages = [
  {
    eyebrow: 'A LITTLE LESS TO REMEMBER',
    title: 'Lend a hand.\nKeep a little record.',
    description:
      'A coffee, a shared ride, a little help. Save who you lent to, how much, and when it’s due — all in one place.',
    footnote: 'Friend, amount, due date. That’s all it takes.',
  },
  {
    eyebrow: 'A LITTLE MORE PEACE OF MIND',
    title: 'Clear accounts.\nGood friendships.',
    description:
      'See what’s lent, what’s repaid, and what’s overdue at a glance. When a friend pays you back, mark it settled.',
    footnote: 'Less mental maths. More peace of mind.',
  },
] as const;

/** Decorative sample ledger: no real balances or automatic reminders are implied. */
function LedgerPreview({ settled }: { settled: boolean }) {
  return (
    <View style={styles.illustration} accessible accessibilityLabel="Example ledger preview">
      <View style={styles.preview}>
        <View style={ui.between}>
          <Text style={styles.previewLabel}>
            {settled ? 'YOUR MONEY, AT A GLANCE' : 'YOUR LITTLE LEDGER'}
          </Text>
          <Feather name={settled ? 'pie-chart' : 'book-open'} size={20} color={colors.green} />
        </View>
        <Text style={styles.balance}>{settled ? '₹500' : '₹1,750'}</Text>
        <Text style={styles.caption}>
          {settled ? 'Still to come back' : 'Lent to good friends'}
        </Text>
        <View style={styles.rule} />
        <View style={styles.entry}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>A</Text>
          </View>
          <View style={styles.entryBody}>
            <Text style={styles.friend}>Aditi</Text>
            <Text style={styles.caption}>
              {settled ? 'All squared up' : 'For the weekend trip'}
            </Text>
          </View>
          <Text style={styles.amount}>₹1,250</Text>
        </View>
        <View style={[styles.badge, settled && styles.repaidBadge]}>
          <Feather name={settled ? 'check-circle' : 'calendar'} size={15} color={colors.green} />
          <Text style={styles.badgeText}>
            {settled ? 'Repayment recorded' : 'A due date, kept in sight'}
          </Text>
        </View>
        {settled && (
          <View style={styles.overdue}>
            <Feather name="clock" size={16} color={colors.red} />
            <Text style={styles.overdueText}>Rohan · ₹500 overdue</Text>
          </View>
        )}
      </View>
      <Text style={styles.example}>A PEEK AT YOUR LEDGER · SAMPLE DATA</Text>
    </View>
  );
}

export function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const page = pages[step]!;
  const isLast = step === pages.length - 1;

  return (
    <View style={ui.page}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Feather name="book-open" size={19} color={colors.white} />
            </View>
            <Text style={styles.brandName}>
              MiniLedger<Text style={{ color: colors.green }}>.</Text>
            </Text>
          </View>
          <Button title="Skip" variant="quiet" onPress={onComplete} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <LedgerPreview settled={isLast} />
          <View accessibilityLiveRegion="polite" style={styles.copy}>
            <Text style={styles.eyebrow}>{page.eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {page.title}
            </Text>
            <Text style={styles.description}>{page.description}</Text>
          </View>
        </ScrollView>
        <View style={styles.footer}>
          <View
            style={styles.progress}
            accessible
            accessibilityLabel={`Onboarding page ${step + 1} of ${pages.length}`}
          >
            {pages.map((item, index) => (
              <View key={item.eyebrow} style={[styles.dot, step === index && styles.activeDot]} />
            ))}
          </View>
          <View style={styles.actions}>
            {isLast && <Button title="Back" variant="secondary" onPress={() => setStep(0)} />}
            <View style={{ flex: 1 }}>
              <Button
                title={isLast ? 'Get started' : 'Next'}
                onPress={isLast ? onComplete : () => setStep(1)}
              />
            </View>
          </View>
          <Text style={styles.footnote}>{page.footnote}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { backgroundColor: colors.green, borderRadius: 11, padding: 9 },
  brandName: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28 },
  illustration: { backgroundColor: colors.greenLight, borderRadius: 28, padding: 20, gap: 16 },
  preview: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#D7E7DD',
  },
  previewLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
    color: colors.green,
    flexShrink: 1,
  },
  balance: { fontSize: 38, lineHeight: 50, fontWeight: '700', color: colors.ink, marginTop: 12 },
  caption: { fontSize: 11, lineHeight: 18, color: colors.muted },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#896D45', fontWeight: '700', fontSize: 15 },
  entryBody: { flex: 1 },
  friend: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  amount: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    padding: 10,
    borderRadius: 9,
    backgroundColor: '#F6F8F6',
  },
  repaidBadge: { backgroundColor: colors.greenLight },
  badgeText: { color: colors.green, fontSize: 11, flexShrink: 1, fontWeight: '600' },
  overdue: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 12 },
  overdueText: { color: colors.red, fontSize: 11, flexShrink: 1 },
  example: { color: colors.green, fontSize: 8, letterSpacing: 1, textAlign: 'center' },
  copy: { gap: 12 },
  eyebrow: {
    color: colors.green,
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    lineHeight: 41,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: { color: colors.muted, fontSize: 14, lineHeight: 23, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12, gap: 16 },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CDD8D1' },
  activeDot: { width: 24, backgroundColor: colors.green },
  actions: { flexDirection: 'row', gap: 12 },
  footnote: { color: colors.muted, fontSize: 10, lineHeight: 16, textAlign: 'center' },
});
