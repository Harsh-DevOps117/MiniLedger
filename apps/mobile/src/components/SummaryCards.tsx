import { StyleSheet, View } from 'react-native';
import { AppText as Text } from './Typography';
import { Feather } from '@expo/vector-icons';
import type { Summary } from '@miniledger/contracts';
import { money } from '../lib/format';
import { colors, headingFont } from '../theme';

export function SummaryCards({ summary, compact }: { summary: Summary; compact: boolean }) {
  return (
    <View style={[styles.grid, compact && { flexDirection: 'column' }]}>
      <View style={[styles.hero, compact && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }]}>
        <View style={styles.top}>
          <Text style={styles.heroLabel}>STILL TO COME BACK</Text>
          <Feather name="arrow-down-left" color="#A5C9B8" size={21} />
        </View>
        <Text style={styles.heroAmount}>{money(summary.outstanding)}</Text>
        <Text style={styles.heroNote}>Outstanding with friends</Text>
        <View style={styles.heroFooter}>
          <View style={styles.dot} />
          <Text style={styles.heroSmall}>Every little bit, accounted for.</Text>
        </View>
      </View>
      <View style={[styles.metrics, compact && { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' }]}>
        <Metric
          label="Total lent"
          amount={summary.totalLent}
          note="All-time kindness"
          icon="arrow-up-right"
        />
        <View style={styles.divider} />
        <Metric
          label="Total repaid"
          amount={summary.totalRepaid}
          note="Back in your pocket"
          icon="check"
        />
        <View style={styles.divider} />
        <Metric
          label="Overdue"
          amount={summary.overdueAmount}
          note="Could use a reminder"
          icon="clock"
          warning
        />
      </View>
    </View>
  );
}
function Metric({
  label,
  amount,
  note,
  icon,
  warning = false,
}: {
  label: string;
  amount: string;
  note: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  warning?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.icon, warning && { backgroundColor: colors.redLight }]}>
        <Feather name={icon} size={17} color={warning ? colors.red : colors.green} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.amount, warning && { color: colors.red }]}>{money(amount)}</Text>
        <Text style={styles.note}>{note}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 18, marginBottom: 34 },
  hero: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    padding: 26,
    backgroundColor: colors.navy,
    justifyContent: 'center',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  heroLabel: { color: '#B9D4C8', fontSize: 10, letterSpacing: 1.5, fontWeight: '600' },
  heroAmount: { fontSize: 40, fontFamily: headingFont, color: colors.white, marginBottom: 7 },
  heroNote: { color: '#BDD0C6', fontSize: 13 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: '#34504A',
    marginTop: 26,
    paddingTop: 18,
  },
  dot: { width: 6, height: 6, backgroundColor: '#97BDA9', borderRadius: 3 },
  heroSmall: { color: '#97BDA9', fontSize: 11 },
  metrics: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 22,
    paddingVertical: 4,
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 15 },
  icon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, color: colors.muted, marginBottom: 3 },
  amount: { fontSize: 20, fontWeight: '600', color: colors.ink },
  note: { fontSize: 10, color: colors.muted, marginTop: 3 },
  divider: { height: 1, backgroundColor: colors.border },
});
