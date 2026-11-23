import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { evaluateMeows, MeowsInput, MeowsAlertLevel } from '../../engine/meowsEngine';
import { addMeowsLog, PostnatalMeows } from '../../db/clinicalChartRepo';
import { formatDMY } from './GestationalWheelTool';

interface MeowsChartProps {
  pregnancyId: string;
  meowsLogs: PostnatalMeows[];
  onRefreshLogs?: () => void;
}

export const MeowsChart: React.FC<MeowsChartProps> = ({
  pregnancyId,
  meowsLogs,
  onRefreshLogs,
}) => {
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);

  // Form states for new check
  const [daysPostpartum, setDaysPostpartum] = useState('5');
  const [bpSystolic, setBpSystolic] = useState('120');
  const [bpDiastolic, setBpDiastolic] = useState('80');
  const [pulse, setPulse] = useState('78');
  const [respRate, setRespRate] = useState('16');
  const [temp, setTemp] = useState('36.8');
  const [lochia, setLochia] = useState('NORMAL');
  const [isSaving, setIsSaving] = useState(false);

  // Current live evaluation for modal
  const liveInput: MeowsInput = {
    bpSystolic: parseInt(bpSystolic, 10) || 120,
    bpDiastolic: parseInt(bpDiastolic, 10) || 80,
    pulseBpm: parseInt(pulse, 10) || 78,
    respRate: parseInt(respRate, 10) || 16,
    tempC: parseFloat(temp) || 36.8,
    lochiaBleeding: lochia,
  };
  const liveEval = evaluateMeows(liveInput);

  // Latest historical record
  const sortedLogs = [...meowsLogs].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at));
  const latestLog = sortedLogs[0];

  const latestEval = latestLog
    ? evaluateMeows({
        bpSystolic: latestLog.bp_systolic,
        bpDiastolic: latestLog.bp_diastolic,
        pulseBpm: latestLog.pulse_bpm,
        respRate: latestLog.resp_rate,
        tempC: latestLog.temp_c,
        lochiaBleeding: latestLog.lochia_bleeding,
      })
    : null;

  const handleSaveCheck = () => {
    if (!pregnancyId) return;

    const performSave = async () => {
      setIsSaving(true);
      try {
        await addMeowsLog({
          pregnancy_id: pregnancyId,
          days_postpartum: parseInt(daysPostpartum, 10) || 1,
          bp_systolic: liveInput.bpSystolic,
          bp_diastolic: liveInput.bpDiastolic,
          pulse_bpm: liveInput.pulseBpm,
          resp_rate: liveInput.respRate,
          temp_c: liveInput.tempC,
          lochia_bleeding: liveInput.lochiaBleeding,
          alert_level: liveEval.alertLevel,
          action_advice: liveEval.actionAdviceEn,
        });
        setIsLogModalVisible(false);
        if (onRefreshLogs) onRefreshLogs();
      } catch (e) {
        console.warn('Error saving MEOWS check:', e);
      } finally {
        setIsSaving(false);
      }
    };

    if (liveEval.alertLevel === 'RED') {
      Alert.alert(
        '🚨 CRITICAL MEOWS RED ALERT',
        `Maternal vitals trigger an immediate RED alert:\n\n• Action Required: ${liveEval.actionAdviceEn}\n• උපදෙස්: ${liveEval.actionAdviceSi}\n\nConfirm recording this critical emergency vitals check?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Critical Check', style: 'destructive', onPress: performSave },
        ]
      );
      return;
    }

    performSave();
  };

  const getAlertBadgeStyle = (level: MeowsAlertLevel) => {
    switch (level) {
      case 'RED':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5', label: 'CRITICAL RED' };
      case 'YELLOW':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D', label: 'WARNING YELLOW' };
      case 'WHITE':
      default:
        return { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC', label: 'NORMAL WHITE' };
    }
  };

  const currentTheme = latestEval ? getAlertBadgeStyle(latestEval.alertLevel) : getAlertBadgeStyle('WHITE');

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>Postnatal MEOWS Chart</Text>
            {latestEval && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: currentTheme.bg, borderColor: currentTheme.border },
                ]}
              >
                <Text style={[styles.statusBadgeText, { color: currentTheme.text }]}>
                  {currentTheme.label}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            ප්‍රසවයෙන් පසු අනතුරු ඇඟවීමේ ක්‍රමය • Vital Signs Strip
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setIsLogModalVisible(true)}
        >
          <Text style={styles.logBtnText}>+ Log Vitals</Text>
        </TouchableOpacity>
      </View>

      {/* Latest Evaluation Banner */}
      {latestEval ? (
        <View
          style={[
            styles.banner,
            latestEval.alertLevel === 'RED' && styles.bannerRed,
            latestEval.alertLevel === 'YELLOW' && styles.bannerYellow,
            latestEval.alertLevel === 'WHITE' && styles.bannerWhite,
          ]}
        >
          <Text style={styles.bannerIcon}>
            {latestEval.alertLevel === 'RED' ? '🚨' : latestEval.alertLevel === 'YELLOW' ? '⚠️' : '✓'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.bannerTextEn,
                latestEval.alertLevel === 'RED' && styles.textRed,
                latestEval.alertLevel === 'YELLOW' && styles.textYellow,
                latestEval.alertLevel === 'WHITE' && styles.textWhite,
              ]}
            >
              {latestEval.actionAdviceEn}
            </Text>
            <Text style={styles.bannerTextSi}>{latestEval.actionAdviceSi}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🩺</Text>
          <Text style={styles.emptyText}>
            No postnatal MEOWS check recorded yet. Tap &quot;+ Log Vitals&quot; to perform an assessment.
          </Text>
        </View>
      )}

      {/* Latest Vitals Parameter Grid */}
      {latestEval && latestLog && (
        <View style={styles.vitalsSection}>
          <Text style={styles.sectionHeading}>
            Latest Vitals: Day {latestLog.days_postpartum} Postpartum ({formatDMY(latestLog.recorded_at)})
          </Text>
          <View style={styles.grid}>
            {latestEval.parameters.map((param) => {
              const isRed = param.status === 'RED';
              const isYellow = param.status === 'YELLOW';
              return (
                <View
                  key={param.name}
                  style={[
                    styles.vitalTile,
                    isRed && styles.tileRed,
                    isYellow && styles.tileYellow,
                  ]}
                >
                  <Text style={styles.tileLabel}>{param.labelEn}</Text>
                  <Text
                    style={[
                      styles.tileValue,
                      isRed && { color: '#B91C1C' },
                      isYellow && { color: '#B45309' },
                    ]}
                  >
                    {param.displayValue}
                  </Text>
                  <View
                    style={[
                      styles.tileTag,
                      isRed && styles.tileTagRed,
                      isYellow && styles.tileTagYellow,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tileTagText,
                        isRed && styles.tileTagTextRed,
                        isYellow && styles.tileTagTextYellow,
                      ]}
                    >
                      {param.status}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Historical Checks Log */}
      {sortedLogs.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.sectionHeading}>Postpartum Check-up History</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Day</Text>
            <Text style={[styles.th, { flex: 1.2 }]}>BP</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Pulse</Text>
            <Text style={[styles.th, { flex: 1 }]}>Status</Text>
          </View>
          {sortedLogs.map((log) => {
            const theme = getAlertBadgeStyle(log.alert_level);
            return (
              <View key={log.id} style={styles.tableRow}>
                <Text style={[styles.td, { flex: 1.2 }]}>{formatDMY(log.recorded_at)}</Text>
                <Text style={[styles.td, { flex: 0.8, fontWeight: '700' }]}>
                  Day {log.days_postpartum}
                </Text>
                <Text style={[styles.td, { flex: 1.2 }]}>
                  {log.bp_systolic}/{log.bp_diastolic}
                </Text>
                <Text style={[styles.td, { flex: 0.8 }]}>{log.pulse_bpm}</Text>
                <View style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.rowBadge,
                      { backgroundColor: theme.bg, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[styles.rowBadgeText, { color: theme.text }]}>
                      {log.alert_level}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Log MEOWS Modal */}
      <Modal visible={isLogModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Record Postnatal MEOWS Check</Text>
                <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Live Status Preview */}
              <View
                style={[
                  styles.previewBox,
                  liveEval.alertLevel === 'RED' && styles.bannerRed,
                  liveEval.alertLevel === 'YELLOW' && styles.bannerYellow,
                  liveEval.alertLevel === 'WHITE' && styles.bannerWhite,
                ]}
              >
                <Text style={styles.previewTitle}>
                  Calculated Score: {liveEval.alertLevel}
                  {liveEval.redCount > 0 && ` (${liveEval.redCount} Red Trigger)`}
                  {liveEval.yellowCount > 0 && ` (${liveEval.yellowCount} Yellow Trigger)`}
                </Text>
                <Text style={styles.previewDesc}>{liveEval.actionAdviceEn}</Text>
              </View>

              <Text style={styles.formLabel}>Days Postpartum (ප්‍රසවයෙන් පසු දින ගණන)</Text>
              <TextInput
                style={styles.input}
                value={daysPostpartum}
                onChangeText={setDaysPostpartum}
                keyboardType="numeric"
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Systolic BP (mmHg)</Text>
                  <TextInput
                    style={styles.input}
                    value={bpSystolic}
                    onChangeText={setBpSystolic}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Diastolic BP (mmHg)</Text>
                  <TextInput
                    style={styles.input}
                    value={bpDiastolic}
                    onChangeText={setBpDiastolic}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Pulse (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    value={pulse}
                    onChangeText={setPulse}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Resp Rate (/min)</Text>
                  <TextInput
                    style={styles.input}
                    value={respRate}
                    onChangeText={setRespRate}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Temperature (°C)</Text>
                  <TextInput
                    style={styles.input}
                    value={temp}
                    onChangeText={setTemp}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Lochia Bleeding</Text>
                  <TextInput
                    style={styles.input}
                    value={lochia}
                    onChangeText={setLochia}
                    placeholder="NORMAL / FRESH_RED / EXCESSIVE"
                  />
                </View>
              </View>

              {/* Lochia Quick Selector */}
              <View style={styles.lochiaChipRow}>
                {['NORMAL', 'FRESH_RED', 'CLOTS', 'EXCESSIVE', 'OFFENSIVE'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.chip,
                      lochia === opt && styles.chipActive,
                    ]}
                    onPress={() => setLochia(opt)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        lochia === opt && styles.chipTextActive,
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveCheck}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Saving...' : 'Save MEOWS Assessment'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  logBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  bannerWhite: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  bannerRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerTextEn: {
    fontSize: 12,
    fontWeight: '700',
  },
  textWhite: {
    color: '#15803D',
  },
  textYellow: {
    color: '#B45309',
  },
  textRed: {
    color: '#B91C1C',
  },
  bannerTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
  vitalsSection: {
    marginTop: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vitalTile: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  tileYellow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  tileRed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  tileLabel: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'center',
  },
  tileValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
    textAlign: 'center',
  },
  tileTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tileTagYellow: {
    backgroundColor: '#FEF3C7',
  },
  tileTagRed: {
    backgroundColor: '#FEE2E2',
  },
  tileTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#166534',
  },
  tileTagTextYellow: {
    color: '#92400E',
  },
  tileTagTextRed: {
    color: '#991B1B',
  },
  historySection: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  td: {
    fontSize: 11,
    color: '#1E293B',
  },
  rowBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  rowBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    padding: 4,
  },
  previewBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  previewDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 3,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 8,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  lochiaChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#0F172A',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
