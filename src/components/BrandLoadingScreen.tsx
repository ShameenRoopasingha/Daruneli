import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Rect,
  Path,
  Circle,
} from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BrandLoadingScreenProps {
  messageSi?: string;
  messageEn?: string;
  statusText?: string;
}

export const BrandLoadingScreen: React.FC<BrandLoadingScreenProps> = ({
  messageSi = 'පද්ධතිය සක්‍රීය වෙමින් පවතී...',
  messageEn = 'Loading System...',
  statusText,
}) => {
  const insets = useSafeAreaInsets();
  const [spinAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(0.85));
  const [fadeAnim] = useState(() => new Animated.Value(0));

  const spin = useMemo(() => {
    return spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  }, [spinAnim]);

  useEffect(() => {
    // 1. Smooth rotation for the ring spinner (1100ms cycle)
    const spinLoop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    // 2. Gentle pulsing glow
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // 3. Fade in content smoothly
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spinAnim, pulseAnim, fadeAnim]);

  const logoWidth = Math.min(SCREEN_WIDTH * 0.82, 330);
  const logoHeight = logoWidth * (248 / 494); // Aspect ratio of daruneli-logo.png

  return (
    <View style={styles.container}>
      {/* Background SVG Canvas with Gradient & Waves matching daruneli-splash-ref.jpg */}
      <Svg
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <SvgGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#EBF8F5" stopOpacity={0.95} />
            <Stop offset="35%" stopColor="#F5FCFA" stopOpacity={0.98} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={1} />
          </SvgGradient>
          <SvgGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#0F8B8D" stopOpacity={0.16} />
            <Stop offset="100%" stopColor="#14B8A6" stopOpacity={0.03} />
          </SvgGradient>
        </Defs>

        {/* Base Gradient Fill */}
        <Rect x="0" y="0" width={SCREEN_WIDTH} height={SCREEN_HEIGHT} fill="url(#bgGrad)" />

        {/* Top-Right Soft Wave */}
        <Path
          d={`M ${SCREEN_WIDTH * 0.4} 0 Q ${SCREEN_WIDTH * 0.8} ${SCREEN_HEIGHT * 0.15} ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.24} L ${SCREEN_WIDTH} 0 Z`}
          fill="url(#waveGrad)"
        />

        {/* Top-Left Organic Curves */}
        <Path
          d={`M 0 0 Q ${SCREEN_WIDTH * 0.5} ${SCREEN_HEIGHT * 0.08} ${SCREEN_WIDTH * 0.65} 0 Z`}
          fill="url(#waveGrad)"
        />

        {/* Bottom Flowing Decorative Waves */}
        <Path
          d={`M 0 ${SCREEN_HEIGHT * 0.82} Q ${SCREEN_WIDTH * 0.45} ${SCREEN_HEIGHT * 0.72} ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.88} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
          fill="url(#waveGrad)"
        />
        <Path
          d={`M 0 ${SCREEN_HEIGHT * 0.91} Q ${SCREEN_WIDTH * 0.6} ${SCREEN_HEIGHT * 0.84} ${SCREEN_WIDTH} ${SCREEN_HEIGHT * 0.96} L ${SCREEN_WIDTH} ${SCREEN_HEIGHT} L 0 ${SCREEN_HEIGHT} Z`}
          fill="url(#waveGrad)"
        />
      </Svg>

      <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
        {/* Upper Brand Block */}
        <View style={styles.topSpacer} />
        <View style={styles.brandBlock}>
          <Image
            source={require('../../assets/images/daruneli-logo.png')}
            style={[styles.logoImage, { width: logoWidth, height: logoHeight }]}
            resizeMode="contain"
          />
          <Text style={styles.platformSubtitle}>
            A Digital Health Platform for Public Health Midwives (PHM)
          </Text>
        </View>

        {/* Mid-Lower Animated Spinner & Localized Status */}
        <View style={styles.loaderSection}>
          <View style={styles.spinnerContainer}>
            {/* Soft pulsing glow behind spinner */}
            <Animated.View
              style={[
                styles.spinnerGlow,
                { transform: [{ scale: pulseAnim }] },
              ]}
            />
            {/* Smooth hardware-accelerated rotating ring */}
            <Animated.View style={[styles.rotatingRing, { transform: [{ rotate: spin }] }]}>
              <Svg width={68} height={68} viewBox="0 0 68 68">
                <Defs>
                  <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#0F8B8D" stopOpacity={1} />
                    <Stop offset="65%" stopColor="#2DD4BF" stopOpacity={0.8} />
                    <Stop offset="100%" stopColor="#99F6E4" stopOpacity={0.1} />
                  </SvgGradient>
                </Defs>
                <Circle
                  cx="34"
                  cy="34"
                  r="28"
                  stroke="url(#ringGrad)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="130 50"
                  fill="none"
                />
              </Svg>
            </Animated.View>
          </View>

          {/* Localized Loading Messages */}
          <View style={styles.textContainer}>
            <Text style={styles.messageSinhala}>{messageSi}</Text>
            <Text style={styles.messageEnglish}>{messageEn}</Text>
            {statusText && <Text style={styles.subStatusText}>{statusText}</Text>}
          </View>
        </View>

        {/* Pinned Ministry of Health + Bitgard Footer */}
        <View style={[styles.footerBlock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Image
            source={require('../../assets/images/sri-lanka-emblem.png')}
            style={styles.emblemImage}
            resizeMode="contain"
          />
          <Text style={styles.ministryText}>MINISTRY OF HEALTH, SRI LANKA</Text>
          <Text style={styles.bitgardText}>Powered by Bitgard Pvt Ltd</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// Compact Brand Spinner for In-App / Screen-Level Loading
interface BrandSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  showEmblem?: boolean;
}

export const BrandSpinner: React.FC<BrandSpinnerProps> = ({
  size = 'md',
  message,
  showEmblem = true,
}) => {
  const [spinAnim] = useState(() => new Animated.Value(0));

  const spin = useMemo(() => {
    return spinAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  }, [spinAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spinAnim]);

  const dim = size === 'sm' ? 36 : size === 'lg' ? 68 : 48;
  const radius = dim / 2 - 4;
  const strokeW = size === 'sm' ? 3 : 4;
  const emblemDim = Math.round(dim * 0.52);

  return (
    <View style={styles.spinnerWrapper}>
      <View style={{ width: dim, height: dim, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Svg width={dim} height={dim} viewBox={`0 0 ${dim} ${dim}`}>
            <Defs>
              <SvgGradient id="inlineSpinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor="#0F8B8D" stopOpacity={1} />
                <Stop offset="70%" stopColor="#14B8A6" stopOpacity={0.7} />
                <Stop offset="100%" stopColor="#CCFBF1" stopOpacity={0.15} />
              </SvgGradient>
            </Defs>
            <Circle
              cx={dim / 2}
              cy={dim / 2}
              r={radius}
              stroke="url(#inlineSpinGrad)"
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={`${radius * 4.2} ${radius * 2}`}
              fill="none"
            />
          </Svg>
        </Animated.View>

        {showEmblem && (
          <Image
            source={require('../../assets/images/icon.png')}
            style={{
              position: 'absolute',
              width: emblemDim,
              height: emblemDim,
              borderRadius: emblemDim / 2,
            }}
            resizeMode="contain"
          />
        )}
      </View>
      {message && <Text style={styles.inlineMessage}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topSpacer: {
    height: SCREEN_HEIGHT * 0.12,
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    marginBottom: 14,
  },
  platformSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    paddingHorizontal: 16,
    letterSpacing: -0.1,
  },
  loaderSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  spinnerContainer: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  spinnerGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#CCFBF1',
    opacity: 0.7,
  },
  rotatingRing: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  messageSinhala: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 3,
  },
  messageEnglish: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  subStatusText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#0F8B8D',
    marginTop: 6,
    textAlign: 'center',
  },
  footerBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: 26,
    height: 37,
    marginBottom: 8,
    opacity: 0.95,
  },
  ministryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  bitgardText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    letterSpacing: 0.1,
  },
  spinnerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  inlineMessage: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0F766E',
    textAlign: 'center',
  },
});
