import { StyleSheet } from 'react-native';
export const colors = {
  background: '#F6F7F9',
  white: '#FFFFFF',
  ink: '#172A3A',
  muted: '#71808E',
  green: '#166B50',
  greenLight: '#EAF4EE',
  border: '#E4E9ED',
  red: '#B94638',
  redLight: '#FFF0EB',
  navy: '#142E2C',
};
export const fonts = {
  regular: 'Manrope-Regular',
  semibold: 'Manrope-SemiBold',
  bold: 'Manrope-Bold',
} as const;
export const bodyFont = fonts.regular;
export const headingFont = bodyFont;
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 34, lineHeight: 42, fontFamily: headingFont, color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  label: { color: colors.ink, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    minHeight: 50,
  },
  field: { marginBottom: 20 },
  error: { color: colors.red, fontSize: 13, lineHeight: 20, marginTop: 7 },
  errorBox: { backgroundColor: colors.redLight, borderRadius: 12, padding: 14, marginVertical: 12 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 22,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14,30,30,0.52)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 26,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    maxHeight: '95%',
  },
});
