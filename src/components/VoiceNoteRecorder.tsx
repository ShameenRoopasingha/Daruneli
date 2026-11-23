import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { RADIUS } from '@/src/theme';

// Safely load expo-av to gracefully handle environments without ExponentAV native binary
let AudioModule: any = null;
let isAudioAvailable = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoAv = require('expo-av');
  AudioModule = expoAv?.Audio ?? null;
  isAudioAvailable = Boolean(AudioModule);
} catch {
  AudioModule = null;
  isAudioAvailable = false;
}

interface VoiceNoteRecorderProps {
  onRecorded: (uri: string, durationSec: number) => void;
  onDeleted?: () => void;
  existingUri?: string | null;
  existingDurationSec?: number | null;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onRecorded,
  onDeleted,
  existingUri,
  existingDurationSec,
}) => {
  const [recording, setRecording] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [durationSec, setDurationSec] = useState<number>(existingDurationSec || 0);
  const [recordedUri, setRecordedUri] = useState<string | null>(existingUri || null);

  // Sound playback state
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  const startRecording = async () => {
    if (!isAudioAvailable || !AudioModule) {
      Alert.alert('Notice', 'Voice recording requires a development build with audio module enabled.');
      return;
    }

    try {
      const perm = await AudioModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please allow microphone access to record offline clinical voice notes.'
        );
        return;
      }

      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const newRecording = new AudioModule.Recording();
      await newRecording.prepareToRecordAsync(AudioModule.RecordingOptionsPresets.HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
      setDurationSec(0);

      timerRef.current = setInterval(() => {
        setDurationSec((prev) => {
          if (prev >= 60) {
            // Auto-stop at 60 seconds
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Failed to start recording:', err);
      Alert.alert('Recording Error', err?.message || 'Could not initialize audio recorder.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const rawUri = recording.getURI();
      setRecording(null);

      if (!rawUri) return;

      // Ensure persistent folder: FileSystem.documentDirectory + 'voice_notes/'
      const dirPath = `${FileSystem.documentDirectory}voice_notes/`;
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }

      const persistentUri = `${dirPath}vn_${Date.now()}.m4a`;
      await FileSystem.copyAsync({ from: rawUri, to: persistentUri });

      setRecordedUri(persistentUri);
      onRecorded(persistentUri, durationSec || 1);
    } catch (err: any) {
      console.warn('Failed to stop recording:', err);
      Alert.alert('Recording Error', 'Could not save recorded audio note.');
    }
  };

  const handlePlayPreview = async () => {
    if (!recordedUri || !isAudioAvailable || !AudioModule) return;

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      setIsLoading(true);
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await AudioModule.Sound.createAsync(
        { uri: recordedUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);
      setIsLoading(false);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (err: any) {
      setIsLoading(false);
      console.warn('Error playing voice preview:', err);
      Alert.alert('Playback Error', 'Could not play voice note preview.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Voice Note', 'Are you sure you want to remove this recorded note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (sound) {
            await sound.unloadAsync().catch(() => {});
            setSound(null);
          }
          if (recordedUri) {
            await FileSystem.deleteAsync(recordedUri, { idempotent: true }).catch(() => {});
          }
          setRecordedUri(null);
          setDurationSec(0);
          setIsPlaying(false);
          if (onDeleted) onDeleted();
        },
      },
    ]);
  };

  if (!isAudioAvailable) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.titleWithIcon}>
            <Text style={styles.micIcon}>🎙️</Text>
            <Text style={styles.titleText}>Offline Voice Note (හඬ සටහන)</Text>
          </View>
        </View>
        <View style={styles.unavailableBox}>
          <Text style={styles.unavailableText}>
            Audio recording module requires an app update or development build. Text clinical notes remain fully active.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <Text style={styles.micIcon}>🎙️</Text>
          <Text style={styles.titleText}>Offline Voice Note (හඬ සටහන)</Text>
        </View>
        {durationSec > 0 && (
          <View style={[styles.timerBadge, isRecording && styles.timerBadgeRecording]}>
            <Text style={[styles.timerText, isRecording && styles.timerTextRecording]}>
              {Math.floor(durationSec / 60)}:{String(durationSec % 60).padStart(2, '0')}
            </Text>
          </View>
        )}
      </View>

      {!recordedUri ? (
        <View style={styles.recordActionBox}>
          {isRecording ? (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.recordBtn, styles.stopBtn]}
              onPress={stopRecording}
            >
              <View style={styles.stopIcon} />
              <Text style={styles.stopBtnText}>Stop Recording ({60 - durationSec}s left)</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.recordBtn}
              onPress={startRecording}
            >
              <Text style={styles.recordBtnIcon}>🔴</Text>
              <Text style={styles.recordBtnText}>Tap to Record (Max 60s)</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.playbackBox}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.playBtn}
            onPress={handlePlayPreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <Text style={styles.playBtnText}>{isPlaying ? '⏸ Pause' : '▶ Play Preview'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.7} style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Inline Player Pill for displaying on visit history items
export const InlineVoicePlayer: React.FC<{ uri: string; durationSec?: number | null }> = ({
  uri,
  durationSec,
}) => {
  const [sound, setSound] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [sound]);

  if (!isAudioAvailable || !AudioModule) {
    return (
      <View style={[styles.pillContainer, { opacity: 0.7 }]}>
        <Text style={styles.pillIcon}>🎙️</Text>
        <Text style={styles.pillText}>
          Audio Note {durationSec ? `(${durationSec}s)` : ''}
        </Text>
      </View>
    );
  }

  const togglePlay = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        } else {
          await sound.playAsync();
          setIsPlaying(true);
          return;
        }
      }

      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await AudioModule.Sound.createAsync({ uri }, { shouldPlay: true });
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch {
      // Audio preview error ignored
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.pillContainer} onPress={togglePlay}>
      <Text style={styles.pillIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      <Text style={styles.pillText}>
        Voice Note {durationSec ? `(${durationSec}s)` : ''}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 6,
  },
  unavailableBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    padding: 10,
    marginTop: 8,
  },
  unavailableText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  micIcon: {
    fontSize: 16,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timerBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timerBadgeRecording: {
    backgroundColor: '#FEE2E2',
  },
  timerText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#475569',
  },
  timerTextRecording: {
    color: '#DC2626',
  },
  recordActionBox: {
    alignItems: 'center',
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  recordBtnIcon: {
    fontSize: 14,
  },
  recordBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  stopBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#DC2626',
  },
  stopBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  playbackBox: {
    flexDirection: 'row',
    gap: 10,
  },
  playBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  playBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  pillIcon: {
    fontSize: 11,
    color: '#0D9488',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0D9488',
  },
});
