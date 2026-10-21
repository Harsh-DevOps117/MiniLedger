import { Feather } from '@expo/vector-icons';
import type { Loan } from '@miniledger/contracts';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { AddLoanModal } from '../components/AddLoanModal';
import { Button } from '../components/Button';
import { LoanCard } from '../components/LoanCard';
import { SummaryCards } from '../components/SummaryCards';
import { AppText as Text, AppTextInput as TextInput } from '../components/Typography';
import { useAuth } from '../hooks/useAuth';
import { useLedger } from '../hooks/useLedger';
import { errorMessage, money } from '../lib/format';
import { colors, ui } from '../theme';

const filters = ['All entries', 'Pending', 'Overdue', 'Repaid'] as const;
type Filter = (typeof filters)[number];
export function LedgerScreen() {
  const { api, session, signOut } = useAuth();
  const ledger = useLedger(api);
  const compact = useWindowDimensions().width < 680;
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Loan | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('All entries');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const visible = ledger.entries.filter(
    (loan) =>
      loan.friendName.toLowerCase().includes(query.toLowerCase().trim()) &&
      (filter === 'All entries' ||
        (filter === 'Pending' && loan.status === 'outstanding') ||
        (filter === 'Overdue' && loan.isOverdue) ||
        (filter === 'Repaid' && loan.status === 'repaid')),
  );
  async function repay() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.repay(selected.id);
      setSelected(null);
      setNotice('Repayment recorded. All squared up.');
      await ledger.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  async function openReceipt(loan: Loan) {
    setBusy(true);
    setError(null);
    try {
      setReceipt((await api.receipt(loan.id)).dataUri);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={ui.page}>
      <View style={styles.nav}>
        <View style={styles.navInner}>
          <View style={[ui.row, { gap: 10 }]}>
            <View style={styles.logo}>
              <Feather name="book-open" size={20} color="white" />
            </View>
            <Text style={styles.brand}>
              MiniLedger<Text style={{ color: colors.green }}>.</Text>
            </Text>
          </View>
          <View style={[ui.row, { gap: 12 }]}>
            {!compact && <Text style={styles.account}>{session?.user.phone}</Text>}
            <Button title="Sign out" variant="quiet" onPress={() => void signOut()} />
          </View>
        </View>
      </View>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={ledger.loading}
            onRefresh={() => void ledger.refresh()}
            tintColor={colors.green}
          />
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[ui.between, { marginBottom: 27, gap: 16, flexWrap: 'wrap' }]}>
          <View>
            <Text style={styles.eyebrow}>YOUR PERSONAL LEDGER</Text>
            <Text style={ui.title}>Clear Small Dues</Text>
            <Text style={[ui.body, { marginTop: 7 }]}>A simple home for the money you lend.</Text>
          </View>
          <Button
            title="+ Add entry"
            onPress={() => {
              setNotice(null);
              setAdding(true);
            }}
          />
        </View>
        {ledger.summary && <SummaryCards summary={ledger.summary} compact={compact} />}
        {!ledger.summary && ledger.loading && (
          <ActivityIndicator
            accessibilityLabel="Loading ledger"
            size="large"
            color={colors.green}
            style={{ margin: 40 }}
          />
        )}
        {notice && (
          <View style={styles.notice}>
            <Feather name="check-circle" size={16} color={colors.green} />
            <Text accessibilityRole="alert" style={{ color: colors.green, fontSize: 13, flex: 1 }}>
              {notice}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss notification"
              onPress={() => setNotice(null)}
              style={{ padding: 10 }}
            >
              <Feather name="x" size={16} color={colors.green} />
            </Pressable>
          </View>
        )}
        {(ledger.error || (error && !selected)) && (
          <View style={ui.errorBox}>
            <Text accessibilityRole="alert" style={ui.error}>
              {ledger.error || error}
            </Text>
            <Button
              title="Refresh ledger"
              variant="quiet"
              onPress={() => {
                setError(null);
                void ledger.refresh();
              }}
            />
          </View>
        )}
        <View style={[ui.between, { marginBottom: 20 }]}>
          <View style={[ui.row, { gap: 8 }]}>
            <Text style={styles.sectionTitle}>Your entries</Text>
            <Text style={styles.count}>{ledger.entries.length}</Text>
          </View>
          <Button
            title="Refresh"
            variant="quiet"
            busy={ledger.loading && !!ledger.summary}
            onPress={() => void ledger.refresh()}
          />
        </View>
        <View
          style={[styles.toolbar, compact && { flexDirection: 'column', alignItems: 'stretch' }]}
        >
          <View style={styles.tabs}>
            {filters.map((item) => (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: item === filter }}
                onPress={() => setFilter(item)}
                style={[styles.tab, item === filter && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    item === filter && { color: colors.green, fontWeight: '600' },
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.search}>
            <Feather name="search" color={colors.muted} size={15} />
            <TextInput
              accessibilityLabel="Search friends"
              placeholder="Find a friend…"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
          </View>
        </View>
        {visible.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            busy={busy}
            compact={compact}
            onRepay={() => {
              setError(null);
              setSelected(loan);
            }}
            onReceipt={() => void openReceipt(loan)}
          />
        ))}
        {!visible.length && !ledger.loading && !ledger.error && (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="book-open" size={28} color={colors.green} />
            </View>
            <Text style={styles.emptyTitle}>
              {ledger.entries.length ? 'No matching entries' : 'A fresh page, just for you'}
            </Text>
            <Text style={[ui.body, { textAlign: 'center', marginTop: 8, maxWidth: 310 }]}>
              {ledger.entries.length
                ? 'Try another name or filter.'
                : 'Lent a friend a little something? Add your first entry and we’ll keep track of it.'}
            </Text>
            {!ledger.entries.length && (
              <View style={{ marginTop: 20 }}>
                <Button title="Add your first entry" onPress={() => setAdding(true)} />
              </View>
            )}
          </View>
        )}
        {ledger.nextOffset !== null && (
          <View style={{ marginTop: 10 }}>
            <Text style={[ui.body, { textAlign: 'center', fontSize: 12, marginBottom: 8 }]}>
              Search and filters cover loaded entries. Load more to see older loans.
            </Text>
            <Button
              title="Load more entries"
              busy={ledger.loadingMore}
              disabled={ledger.loading}
              variant="secondary"
              onPress={() => void ledger.loadMore()}
            />
          </View>
        )}
        <View style={styles.footer}>
          <Feather name="lock" size={12} color={colors.muted} />
          <Text style={styles.footerText}>Your ledger is yours alone. · INR · Dates in UTC</Text>
        </View>
      </ScrollView>
      {adding && (
        <AddLoanModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setNotice('Entry added. One less thing to remember.');
            setFilter('All entries');
            setQuery('');
            void ledger.refresh();
          }}
        />
      )}
      {selected && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <View style={ui.modalOverlay}>
            <View style={ui.modalCard} accessibilityViewIsModal>
              <Text style={[ui.title, { fontSize: 27 }]}>All squared up?</Text>
              <Text style={[ui.body, { marginVertical: 18 }]}>
                Record {money(selected.amount)} from {selected.friendName} as fully repaid. This
                cannot be undone in this app.
              </Text>
              {error && (
                <Text accessibilityRole="alert" style={[ui.error, { marginBottom: 16 }]}>
                  {error}
                </Text>
              )}
              <Button title="Confirm repayment" busy={busy} onPress={() => void repay()} />
              <Button
                title="Keep pending"
                variant="quiet"
                disabled={busy}
                onPress={() => setSelected(null)}
              />
            </View>
          </View>
        </Modal>
      )}
      {receipt && (
        <Modal transparent animationType="fade" onRequestClose={() => setReceipt(null)}>
          <View style={ui.modalOverlay}>
            <View style={ui.modalCard} accessibilityViewIsModal>
              <Text style={[ui.title, { fontSize: 26, marginBottom: 16 }]}>Receipt</Text>
              <Image
                accessibilityLabel="Receipt photo"
                source={{ uri: receipt }}
                style={{ width: '100%', height: 360 }}
                resizeMode="contain"
              />
              <Button title="Close receipt" variant="secondary" onPress={() => setReceipt(null)} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  nav: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  navInner: {
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    paddingHorizontal: 24,
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: colors.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.8, color: colors.ink },
  account: { color: colors.muted, fontSize: 12 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 1060,
    alignSelf: 'center',
    padding: 24,
    paddingTop: 38,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.7,
    color: colors.green,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '600' },
  count: {
    fontSize: 11,
    color: colors.muted,
    backgroundColor: '#E9EDF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 18,
  },
  tabs: { flexDirection: 'row', gap: 3, backgroundColor: '#EDEFF1', padding: 4, borderRadius: 11 },
  tab: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    justifyContent: 'center',
  },
  activeTab: { backgroundColor: colors.white },
  tabText: { fontSize: 12, color: colors.muted },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  searchInput: { color: colors.ink, fontSize: 13, minWidth: 140, flex: 1, paddingVertical: 12 },
  empty: {
    alignItems: 'center',
    padding: 35,
    paddingVertical: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D6DFDA',
    borderRadius: 18,
  },
  emptyIcon: {
    backgroundColor: '#E8EFEA',
    width: 65,
    height: 65,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: { fontSize: 19, color: colors.ink, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 32,
    paddingBottom: 8,
  },
  footerText: { fontSize: 10, color: colors.muted },
  notice: {
    backgroundColor: colors.greenLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 18,
  },
});
