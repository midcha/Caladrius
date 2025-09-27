// src/styles.ts
import { Platform } from 'react-native';

export const colors = {
  bg: '#0B1220',
  card: '#111827',
  text: '#E5E7EB',
  accent: '#22D3EE',
  accent2: '#F59E0B',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#F43F5E',
  faint: '#9CA3AF',
};

export const S = {
  screen: { flex: 1, backgroundColor: colors.bg, padding: 14 } as const,
  h1: { fontSize: 20, fontWeight: '800', color: colors.accent, marginBottom: 8 } as const,
  h2: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 14, marginBottom: 6 } as const,
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } as const,
  btn: (bg: string) =>
    ({
      backgroundColor: bg,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      minWidth: 140,
      marginBottom: 8,
    } as const),
  btnText: { color: '#0B1220', fontWeight: '800', textAlign: 'center' } as const,
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginTop: 10 } as const,
  mono: { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), color: colors.text } as const,
  input: {
    backgroundColor: '#0F172A',
    borderColor: '#1F2937',
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  } as const,
};
