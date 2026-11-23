import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G } from 'react-native-svg';
import {
  getBmiCategory,
  BMI_GUIDELINES,
  getWeightGainCorridor,
} from '../../engine/referenceCurves';
import { analyzeWeightGain } from '../../engine/chartAnalyzers';
import { formatDMY } from './GestationalWheelTool';
import { ChartZoomModal } from './ChartZoomModal';
import { RADIUS, SHADOWS } from '../../theme';

interface ValidVisitWeight {
  visitDate: string;
  poaWeeks: number | null;
  weightKg: number | null;
  gainKg: number;
}

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<ValidVisitWeight | null>(null);

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
  const validVisits: ValidVisitWeight[] = visits
    .filter((v): v is typeof v & { poa_weeks: number; weight_kg: number } =>
      typeof v.poa_weeks === 'number' && typeof v.weight_kg === 'number'
    )
    .map((v) => ({
      visitDate: v.visit_date,
      poaWeeks: v.poa_weeks,
      weightKg: v.weight_kg,
      gainKg: +(v.weight_kg - baseWeight).toFixed(1),
    }))
    .sort((a, b) => (a.poaWeeks || 0) - (b.poaWeeks || 0));

  const analysis = analyzeWeightGain(baseWeight, calculatedBmi, validVisits);

  const screenWidth = Dimensions.get('window').width;
  const defaultWidth = Math.max(300, screenWidth - 32);
  const defaultHeight = 220;

  const minX = 12;
  const maxX = 40;
  const minY = -2;
  const maxY = 22;
  const yTicks = [0, 5, 10, 15, 20];

  const sampleWeeks = [12, 16, 20, 24, 28, 32, 36, 40];

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

  const getYConfig = (h: number) => {
    const padTop = 18;
    const padBottom = 26;
    const plotH = h - padTop - padBottom;
    const getY = (kg: number) => padTop + plotH - ((kg - minY) / (maxY - minY)) * plotH;
    return { padTop, padBottom, plotH, getY };
  };

  // Fixed Left Y-Axis for Zoomed View
  const renderFixedYAxis = (h: number) => {
    const { getY } = getYConfig(h);
    const yAxisWidth = 44;

    return (
      <Svg width={yAxisWidth} height={h}>
        <Rect x={0} y={0} width={yAxisWidth} height={h} fill="#F8FAFC" />
        <Line x1={yAxisWidth - 1} y1={0} x2={yAxisWidth - 1} y2={h} stroke="#CBD5E1" strokeWidth={1.5} />
        {yTicks.map((kg) => {
          const y = getY(kg);
          return (
            <G key={`bmi-fix-y-${kg}`}>
              <Line
                x1={yAxisWidth - 6}
                y1={y}
                x2={yAxisWidth - 1}
                y2={y}
                stroke="#94A3B8"
                strokeWidth={1.5}
              />
              <SvgText
                x={yAxisWidth - 8}
                y={y + 3.5}
                fontSize={10.5}
                fontWeight="700"
                fill="#334155"
                textAnchor="end"
              >
                {kg > 0 ? `+${kg}` : `${kg}`}kg
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  const renderPlotArea = (
    width: number,
    height: number,
    interactive = false,
    useOffsetLeft = false
  ) => {
    const padLeft = useOffsetLeft ? 38 : 6;
    const padRight = 18;
    const { padTop, padBottom, getY } = getYConfig(height);
    const plotW = width - padLeft - padRight;

    const getX = (w: number) => padLeft + ((w - minX) / (maxX - minX)) * plotW;

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

    const patientPath = validVisits
      .filter((v) => (v.poaWeeks || 0) >= 12)
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(v.poaWeeks!)} ${getY(v.gainKg)}`)
      .join(' ');

    const weeksToShow = width > 500
      ? [12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]
      : sampleWeeks;

    return (
      <Svg width={width} height={height}>
        {/* Shaded Normal Corridor */}
        <Path d={corridorPath} fill="rgba(14, 165, 233, 0.16)" />

        {/* Horizontal Grid lines */}
        {yTicks.map((kg) => {
          const y = getY(kg);
          return (
            <G key={`bmi-grid-y-${kg}`}>
              <Line
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke={kg === 0 ? '#CBD5E1' : '#E2E8F0'}
                strokeWidth={kg === 0 ? 1.5 : 1}
                strokeDasharray={kg === 0 ? undefined : '4 4'}
              />
              {useOffsetLeft && (
                <SvgText
                  x={padLeft - 6}
                  y={y + 3.5}
                  fontSize={10}
                  fontWeight="600"
                  fill="#64748B"
                  textAnchor="end"
                >
                  {kg > 0 ? `+${kg}` : `${kg}`}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* X-axis grid lines */}
        {weeksToShow.map((w) => {
          const x = getX(w);
          return (
            <G key={`bmi-grid-x-${w}`}>
              <Line
                x1={x}
                y1={padTop}
                x2={x}
                y2={height - padBottom}
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <SvgText
                x={x}
                y={height - padBottom + 16}
                fontSize={10.5}
                fontWeight="700"
                fill="#475569"
                textAnchor="middle"
              >
                {w}w
              </SvgText>
            </G>
          );
        })}

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
        <Path d={targetLinePath} stroke="#0369A1" strokeWidth={2.2} fill="none" />

        {/* Patient Gain Line */}
        {validVisits.length > 1 && (
          <Path
            d={patientPath}
            stroke="#E11D48"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Patient Data Points & Readable Pills */}
        {validVisits.map((v, i) => {
          const cx = getX(v.poaWeeks!);
          const cy = getY(v.gainKg);
          const isLatest = i === validVisits.length - 1;
          const isSelected = selectedVisit?.visitDate === v.visitDate;

          const prevV = i > 0 ? validVisits[i - 1] : null;
          const prevCx = prevV ? getX(prevV.poaWeeks!) : -999;
          const isTooClose = Math.abs(cx - prevCx) < 36;
          const shouldShowLabel = !isTooClose || isSelected || isLatest;

          return (
            <G
              key={`bmi-pt-${i}`}
              onPress={() => interactive && setSelectedVisit(v)}
            >
              {isSelected && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={14}
                  fill="rgba(225, 29, 72, 0.25)"
                />
              )}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7.5 : isLatest ? 6.5 : 5}
                fill={isSelected ? '#0F172A' : isLatest ? '#E11D48' : '#F43F5E'}
                stroke="#FFFFFF"
                strokeWidth={2.5}
              />
              {shouldShowLabel && (
                <G>
                  <Rect
                    x={cx - 18}
                    y={cy - 22}
                    width={36}
                    height={15}
                    rx={4}
                    fill="#FFFFFF"
                    stroke={isSelected ? '#E11D48' : '#CBD5E1'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <SvgText
                    x={cx}
                    y={cy - 11}
                    fontSize={9.5}
                    fontWeight="800"
                    fill={isSelected ? '#E11D48' : '#0F172A'}
                    textAnchor="middle"
                  >
                    {v.gainKg > 0 ? `+${v.gainKg}` : v.gainKg}
                  </SvgText>
                </G>
              )}
            </G>
          );
        })}
      </Svg>
    );
  };

  const renderLegend = () => (
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
  );

  const renderAssessment = () => (
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
  );

  const renderTable = () => {
    if (validVisits.length === 0) return null;
    return (
      <View style={styles.tableWrapper}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
          <Text style={[styles.thText, { flex: 1 }]}>POA</Text>
          <Text style={[styles.thText, { flex: 1.2 }]}>Weight (kg)</Text>
          <Text style={[styles.thText, { flex: 1.2 }]}>Gain (kg)</Text>
        </View>
        {validVisits.map((v, i) => (
          <TouchableOpacity
            key={`weight-row-${i}`}
            style={[
              styles.tableDataRow,
              selectedVisit?.visitDate === v.visitDate && { backgroundColor: '#EFF6FF' },
            ]}
            onPress={() => setSelectedVisit(v)}
          >
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
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
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
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(true)}
          accessibilityLabel="Expand and zoom maternal weight chart"
        >
          <Text style={styles.expandBtnText}>🔍 විශාල කරන්න</Text>
        </TouchableOpacity>
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
      {renderAssessment()}

      {/* Standard SVG Canvas */}
      <View style={styles.svgWrapper}>
        {renderPlotArea(defaultWidth, defaultHeight, false, true)}
      </View>

      {/* Legend */}
      {renderLegend()}

      {/* Toggle Measurements Table */}
      <TouchableOpacity
        style={styles.toggleTableBtn}
        onPress={() => setShowTable(!showTable)}
      >
        <Text style={styles.toggleTableText}>
          {showTable ? 'Hide Weight Table ▲' : 'Show Weight History Table ▼'}
        </Text>
      </TouchableOpacity>

      {showTable && renderTable()}

      {/* Zoom Modal with Sticky Y-Axis */}
      {isFullscreen && (
        <ChartZoomModal
          visible={isFullscreen}
          onClose={() => {
            setIsFullscreen(false);
            setSelectedVisit(null);
          }}
          title="Maternal Weight Gain Corridor"
          subtitle={`Booking: ${baseWeight} kg • BMI ${calculatedBmi} (${bmiInfo.label})`}
          badgeText={bmiInfo.label}
          baseWidth={screenWidth - 24}
          baseHeight={340}
          initialScale={1.5}
          yAxisWidth={44}
          renderYAxis={(h) => renderFixedYAxis(h)}
          renderPlot={(_scale, w, h) => renderPlotArea(w, h, true, false)}
          legend={renderLegend()}
          extraContent={
            <View>
              {selectedVisit && (
                <View style={styles.selectedPointCard}>
                  <Text style={styles.selectedPointTitle}>📍 තෝරාගත් වාර්තාව (Selected Weight)</Text>
                  <Text style={styles.selectedPointDetails}>
                    දිනය: <Text style={{ fontWeight: '700' }}>{formatDMY(selectedVisit.visitDate)}</Text> • 
                    සති: <Text style={{ fontWeight: '700' }}>{selectedVisit.poaWeeks}w</Text> • 
                    බර: <Text style={{ fontWeight: '700' }}>{selectedVisit.weightKg} kg</Text> • 
                    වැඩිවීම: <Text style={{ fontWeight: '800', color: '#E11D48' }}>{selectedVisit.gainKg > 0 ? `+${selectedVisit.gainKg}` : selectedVisit.gainKg} kg</Text>
                  </Text>
                </View>
              )}
              {renderAssessment()}
              {renderTable()}
            </View>
          }
        />
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
    ...SHADOWS.card,
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bmiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
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
  expandBtn: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  expandBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
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
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  targetValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    gap: 8,
    borderWidth: 1,
  },
  alertOptimal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  alertBelow: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  alertExcessive: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  alertIcon: {
    fontSize: 16,
  },
  alertTextEn: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
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
    gap: 6,
  },
  legendBox: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
  toggleTableBtn: {
    marginTop: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  toggleTableText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  tableWrapper: {
    marginTop: 6,
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
    color: '#64748B',
  },
  tableDataRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  tdText: {
    fontSize: 10,
    color: '#1E293B',
  },
  selectedPointCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectedPointTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  selectedPointDetails: {
    fontSize: 12,
    color: '#1E293B',
  },
});
