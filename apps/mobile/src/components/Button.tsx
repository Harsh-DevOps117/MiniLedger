import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { AppText as Text } from './Typography';
import { colors } from '../theme';

export function Button({
  title,
  onPress,
  busy = false,
  disabled = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'quiet';
}) {
  const muted = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: muted, busy }}
      disabled={muted}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary'
          ? styles.primary
          : variant === 'secondary'
            ? styles.secondary
            : styles.quiet,
        { opacity: muted ? 0.5 : pressed ? 0.75 : 1 },
      ]}
    >
      {busy && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.white : colors.green}
        />
      )}
      <Text style={[styles.text, { color: variant === 'primary' ? colors.white : colors.green }]}>
        {title}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.greenLight },
  quiet: { backgroundColor: 'transparent' },
  text: { fontSize: 14, fontWeight: '600' },
});
