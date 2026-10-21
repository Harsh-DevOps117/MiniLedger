import { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppText as Text } from './Typography';
import { Button } from './Button';
import { displayDate, todayUtc } from '../lib/format';
import { colors, ui } from '../theme';

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** A date-only calendar shared by Expo Go and web; selections remain UTC YYYY-MM-DD. */
export function DateField({
  value,
  onOpen,
  error,
  disabled = false,
}: {
  value: string;
  onOpen: () => void;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <View style={ui.field}>
      <Text style={ui.label}>Due date</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose due date"
        accessibilityValue={{ text: displayDate(value) }}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          onOpen();
        }}
        style={[ui.input, ui.between, error ? { borderColor: colors.red } : null]}
      >
        <Text style={styles.value}>{displayDate(value)}</Text>
        <Feather name="calendar" size={20} color={colors.green} />
      </Pressable>
      {error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

/** Calendar replaces the form inside its existing modal, so it never expands the form. */
export function DateCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [month, setMonth] = useState(value.slice(0, 7));
  const firstDay = new Date(`${month}-01T00:00:00Z`);
  const year = firstDay.getUTCFullYear();
  const monthIndex = firstDay.getUTCMonth();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leading = firstDay.getUTCDay();
  const cells = 42; // Keep the panel height stable when changing months.
  const today = todayUtc();
  const monthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(firstDay);

  function moveMonth(offset: number) {
    const next = new Date(firstDay);
    next.setUTCMonth(monthIndex + offset);
    setMonth(next.toISOString().slice(0, 7));
  }

  function select(date: string) {
    onChange(date);
    onClose();
  }

  return (
    <View style={styles.calendar}>
      <View style={ui.between}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => moveMonth(-1)}
          style={styles.arrow}
        >
          <Feather name="chevron-left" size={22} color={colors.green} />
        </Pressable>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.month}>
          {monthLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => moveMonth(1)}
          style={styles.arrow}
        >
          <Feather name="chevron-right" size={22} color={colors.green} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {weekdays.map((day) => (
          <Text key={day} style={styles.weekday}>
            {day}
          </Text>
        ))}
        {Array.from({ length: cells }, (_, index) => {
          const day = index - leading + 1;
          if (day < 1 || day > days) return <View key={`blank-${index}`} style={styles.cell} />;
          const date = `${month}-${String(day).padStart(2, '0')}`;
          const selected = date === value;
          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityLabel={`Select ${date}`}
              accessibilityHint={displayDate(date)}
              accessibilityState={{ selected }}
              onPress={() => select(date)}
              style={styles.cell}
            >
              <View
                style={[styles.day, date === today && styles.today, selected && styles.selected]}
              >
                <Text style={[styles.dayText, selected && styles.selectedText]}>{day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={ui.between}>
        <Button title="Today" variant="quiet" onPress={() => select(today)} />
        <Button title="Close calendar" variant="quiet" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  value: { color: colors.ink, fontSize: 16 },
  calendar: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 6,
    backgroundColor: colors.white,
  },
  arrow: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.ink, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.285714%',
    textAlign: 'center',
    fontSize: 10,
    color: colors.muted,
    paddingVertical: 8,
  },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: '100%',
    maxWidth: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  today: { borderColor: colors.green },
  selected: { backgroundColor: colors.green },
  dayText: { fontSize: 14, color: colors.ink },
  selectedText: { color: colors.white, fontWeight: '700' },
});
