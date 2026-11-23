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
  borderHairline: 'rgba(15, 23, 42, 0.06)',
  borderSubtle: '#E2E8F0',
  borderStrong: '#CBD5E1',

  // Neutral Typography
  textPrimary: '#0F172A', // Slate-900
  textSecondary: '#475569', // Slate-600
  textTertiary: '#94A3B8', // Slate-400
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
      dot: '#F59E0B',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      accent: '#D97706',
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
    shadowColor: '#0D9488',
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
    fontWeight: '800' as const,
    letterSpacing: -0.6,
    color: COLORS.textPrimary,
  },
  h2: {
    fontSize: 20,
    fontWeight: '800' as const,
    letterSpacing: -0.4,
    color: COLORS.textPrimary,
  },
  h3: {
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.textTertiary,
  },
  overline: {
    fontSize: 11,
    fontWeight: '800' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    color: COLORS.textTertiary,
  },
};
