// src/styles.ts
import { Platform } from 'react-native';

// --- Brand / Theme ---
export const colors = {
  bg: '#FFFFFF',
  card: '#FFFFFF',

  text: '#0A1018',
  faint: '#6B7280',

  accent: '#2563EB',
  accent2: '#4F46E5',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',

  line: '#E6EEF8',
  inputBg: '#F7FAFF',
  inputBorder: '#E6EEF8',
};

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 4,
} as const;

// NOTE: We’re standardizing on Space Grotesk across headings, body, and numbers.
// Make sure fonts are loaded in your app shell (snippet below).
const fontRegular   = 'SpaceGrotesk_400Regular';
const fontMedium    = 'SpaceGrotesk_500Medium';
const fontSemiBold  = 'SpaceGrotesk_600SemiBold';
const fontBold      = 'SpaceGrotesk_700Bold';

// Useful for aligned numbers (MRN, dates, vitals)
const numericFeatures = Platform.select({
  ios: { fontVariant: ['tabular-nums'] as unknown as any },
  android: {}, // Android uses default numeric; RN's fontVariant isn't widely supported
  default: {},
});

export const S = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 16,
  } as const,

  // Headings
  h1: {
    fontFamily: fontBold,
    fontSize: 24,
    lineHeight: 30,
    color: colors.text,
    letterSpacing: 0.2,
    marginBottom: 12,
  } as const,

  h2: {
    fontFamily: fontSemiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    letterSpacing: 0.15,
    marginTop: 16,
    marginBottom: 8,
  } as const,

  // General text
  body: {
    fontFamily: fontRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  } as const,

  faint: {
    fontFamily: fontRegular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.faint,
  } as const,

  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' } as const,

  // Buttons
  btn: (bg: string) =>
    ({
      backgroundColor: bg,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 14,
      minWidth: 150,
      marginBottom: 8,
      alignItems: 'center',
      justifyContent: 'center',
      ...cardShadow,
    } as const),

  btnText: {
    fontFamily: fontBold,
    fontSize: 16,
    letterSpacing: 0.2,
    color: '#FFFFFF',
    textAlign: 'center',
  } as const,

  // Cards
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.line,
    ...cardShadow,
  } as const,

  // “Mono” previously — now numeric-friendly Space Grotesk for clean figures
  mono: {
    fontFamily: fontMedium,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    letterSpacing: 0.2,
    ...(numericFeatures as object),
  } as const,

  input: {
    backgroundColor: colors.inputBg,
    borderColor: colors.inputBorder,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontFamily: fontRegular,
    fontSize: 15,
  } as const,

  // Helpers
  tinyMuted: {
    fontFamily: fontRegular,
    fontSize: 12,
    color: colors.faint,
  } as const,

  sectionSpacing: {
    marginBottom: 20,
  } as const,

  // New: simple divider to cleanly separate card rows
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 8,
  } as const,
};
