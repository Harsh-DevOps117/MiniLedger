import { View, type TextInputProps } from 'react-native';
import { useContext } from 'react';
import { RevealFocusedFieldContext } from './KeyboardFormScrollView';
import { AppText as Text, AppTextInput as TextInput } from './Typography';
import { ui, colors } from '../theme';
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const revealFocusedField = useContext(RevealFocusedFieldContext);
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        {...props}
        onFocus={(event) => {
          props.onFocus?.(event);
          revealFocusedField?.();
        }}
        style={[ui.input, error ? { borderColor: colors.red } : null, props.style]}
      />
      {error && (
        <Text accessibilityRole="alert" style={ui.error}>
          {error}
        </Text>
      )}
    </View>
  );
}
