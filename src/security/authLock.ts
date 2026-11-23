import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

const KEY_LOCK_ENABLED = 'suwa_auth_lock_enabled';
const KEY_PIN_HASH = 'suwa_auth_pin_hash';
const KEY_PIN_SALT = 'suwa_auth_pin_salt';
const KEY_BIOMETRIC_ENABLED = 'suwa_auth_biometric_enabled';
const KEY_AUTO_LOCK_MINUTES = 'suwa_auth_auto_lock_minutes';

export type AutoLockDuration = 1 | 5 | 15;

export async function isLockEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(KEY_LOCK_ENABLED);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setLockEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_LOCK_ENABLED, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to set lock enabled:', err);
  }
}

export async function hasPinSet(): Promise<boolean> {
  try {
    const hash = await SecureStore.getItemAsync(KEY_PIN_HASH);
    return Boolean(hash);
  } catch {
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  const salt = Crypto.randomUUID();
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
  await SecureStore.setItemAsync(KEY_PIN_SALT, salt);
  await SecureStore.setItemAsync(KEY_PIN_HASH, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const salt = await SecureStore.getItemAsync(KEY_PIN_SALT);
    const expectedHash = await SecureStore.getItemAsync(KEY_PIN_HASH);
    if (!salt || !expectedHash) return false;

    const computedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${salt}:${pin}`
    );
    return computedHash === expectedHash;
  } catch {
    return false;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const val = await SecureStore.getItemAsync(KEY_BIOMETRIC_ENABLED);
    return val !== 'false'; // Default to true if hardware available
  } catch {
    return false;
  }
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to set biometric enabled:', err);
  }
}

export async function getAutoLockMinutes(): Promise<AutoLockDuration> {
  try {
    const val = await SecureStore.getItemAsync(KEY_AUTO_LOCK_MINUTES);
    if (val === '1' || val === '5' || val === '15') {
      return parseInt(val, 10) as AutoLockDuration;
    }
    return 5;
  } catch {
    return 5;
  }
}

export async function setAutoLockMinutes(minutes: AutoLockDuration): Promise<void> {
  try {
    await SecureStore.setItemAsync(KEY_AUTO_LOCK_MINUTES, String(minutes));
  } catch (err) {
    console.warn('Failed to set auto lock minutes:', err);
  }
}

export async function canAuthenticateWithBiometrics(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(
  promptMessage = 'Verify your identity to unlock Daruneli PHM'
): Promise<boolean> {
  try {
    const supported = await canAuthenticateWithBiometrics();
    if (!supported) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: 'Enter 4-Digit PIN',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}

export async function shouldLockApp(lastBackgroundTimestamp: number): Promise<boolean> {
  if (!lastBackgroundTimestamp || lastBackgroundTimestamp <= 0) return false;
  const enabled = await isLockEnabled();
  if (!enabled) return false;

  const pinConfigured = await hasPinSet();
  if (!pinConfigured) return false;

  const autoLockMins = await getAutoLockMinutes();
  const elapsedMs = Date.now() - lastBackgroundTimestamp;
  const timeoutMs = autoLockMins * 60 * 1000;

  return elapsedMs >= timeoutMs;
}
