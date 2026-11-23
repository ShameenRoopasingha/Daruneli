import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme';
import {
  verifyPin,
  canAuthenticateWithBiometrics,
  isBiometricEnabled,
  authenticateWithBiometrics,
} from '@/src/security/authLock';

interface AppLockScreenProps {
  onUnlocked: () => void;
}

export const AppLockScreen: React.FC<AppLockScreenProps> = ({ onUnlocked }) => {
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [biometricsAvailable, setBiometricsAvailable] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function initBiometrics() {
      const canBio = await canAuthenticateWithBiometrics();
      const isBioActive = await isBiometricEnabled();
      const available = canBio && isBioActive;
      if (!isMounted) return;
      setBiometricsAvailable(available);

      if (available) {
        const success = await authenticateWithBiometrics('Use biometric identity to unlock Suwa PHM');
        if (success && isMounted) {
          onUnlocked();
        }
      }
    }
    void initBiometrics();
    return () => {
      isMounted = false;
    };
  }, [onUnlocked]);

  const handleKeyPress = async (digit: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + digit;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      const isValid = await verifyPin(nextPin);
      if (isValid) {
        setPin('');
        onUnlocked();
      } else {
        Vibration.vibrate(250);
        setErrorMsg('අවලංගු PIN අංකයකි / Invalid PIN');
        setTimeout(() => {
          setPin('');
        }, 500);
      }
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  const handleBiometricPress = async () => {
    const success = await authenticateWithBiometrics('Verify your fingerprint to unlock');
    if (success) {
      onUnlocked();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.headerArea}>
        <View style={styles.shieldIconWrapper}>
          <Text style={styles.shieldIcon}>🛡️</Text>
        </View>
        <Text style={styles.appTitle}>දරුනැළි • ආරක්ෂිත පිවිසුම</Text>
        <Text style={styles.subtitle}>Suwa PHM Companion • Security Lock</Text>
      </View>

      {/* 4-Digit PIN Indicator Dots */}
      <View style={styles.pinIndicatorArea}>
        <Text style={styles.pinPrompt}>PIN අංකය ඇතුළත් කරන්න (Enter PIN)</Text>
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <View
                key={`pin-dot-${idx}`}
                style={[
                  styles.dot,
                  isFilled ? styles.dotFilled : styles.dotEmpty,
                  errorMsg ? styles.dotError : null,
                ]}
              />
            );
          })}
        </View>
        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : <View style={{ height: 20 }} />}
      </View>

      {/* Numeric Keypad (≥56dp touch targets) */}
      <View style={styles.keypadArea}>
        <View style={styles.keyRow}>
          {['1', '2', '3'].map((n) => (
            <TouchableOpacity
              key={n}
              activeOpacity={0.7}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(n)}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {['4', '5', '6'].map((n) => (
            <TouchableOpacity
              key={n}
              activeOpacity={0.7}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(n)}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {['7', '8', '9'].map((n) => (
            <TouchableOpacity
              key={n}
              activeOpacity={0.7}
              style={styles.keyBtn}
              onPress={() => handleKeyPress(n)}
            >
              <Text style={styles.keyText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.keyRow}>
          {/* Biometrics button (left) */}
          {biometricsAvailable ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.keyBtn, styles.specialKeyBtn]}
              onPress={handleBiometricPress}
              accessibilityLabel="Unlock with Biometrics"
            >
              <Text style={styles.specialKeyIcon}>👆</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.keyBtnEmpty} />
          )}

          {/* Zero digit */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.keyBtn}
            onPress={() => handleKeyPress('0')}
          >
            <Text style={styles.keyText}>0</Text>
          </TouchableOpacity>

          {/* Backspace button (right) */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.keyBtn, styles.specialKeyBtn]}
            onPress={handleBackspace}
            accessibilityLabel="Delete last digit"
          >
            <Text style={styles.specialKeyIcon}>⌫</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    zIndex: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
  },
  headerArea: {
    alignItems: 'center',
    marginTop: 20,
  },
  shieldIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  shieldIcon: {
    fontSize: 32,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  pinIndicatorArea: {
    alignItems: 'center',
    width: '100%',
  },
  pinPrompt: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '600',
    marginBottom: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  dotEmpty: {
    borderColor: '#64748B',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  dotError: {
    borderColor: '#EF4444',
    backgroundColor: '#EF4444',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '700',
    height: 20,
  },
  keypadArea: {
    width: '100%',
    maxWidth: 320,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keyBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    ...SHADOWS.card,
  },
  specialKeyBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  keyBtnEmpty: {
    width: 68,
    height: 68,
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  specialKeyIcon: {
    fontSize: 22,
    color: '#94A3B8',
  },
});
