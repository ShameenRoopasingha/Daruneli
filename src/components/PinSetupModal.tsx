import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  SafeAreaView,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from '@/src/theme';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (pin: string) => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'NEW' | 'CONFIRM'>('NEW');
  const [firstPin, setFirstPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const currentPin = step === 'NEW' ? firstPin : confirmPin;

  const handleReset = () => {
    setStep('NEW');
    setFirstPin('');
    setConfirmPin('');
    setErrorMsg('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleKeyPress = (digit: string) => {
    if (currentPin.length >= 4) return;
    const nextPin = currentPin + digit;
    setErrorMsg('');

    if (step === 'NEW') {
      setFirstPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(() => {
          setStep('CONFIRM');
        }, 200);
      }
    } else {
      setConfirmPin(nextPin);
      if (nextPin.length === 4) {
        if (nextPin === firstPin) {
          onSuccess(nextPin);
          handleReset();
        } else {
          Vibration.vibrate(250);
          setErrorMsg('PIN අංක නොගැලපේ (PINs do not match)');
          setTimeout(() => {
            setConfirmPin('');
          }, 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'NEW') {
      if (firstPin.length > 0) setFirstPin(firstPin.slice(0, -1));
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      } else {
        setStep('NEW');
        setFirstPin('');
      }
    }
    setErrorMsg('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'NEW'
                ? 'නව PIN අංකය සකසන්න'
                : 'PIN අංකය තහවුරු කරන්න'}
            </Text>
            <Text style={styles.subtitle}>
              {step === 'NEW'
                ? 'ඉලක්කම් 4ක ආරක්ෂිත PIN එකක් ඇතුළත් කරන්න'
                : 'තහවුරු කිරීම සඳහා කලින් ඇතුළත් කළ PIN එක නැවත ඇතුළත් කරන්න'}
            </Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = currentPin.length > idx;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    isFilled ? styles.dotFilled : styles.dotEmpty,
                  ]}
                />
              );
            })}
          </View>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          {/* Numeric Keypad */}
          <View style={styles.keypadContainer}>
            <View style={styles.keypadRow}>
              {['1', '2', '3'].map((digit) => (
                <TouchableOpacity
                  key={digit}
                  activeOpacity={0.7}
                  style={styles.keypadBtn}
                  onPress={() => handleKeyPress(digit)}
                >
                  <Text style={styles.keypadDigit}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.keypadRow}>
              {['4', '5', '6'].map((digit) => (
                <TouchableOpacity
                  key={digit}
                  activeOpacity={0.7}
                  style={styles.keypadBtn}
                  onPress={() => handleKeyPress(digit)}
                >
                  <Text style={styles.keypadDigit}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.keypadRow}>
              {['7', '8', '9'].map((digit) => (
                <TouchableOpacity
                  key={digit}
                  activeOpacity={0.7}
                  style={styles.keypadBtn}
                  onPress={() => handleKeyPress(digit)}
                >
                  <Text style={styles.keypadDigit}>{digit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.keypadRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.keypadBtn, styles.cancelBtn]}
                onPress={handleClose}
              >
                <Text style={styles.cancelBtnText}>අවලංගුයි</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.keypadBtn}
                onPress={() => handleKeyPress('0')}
              >
                <Text style={styles.keypadDigit}>0</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.keypadBtn, styles.actionBtn]}
                onPress={handleBackspace}
              >
                <Text style={styles.backspaceIcon}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...TYPOGRAPHY.h2,
    color: COLORS.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    borderWidth: 2,
    borderColor: COLORS.borderHairline,
    backgroundColor: COLORS.canvas,
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
  errorText: {
    color: COLORS.risk.red.accent,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 8,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
    marginTop: 8,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keypadBtn: {
    flex: 1,
    height: 60,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  keypadDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  actionBtn: {
    backgroundColor: '#F3F4F6',
  },
  backspaceIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
});
