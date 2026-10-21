import { createContext, useContext, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextProps,
  type TextInputProps,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import { fonts } from '../theme';

const FontContext = createContext(false);

export function TypographyProvider({ loaded, children }: { loaded: boolean; children: ReactNode }) {
  return <FontContext.Provider value={loaded}>{children}</FontContext.Provider>;
}

function fontStyle(style: StyleProp<TextStyle>, loaded: boolean): TextStyle {
  if (!loaded) return { fontFamily: undefined };
  const requested = StyleSheet.flatten(style)?.fontWeight ?? '400';
  const weight = requested === 'bold' ? 700 : requested === 'normal' ? 400 : Number(requested);
  const fontFamily = weight >= 700 ? fonts.bold : weight >= 500 ? fonts.semibold : fonts.regular;
  // SDK 57 uses separately loaded static faces. The chosen file already supplies the weight.
  return { fontFamily, fontWeight: 'normal' };
}

export function AppText({ style, ...props }: TextProps) {
  const loaded = useContext(FontContext);
  return <Text {...props} style={[style, fontStyle(style, loaded)]} />;
}

export function AppTextInput({ style, ...props }: TextInputProps) {
  const loaded = useContext(FontContext);
  return <TextInput {...props} style={[style, fontStyle(style, loaded)]} />;
}
