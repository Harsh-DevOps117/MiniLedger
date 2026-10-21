import { StyleSheet, View } from 'react-native';
import { AppText as Text } from './Typography';
import type { Loan } from '@miniledger/contracts';
import { Button } from './Button';
import { displayDate, money } from '../lib/format';
import { colors, ui } from '../theme';

export function LoanCard({
  loan,
  onRepay,
  onReceipt,
  busy,
  compact,
}: {
  loan: Loan;
  onRepay: () => void;
  onReceipt: () => void;
  busy: boolean;
  compact: boolean;
}) {
  const status = loan.status === 'repaid' ? 'Repaid' : loan.isOverdue ? 'Overdue' : 'Pending';
  const initials = loan.friendName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <View style={[styles.card, loan.isOverdue && styles.overdue]}>
      <View style={[ui.between, { gap: 12 }]}>
        <View style={[ui.row, { gap: 12, flex: 1 }]}>
          <View style={[styles.avatar, loan.isOverdue && { backgroundColor: '#F7DED5' }]}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.name}>
              {loan.friendName}
            </Text>
            <Text style={styles.date}>Due {displayDate(loan.dueDate)}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>{money(loan.amount)}</Text>
          <View
            style={[
              styles.badge,
              status === 'Overdue'
                ? { backgroundColor: '#FBE1D8' }
                : status === 'Repaid'
                  ? { backgroundColor: colors.greenLight }
                  : { backgroundColor: '#EDF0F3' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    status === 'Overdue'
                      ? colors.red
                      : status === 'Repaid'
                        ? colors.green
                        : '#697584',
                },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>
      </View>
      <View style={[ui.between, { marginTop: 14, gap: 8, flexWrap: 'wrap' }]}>
        <View>
          {loan.hasReceipt ? (
            <Button
              title={`View receipt for ${loan.friendName}`}
              variant="quiet"
              onPress={onReceipt}
              disabled={busy}
            />
          ) : (
            <Text style={styles.note}>
              {loan.status === 'repaid'
                ? 'Settled, with thanks.'
                : loan.isOverdue
                  ? 'A gentle nudge might help.'
                  : 'A little help between friends.'}
            </Text>
          )}
        </View>
        {loan.status !== 'repaid' && (
          <Button
            title={compact ? 'Mark repaid' : `Mark ${loan.friendName} repaid`}
            variant="secondary"
            disabled={busy}
            onPress={onRepay}
          />
        )}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.white,
    padding: 20,
    marginBottom: 12,
  },
  overdue: {
    backgroundColor: '#FFFAF7',
    borderColor: '#EFD6CC',
    borderLeftWidth: 3,
    borderLeftColor: '#D98065',
  },
  avatar: {
    height: 43,
    width: 43,
    backgroundColor: '#EAF0EC',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#4B6657', fontSize: 13, fontWeight: '600' },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  date: { fontSize: 12, color: colors.muted, marginTop: 6 },
  amount: { fontSize: 19, fontWeight: '600', color: colors.ink },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  note: { color: colors.muted, fontSize: 11 },
});
