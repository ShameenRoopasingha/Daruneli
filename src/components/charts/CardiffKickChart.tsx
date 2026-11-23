import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { analyzeCardiffKickCount, KickLogInput } from '../../engine/chartAnalyzers';
import { addKickLog } from '../../db/clinicalChartRepo';

interface CardiffKickChartProps {
  pregnancyId: string;
  kickLogs: KickLogInput[];
  onRefreshLogs?: () => void;
  poaWeeks?: number | null;
}

export const CardiffKickChart: React.FC<CardiffKickChartProps> = ({
  pregnancyId,
  kickLogs,
  onRefreshLogs,
  poaWeeks,
}) => {
  const [isLogModalVisible, setIsLogModalVisible] = useState(false);
  const [logDate, setLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [tenthKickTime, setTenthKickTime] = useState('11:30');
  const [kickCount, setKickCount] = useState('10');
  const [reducedFlag, setReducedFlag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const analysis = analyzeCardiffKickCount(kickLogs);

  // Take the last 7 to 14 days sorted ascending
  const displayLogs = [...kickLogs]
    .sort((a, b) => (a.logDate || a.log_date || '').localeCompare(b.logDate || b.log_date || ''))
    .slice(-10);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const chartHeight = 180;

  const padLeft = 38;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  // Max duration up to 14 hours (840 minutes) for chart scale
  const maxMinutes = 840;
  const getY = (mins: number) => padTop + plotH - (Math.min(maxMinutes, mins) / maxMinutes) * plotH;

  const calculateMinutesBetween = (start: string, end: string): number => {
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      let diff = eh * 60 + em - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // crossed midnight
      return diff;
    } catch {
      return 120;
    }
  };

  const handleSaveLog = () => {
    if (!pregnancyId) return;
    const count = parseInt(kickCount, 10) || 10;
    const duration = calculateMinutesBetween(startTime, tenthKickTime);

    const performSave = async () => {
      setIsSaving(true);
      try {
        await addKickLog({
          pregnancy_id: pregnancyId,
          log_date: logDate,
          start_time: startTime,
          tenth_kick_time: tenthKickTime,
          kick_count: count,
          duration_minutes: duration,
          reduced_movement_flag: reducedFlag ? 1 : 0,
        });
        setIsLogModalVisible(false);
        if (onRefreshLogs) onRefreshLogs();
      } catch (e) {
        console.warn('Error saving kick log:', e);
      } finally {
        setIsSaving(false);
      }
    };

    if (reducedFlag || duration > 720) {
      Alert.alert(
        '⚠️ Critical Fetal Movement Alert',
        `You are recording prolonged kick duration (${Math.round(duration / 60)} hours > 12h limit) or reduced movements. This flags high-risk fetal distress for urgent obstetric review. Confirm saving this clinical record?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Critical Record', style: 'destructive', onPress: performSave },
        ]
      );
      return;
    }

    performSave();
  };

  const barWidth = Math.max(16, Math.min(28, (plotW / (displayLogs.length || 1)) - 8));

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>Cardiff Count-to-10 Kick Chart</Text>
            {typeof poaWeeks === 'number' && poaWeeks >= 28 && (
              <View style={styles.activePill}>
                <Text style={styles.activePillText}>Active (28w+)</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitle}>
            දරු චලන සටහන් පත්‍රිකාව • Daily time taken to reach 10 kicks
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setIsLogModalVisible(true)}
        >
          <Text style={styles.logBtnText}>+ Log Kicks</Text>
        </TouchableOpacity>
      </View>

      {/* Clinical Warning Banner if Reduced Movements */}
      <View
        style={[
          styles.alertBanner,
          analysis.hasReducedMovementAlert ? styles.alertDanger : styles.alertNormal,
        ]}
      >
        <Text style={styles.alertIcon}>
          {analysis.hasReducedMovementAlert ? '🚨' : '✓'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.alertTextEn,
              analysis.hasReducedMovementAlert ? styles.textDanger : styles.textNormal,
            ]}
          >
            {analysis.alertEn}
          </Text>
          <Text style={styles.alertTextSi}>{analysis.alertSi}</Text>
        </View>
      </View>

      {/* SVG Bar Chart */}
      {displayLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🦶</Text>
          <Text style={styles.emptyText}>
            No kick recordings logged yet. Tap &quot;+ Log Kicks&quot; to start daily tracking.
          </Text>
        </View>
      ) : (
        <View style={styles.svgWrapper}>
          <Svg width={chartWidth} height={chartHeight}>
            {/* Safe 12-Hour Limit Reference Line (720 min) */}
            <Line
              x1={padLeft}
              y1={getY(720)}
              x2={chartWidth - padRight}
              y2={getY(720)}
              stroke="#EF4444"
              strokeWidth={1.5}
              strokeDasharray="4, 3"
            />
            <SvgText
              x={chartWidth - padRight - 4}
              y={getY(720) - 4}
              fontSize={9}
              fontWeight="bold"
              fill="#EF4444"
              textAnchor="end"
            >
              12h Red Alert Limit
            </SvgText>

            {/* Grid Lines for 2h, 4h, 8h, 12h */}
            {[120, 240, 480, 720].map((mins) => {
              const y = getY(mins);
              const hrs = mins / 60;
              return (
                <G key={`kick-grid-${mins}`}>
                  <Line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={padLeft - 6}
                    y={y + 4}
                    fontSize={10}
                    fontWeight="600"
                    fill="#64748B"
                    textAnchor="end"
                  >
                    {hrs}h
                  </SvgText>
                </G>
              );
            })}

            {/* Bars for Each Day */}
            {displayLogs.map((log, i) => {
              const count = displayLogs.length;
              const spacing = plotW / count;
              const x = padLeft + i * spacing + (spacing - barWidth) / 2;
              const duration = log.durationMinutes ?? log.duration_minutes ?? 120;
              const isReduced =
                (log.reducedMovementFlag ?? log.reduced_movement_flag ?? 0) === 1 ||
                duration > 720 ||
                (log.kickCount ?? log.kick_count ?? 10) < 10;
              const barH = Math.min(plotH, (duration / maxMinutes) * plotH);
              const y = padTop + plotH - barH;

              // Format date day/month
              const dateVal = log.logDate || log.log_date || '';
              const dayStr = dateVal.slice(8, 10);
              const monthStr = dateVal.slice(5, 7);

              return (
                <G key={`kick-bar-${i}`}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={4}
                    fill={isReduced ? '#EF4444' : '#10B981'}
                  />
                  {/* Top value in hours */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={Math.max(padTop + 10, y - 4)}
                    fontSize={8}
                    fontWeight="bold"
                    fill="#1E293B"
                    textAnchor="middle"
                  >
                    {Math.round(duration / 60)}h
                  </SvgText>
                  {/* Bottom date label */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight - padBottom + 14}
                    fontSize={9}
                    fontWeight="600"
                    fill="#64748B"
                    textAnchor="middle"
                  >
                    {`${dayStr}/${monthStr}`}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
      )}

      {/* Legend & Stats */}
      <View style={styles.footerRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#10B981' }]} />
          <Text style={styles.legendText}>Normal (&lt; 12h)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Reduced Movement (&gt; 12h)</Text>
        </View>
      </View>

      {/* Log Modal */}
      <Modal visible={isLogModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Log Daily Fetal Kicks</Text>
                <TouchableOpacity onPress={() => setIsLogModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={logDate}
                onChangeText={setLogDate}
                placeholder="YYYY-MM-DD"
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <TextInput
                    style={styles.input}
                    value={startTime}
                    onChangeText={setStartTime}
                    placeholder="09:00"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>10th Kick Time</Text>
                  <TextInput
                    style={styles.input}
                    value={tenthKickTime}
                    onChangeText={setTenthKickTime}
                    placeholder="11:30"
                  />
                </View>
              </View>

              <Text style={styles.formLabel}>Kicks Counted</Text>
              <TextInput
                style={styles.input}
                value={kickCount}
                onChangeText={setKickCount}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={[styles.checkboxRow, reducedFlag && styles.checkboxRowActive]}
                onPress={() => setReducedFlag(!reducedFlag)}
              >
                <View style={[styles.checkbox, reducedFlag && styles.checkboxActive]}>
                  {reducedFlag && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Mother reported reduced / weak fetal movement today
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && { opacity: 0.6 }]}
                onPress={handleSaveLog}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Saving...' : 'Save Kick Log'}
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
  activePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  alertNormal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  alertDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  alertIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  alertTextEn: {
    fontSize: 12,
    fontWeight: '700',
  },
  textNormal: {
    color: '#15803D',
  },
  textDanger: {
    color: '#B91C1C',
  },
  alertTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 240,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#64748B',
    padding: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  rowInputs: {
    flexDirection: 'row',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  checkboxRowActive: {
    backgroundColor: '#FEF2F2',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
