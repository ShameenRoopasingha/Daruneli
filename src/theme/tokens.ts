export const COLORS = {
  // Brand & Primary
  primary: '#0D9488', // Modern Medical Teal (trusted, serene, human)
  primaryDark: '#0F766E',
  primaryDeep: '#115E59',
  primaryLight: '#F0FDFA',
  primaryMuted: '#CCFBF1',
  primaryBorder: '#99F6E4',

  // Canvas & Surfaces
  canvas: '#F8FAFC', // Slate-50 background
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F5F9', // Slate-100
  surfaceMuted: '#F8FAFC',

  // Borders & Dividers
  borderHairline: 'rgba(15, 23, 42, 0.12)',
  borderSubtle: '#CBD5E1', // Slate-300: crisp delineation
  borderStrong: '#94A3B8',

  // Neutral Typography
  textPrimary: '#0F172A', // Slate-900 (15.8:1 on white)
  textSecondary: '#475569', // Slate-600 (7.1:1 on white)
  textTertiary: '#64748B', // Slate-500 (4.6:1 on white - passes WCAG AA)
  textWhite: '#FFFFFF',

  // Clinical Risk Levels (Sri Lankan MOH Standards)
  risk: {
    red: {
      dot: '#EF4444',
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      accent: '#DC2626',
    },
    yellow: {
      dot: '#D97706', // Amber-600: achieves >= 3:1 non-text contrast on white/light bg
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      accent: '#B45309',
    },
    green: {
      dot: '#10B981',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
      accent: '#059669',
    },
  },

  // Nutrition Badges
  nutrition: {
    normal: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
    mam: { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
    sam: { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B' },
  },

  // Action Accents
  accentBlue: '#0284C7',
  accentBlueLight: '#F0F9FF',
  accentWhatsApp: '#16A34A',
  accentWhatsAppLight: '#F0FDF4',
  accentPhone: '#0284C7',
  accentPhoneLight: '#F0F9FF',

  // UI System Feedback (separate from clinical risk)
  feedback: {
    error: '#DC2626',
    errorBg: '#FEF2F2',
    errorBorder: '#FECACA',
    success: '#16A34A',
    successBg: '#F0FDF4',
    successBorder: '#BBF7D0',
    warning: '#D97706',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    info: '#0284C7',
    infoBg: '#F0F9FF',
    infoBorder: '#BAE6FD',
  },
};

export const TOUCH_TARGET = {
  min: 48,     // Android Material Design clinical standard (48x48dp)
  compact: 44, // iOS minimum touch guideline
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHover: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 10,
  },
};

export const TYPOGRAPHY = {
  h1: {
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: 0, // Never negative for Indic/Sinhala script ligatures
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    lineHeight: 18,
    letterSpacing: 0,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0,
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0,
    color: COLORS.textTertiary,
  },
  overline: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: COLORS.textTertiary,
  },
};
