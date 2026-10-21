import { useState } from 'react';
import { Image, KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { AppText as Text } from './Typography';
import * as ImagePicker from 'expo-image-picker';
import { createLoanSchema, RECEIPT_MAX_BYTES } from '@miniledger/contracts';
import { useAuth } from '../hooks/useAuth';
import { Button } from './Button';
import { Field } from './Field';
import { DateCalendar, DateField } from './DateField';
import { errorMessage, todayUtc } from '../lib/format';
import { colors, ui } from '../theme';

export function AddLoanModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { api } = useAuth();
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(todayUtc());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function pickReceipt() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > RECEIPT_MAX_BYTES)
        throw new Error('Choose a photo smaller than 2 MB.');
      setReceipt(asset);
    } catch (err) {
      setError(errorMessage(err));
    }
  }
  async function save() {
    const parsed = createLoanSchema.safeParse({ friendName, amount, dueDate });
    setErrors({});
    setError(null);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
        ),
      );
      return;
    }
    setBusy(true);
    try {
      await api.create(parsed.data, receipt);
      onSaved();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (calendarOpen) setCalendarOpen(false);
        else if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={ui.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled={Platform.OS !== 'web'}
      >
        <View style={ui.modalCard} accessibilityViewIsModal>
          {calendarOpen ? (
            <View>
              <Text style={[ui.title, { fontSize: 22, lineHeight: 30 }]}>Choose due date</Text>
              <DateCalendar
                value={dueDate}
                onChange={setDueDate}
                onClose={() => setCalendarOpen(false)}
              />
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
            >
              <Text style={[ui.title, { fontSize: 28 }]}>A little help, noted.</Text>
              <Text style={[ui.body, { marginTop: 6, marginBottom: 26 }]}>
                Add the money you lent to a friend.
              </Text>
              <Field
                label="Friend’s name"
                value={friendName}
                onChangeText={setFriendName}
                placeholder="e.g. Aditi Sharma"
                maxLength={80}
                error={errors.friendName}
                editable={!busy}
                autoCapitalize="words"
              />
              <Field
                label="Amount (INR)"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                keyboardType="decimal-pad"
                maxLength={13}
                error={errors.amount}
                editable={!busy}
              />
              <DateField
                value={dueDate}
                onOpen={() => setCalendarOpen(true)}
                error={errors.dueDate}
                disabled={busy}
              />
              <Text style={[ui.body, { fontSize: 12, marginTop: -12, marginBottom: 20 }]}>
                Dates use UTC. Past dates are welcome for existing loans.
              </Text>
              <View
                style={{
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                {receipt ? (
                  <>
                    <Image
                      accessibilityLabel="Selected receipt preview"
                      source={{ uri: receipt.uri }}
                      style={{ width: '100%', height: 120, borderRadius: 8 }}
                      resizeMode="contain"
                    />
                    <Button
                      title="Remove receipt"
                      variant="quiet"
                      disabled={busy}
                      onPress={() => setReceipt(null)}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      title="Attach receipt photo"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => void pickReceipt()}
                    />
                    <Text style={[ui.body, { fontSize: 11, textAlign: 'center', marginTop: 6 }]}>
                      Optional · JPEG, PNG or WebP · up to 2 MB
                    </Text>
                  </>
                )}
              </View>
              {error && (
                <View style={ui.errorBox}>
                  <Text accessibilityRole="alert" style={ui.error}>
                    {error}
                  </Text>
                </View>
              )}
              <Button title="Save entry" busy={busy} onPress={() => void save()} />
              <Button title="Cancel" variant="quiet" disabled={busy} onPress={onClose} />
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
