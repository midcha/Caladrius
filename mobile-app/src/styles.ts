// src/styles.ts
import { Platform } from 'react-native';

// Futuristic Healthcare — Light theme
// - Primary accent: Blue
// - Contrast/Text: Black
// - Verification/Success: Green
// - Surfaces: Clean white with subtle separators

export const colors = {
  // Surfaces
  bg: '#FFFFFF',
  card: '#FFFFFF',

  // Text & contrast
  text: '#0B1220',   // deep near-black for high readability
  faint: '#6B7280',  // muted gray for hints/placeholders

  // Accents
  accent: '#2A7DE1',  // primary blue
  accent2: '#4F46E5', // secondary accent (optional, e.g., actions)
  ok: '#10B981',      // verification/success green
  warn: '#F59E0B',
  danger: '#EF4444',

  // Strokes
  line: '#E5E7EB',
  inputBg: '#F9FAFB',
  inputBorder: '#E5E7EB',
};

export const S = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 14,
  } as const,

  h1: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  } as const,

  h2: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 14,
    marginBottom: 6,
  } as const,

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const,

  btn: (bg: string) =>
    ({
      backgroundColor: bg,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      minWidth: 140,
      marginBottom: 8,
      // subtle elevation feel on light
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    } as const),

  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  } as const,

  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
  } as const,

  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: colors.text,
  } as const,

  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  } as const,
};
