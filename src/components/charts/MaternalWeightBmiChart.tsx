import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import {
  getBmiCategory,
  BMI_GUIDELINES,
  getWeightGainCorridor,
} from '../../engine/referenceCurves';
import { analyzeWeightGain } from '../../engine/chartAnalyzers';
import { formatDMY } from './GestationalWheelTool';

interface MaternalWeightBmiChartProps {
  bookingWeightKg?: number | null;
  bookingHeightCm?: number | null;
  bookingBmi?: number | null;
  visits: {
    visit_date: string;
    poa_weeks: number | null;
    weight_kg?: number | null;
  }[];
}

export const MaternalWeightBmiChart: React.FC<MaternalWeightBmiChartProps> = ({
  bookingWeightKg,
  bookingHeightCm,
  bookingBmi,
  visits,
}) => {
  const [showTable, setShowTable] = useState(false);

  // Compute BMI if missing but weight and height are present
  const calculatedBmi =
    bookingBmi ||
    (bookingWeightKg && bookingHeightCm && bookingHeightCm > 0
      ? +(bookingWeightKg / Math.pow(bookingHeightCm / 100, 2)).toFixed(1)
      : 22.5);

  const baseWeight = bookingWeightKg || 60.0;
  const bmiCat = getBmiCategory(calculatedBmi);
  const bmiInfo = BMI_GUIDELINES[bmiCat];

  // Filter valid visits with weight measurements
  const validVisits = visits
    .filter((v) => typeof v.poa_weeks === 'number' && typeof v.weight_kg === 'number')
    .map((v) => ({
      visitDate: v.visit_date,
      poaWeeks: v.poa_weeks,
      weightKg: v.weight_kg,
      gainKg: +(v.weight_kg! - baseWeight).toFixed(1),
    }))
    .sort((a, b) => (a.poaWeeks || 0) - (b.poaWeeks || 0));

  const analysis = analyzeWeightGain(baseWeight, calculatedBmi, validVisits);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const chartHeight = 200;

  const padLeft = 36;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const minX = 12;
  const maxX = 40;
  const minY = -2;
  const maxY = 22;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const getX = (w: number) => padLeft + ((w - minX) / (maxX - minX)) * plotW;
  const getY = (kg: number) => padTop + plotH - ((kg - minY) / (maxY - minY)) * plotH;

  // Build corridor points at intervals 12, 16, 20, 24, 28, 32, 36, 40 weeks
  const sampleWeeks = [12, 16, 20, 24, 28, 32, 36, 40];
  const corridorPts = sampleWeeks.map((w) => {
    const c = getWeightGainCorridor(calculatedBmi, w);
    return { week: w, min: c.minGain, max: c.maxGain, target: c.targetGain };
  });

  const minGainPoints = corridorPts.map((p) => `${getX(p.week)},${getY(p.min)}`);
  const maxGainPointsRev = [...corridorPts].reverse().map((p) => `${getX(p.week)},${getY(p.max)}`);
  const corridorPath = `M ${minGainPoints.join(' L ')} L ${maxGainPointsRev.join(' L ')} Z`;
  const targetLinePath = corridorPts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.target)}`)
    .join(' ');

  // Patient weight gain line
  const patientPath = validVisits
    .filter((v) => (v.poaWeeks || 0) >= 12)
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(v.poaWeeks!)} ${getY(v.gainKg)}`)
    .join(' ');

  const getBmiBadgeStyle = () => {
    switch (bmiCat) {
      case 'UNDERWEIGHT':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'NORMAL':
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
      case 'OVERWEIGHT':
        return { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' };
      case 'OBESE':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
    }
  };

  const badgeTheme = getBmiBadgeStyle();

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>Maternal Weight Gain & BMI</Text>
            <View
              style={[
                styles.bmiBadge,
                { backgroundColor: badgeTheme.bg, borderColor: badgeTheme.border },
              ]}
            >
              <Text style={[styles.bmiBadgeText, { color: badgeTheme.text }]}>
                BMI {calculatedBmi} • {bmiInfo.label}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            මව්ගේ බර වැඩිවීම හා BMI ප්‍රස්තාරය • Booking: {baseWeight} kg
          </Text>
        </View>
      </View>

      {/* Target recommendation info strip */}
      <View style={styles.targetStrip}>
        <View style={styles.targetCol}>
          <Text style={styles.targetLabel}>Target Total Gain</Text>
          <Text style={styles.targetValue}>
            {bmiInfo.minGainKg} - {bmiInfo.maxGainKg} kg
          </Text>
        </View>
        <View style={styles.targetCol}>
          <Text style={styles.targetLabel}>Current Gain</Text>
          <Text style={[styles.targetValue, { color: '#2563EB' }]}>
            {analysis.totalGainKg > 0 ? `+${analysis.totalGainKg}` : analysis.totalGainKg} kg
          </Text>
        </View>
        <View style={styles.targetCol}>
          <Text style={styles.targetLabel}>Rate (2nd/3rd Tri)</Text>
          <Text style={styles.targetValue}>~{bmiInfo.ratePerWeek2nd3rd} kg/wk</Text>
        </View>
      </View>

      {/* Clinical Assessment Alert */}
      <View
        style={[
          styles.alertBanner,
          analysis.status === 'OPTIMAL' && styles.alertOptimal,
          analysis.status === 'BELOW_TARGET' && styles.alertBelow,
          analysis.status === 'EXCESSIVE' && styles.alertExcessive,
        ]}
      >
        <Text style={styles.alertIcon}>
          {analysis.status === 'OPTIMAL' ? '✓' : '⚠️'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertTextEn}>{analysis.messageEn}</Text>
          <Text style={styles.alertTextSi}>{analysis.messageSi}</Text>
        </View>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Y-axis grid lines (0, 5, 10, 15, 20 kg gain) */}
          {[0, 5, 10, 15, 20].map((kg) => {
            const y = getY(kg);
            return (
              <G key={`grid-y-${kg}`}>
                <Line
                  x1={padLeft}
                  y1={y}
                  x2={chartWidth - padRight}
                  y2={y}
                  stroke={kg === 0 ? '#CBD5E1' : '#F1F5F9'}
                  strokeWidth={kg === 0 ? 1.5 : 1}
                />
                <SvgText
                  x={padLeft - 6}
                  y={y + 4}
                  fontSize={10}
                  fontWeight="600"
                  fill="#64748B"
                  textAnchor="end"
                >
                  {kg > 0 ? `+${kg}` : `${kg}`}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis grid lines (12, 16, 20, 24, 28, 32, 36, 40 weeks) */}
          {sampleWeeks.map((w) => {
            const x = getX(w);
            return (
              <G key={`grid-x-${w}`}>
                <Line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={chartHeight - padBottom}
                  stroke="#F1F5F9"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={chartHeight - padBottom + 16}
                  fontSize={10}
                  fontWeight="600"
                  fill="#64748B"
                  textAnchor="middle"
                >
                  {w}w
                </SvgText>
              </G>
            );
          })}

          {/* Shaded Normal Weight Gain Corridor */}
          <Path d={corridorPath} fill="rgba(14, 165, 233, 0.15)" />

          {/* Min & Max Corridor Boundaries */}
          <Path
            d={corridorPts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.min)}`)
              .join(' ')}
            stroke="#0284C7"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />
          <Path
            d={corridorPts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.max)}`)
              .join(' ')}
            stroke="#0284C7"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />

          {/* Target Gain Median Line */}
          <Path d={targetLinePath} stroke="#0369A1" strokeWidth={2} fill="none" />

          {/* Patient Gain Line */}
          {validVisits.length > 1 && (
            <Path
              d={patientPath}
              stroke="#E11D48"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Patient Data Points */}
          {validVisits.map((v, i) => {
            const cx = getX(v.poaWeeks!);
            const cy = getY(v.gainKg);
            const isLatest = i === validVisits.length - 1;
            return (
              <G key={`pt-${i}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? 6 : 4.5}
                  fill={isLatest ? '#E11D48' : '#F43F5E'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <SvgText
                  x={cx}
                  y={cy - 8}
                  fontSize={9}
                  fontWeight="bold"
                  fill="#1E293B"
                  textAnchor="middle"
                >
                  {v.gainKg > 0 ? `+${v.gainKg}` : v.gainKg}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#E11D48' }]} />
          <Text style={styles.legendText}>Actual Gain (මවගේ බර වැඩිවීම)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#0369A1' }]} />
          <Text style={styles.legendText}>Target Median</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(14, 165, 233, 0.3)' }]} />
          <Text style={styles.legendText}>Healthy Gain Corridor</Text>
        </View>
      </View>

      {/* Toggle Measurements Table */}
      <TouchableOpacity
        style={styles.toggleTableBtn}
        onPress={() => setShowTable(!showTable)}
      >
        <Text style={styles.toggleTableText}>
          {showTable ? 'Hide Weight Table ▲' : 'Show Weight History Table ▼'}
        </Text>
      </TouchableOpacity>

      {showTable && validVisits.length > 0 && (
        <View style={styles.tableWrapper}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.thText, { flex: 1 }]}>POA</Text>
            <Text style={[styles.thText, { flex: 1.2 }]}>Weight (kg)</Text>
            <Text style={[styles.thText, { flex: 1.2 }]}>Gain (kg)</Text>
          </View>
          {validVisits.map((v, i) => (
            <View key={`weight-row-${i}`} style={styles.tableDataRow}>
              <Text style={[styles.tdText, { flex: 1.2 }]}>{formatDMY(v.visitDate)}</Text>
              <Text style={[styles.tdText, { flex: 1, fontWeight: '700' }]}>{v.poaWeeks}w</Text>
              <Text style={[styles.tdText, { flex: 1.2 }]}>{v.weightKg} kg</Text>
              <Text
                style={[
                  styles.tdText,
                  { flex: 1.2, fontWeight: '800', color: '#E11D48' },
                ]}
              >
                {v.gainKg > 0 ? `+${v.gainKg}` : v.gainKg} kg
              </Text>
            </View>
          ))}
        </View>
      )}
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
  bmiBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bmiBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  targetStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  targetCol: {
    flex: 1,
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  targetValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
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
  alertOptimal: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  alertBelow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  alertExcessive: {
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
    color: '#1E293B',
  },
  alertTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  toggleTableBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 6,
  },
  toggleTableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  tableWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 4,
    marginBottom: 4,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  tdText: {
    fontSize: 10,
    color: '#1E293B',
  },
});
