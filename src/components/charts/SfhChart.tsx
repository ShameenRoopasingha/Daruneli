import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import {
  SFH_REFERENCE_TABLE,
} from '../../engine/referenceCurves';
import { analyzeSfh, SfhVisitInput } from '../../engine/chartAnalyzers';
import { formatDMY } from './GestationalWheelTool';

interface SfhChartProps {
  visits: {
    visit_date: string;
    poa_weeks: number | null;
    sfh_cm?: number | null;
  }[];
  motherName?: string;
}

export const SfhChart: React.FC<SfhChartProps> = ({ visits, motherName }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter valid visits with SFH
  const validVisits: SfhVisitInput[] = visits
    .filter((v) => typeof v.poa_weeks === 'number' && typeof v.sfh_cm === 'number' && (v.poa_weeks || 0) >= 16)
    .map((v) => ({
      visitDate: v.visit_date,
      poaWeeks: v.poa_weeks,
      sfhCm: v.sfh_cm,
    }))
    .sort((a, b) => (a.poaWeeks || 0) - (b.poaWeeks || 0));

  const analysis = analyzeSfh(validVisits);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = isFullscreen ? screenWidth - 32 : screenWidth - 32;
  const chartHeight = isFullscreen ? 320 : 210;

  const padLeft = 38;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 28;

  const minX = 16;
  const maxX = 40;
  const minY = 10;
  const maxY = 45;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const getX = (week: number) => padLeft + ((week - minX) / (maxX - minX)) * plotW;
  const getY = (cm: number) => padTop + plotH - ((cm - minY) / (maxY - minY)) * plotH;

  // Build SVG polygon path for 10th to 90th centile shaded corridor
  const p10Points = SFH_REFERENCE_TABLE.map((p) => `${getX(p.week)},${getY(p.p10)}`);
  const p90PointsReversed = [...SFH_REFERENCE_TABLE].reverse().map((p) => `${getX(p.week)},${getY(p.p90)}`);
  const corridorPath = `M ${p10Points.join(' L ')} L ${p90PointsReversed.join(' L ')} Z`;

  // Median 50th centile line
  const p50Path = SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p50)}`).join(' ');

  // Patient's recorded visits path
  const patientPath = validVisits
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(v.poaWeeks!)} ${getY(v.sfhCm!)}`)
    .join(' ');

  const renderContent = () => (
    <View style={styles.card}>
      {/* Chart Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.chartTitle}>Symphysis-Fundal Height (SFH)</Text>
            <View style={styles.standardBadge}>
              <Text style={styles.standardBadgeText}>FHB Standard</Text>
            </View>
          </View>
          <Text style={styles.chartSubtitle}>
            ගර්භාෂ උස ප්‍රස්තාරය (සති 16 - 40) • 10th - 90th Centiles
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(!isFullscreen)}
          accessibilityLabel="Toggle fullscreen chart"
        >
          <Text style={styles.expandBtnText}>{isFullscreen ? '✕ Close' : '⛶ Zoom'}</Text>
        </TouchableOpacity>
      </View>

      {/* Clinical Alert Banner */}
      <View
        style={[
          styles.alertBanner,
          analysis.status === 'NORMAL' && styles.alertNormal,
          (analysis.status === 'SGA' || analysis.status === 'LGA') && styles.alertWarning,
          analysis.status === 'STATIC_GROWTH' && styles.alertDanger,
        ]}
      >
        <Text style={styles.alertIcon}>
          {analysis.status === 'NORMAL' ? '✓' : analysis.status === 'STATIC_GROWTH' ? '⚠️' : 'ℹ️'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.alertTextEn,
              analysis.status === 'NORMAL' && styles.textNormal,
              (analysis.status === 'SGA' || analysis.status === 'LGA') && styles.textWarning,
              analysis.status === 'STATIC_GROWTH' && styles.textDanger,
            ]}
          >
            {analysis.alertEn}
          </Text>
          <Text style={styles.alertTextSi}>{analysis.alertSi}</Text>
        </View>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Background Grid Lines (Y-axis: 15, 20, 25, 30, 35, 40 cm) */}
          {[15, 20, 25, 30, 35, 40].map((val) => {
            const y = getY(val);
            return (
              <G key={`grid-y-${val}`}>
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
                  {val}
                </SvgText>
              </G>
            );
          })}

          {/* Background Grid Lines (X-axis: 16, 20, 24, 28, 32, 36, 40 weeks) */}
          {[16, 20, 24, 28, 32, 36, 40].map((w) => {
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

          {/* 10th to 90th Centile Shaded Normal Corridor */}
          <Path d={corridorPath} fill="rgba(16, 185, 129, 0.15)" />

          {/* 10th Centile Line (SGA lower limit) */}
          <Path
            d={SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p10)}`).join(' ')}
            stroke="#10B981"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />

          {/* 90th Centile Line (LGA upper limit) */}
          <Path
            d={SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p90)}`).join(' ')}
            stroke="#10B981"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />

          {/* 50th Centile Median Line */}
          <Path d={p50Path} stroke="#059669" strokeWidth={2} fill="none" />

          {/* Patient SFH Curve */}
          {validVisits.length > 1 && (
            <Path
              d={patientPath}
              stroke="#2563EB"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Patient SFH Data Points */}
          {validVisits.map((v, idx) => {
            const cx = getX(v.poaWeeks!);
            const cy = getY(v.sfhCm!);
            const isLatest = idx === validVisits.length - 1;
            return (
              <G key={`patient-pt-${idx}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? 6 : 4.5}
                  fill={isLatest ? '#2563EB' : '#3B82F6'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <SvgText
                  x={cx}
                  y={cy - 9}
                  fontSize={9}
                  fontWeight="bold"
                  fill="#1E293B"
                  textAnchor="middle"
                >
                  {v.sfhCm}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Chart Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#2563EB' }]} />
          <Text style={styles.legendText}>Mother&apos;s SFH (මවගේ උස)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#059669' }]} />
          <Text style={styles.legendText}>50th Centile Median</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(16, 185, 129, 0.3)' }]} />
          <Text style={styles.legendText}>10th - 90th Corridor</Text>
        </View>
      </View>

      {/* Measurement Table Snippet */}
      {validVisits.length > 0 && (
        <View style={styles.tableWrapper}>
          <Text style={styles.tableHeading}>Recorded Visits History</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.thText, { flex: 1 }]}>POA</Text>
            <Text style={[styles.thText, { flex: 1 }]}>SFH (cm)</Text>
            <Text style={[styles.thText, { flex: 1.5 }]}>Centile Range</Text>
          </View>
          {validVisits.map((v, i) => (
            <View key={`hist-${i}`} style={styles.tableDataRow}>
              <Text style={[styles.tdText, { flex: 1.2 }]}>{formatDMY(v.visitDate)}</Text>
              <Text style={[styles.tdText, { flex: 1, fontWeight: '700' }]}>{v.poaWeeks}w</Text>
              <Text style={[styles.tdText, { flex: 1, color: '#2563EB', fontWeight: '800' }]}>
                {v.sfhCm} cm
              </Text>
              <Text style={[styles.tdText, { flex: 1.5, color: '#059669' }]}>
                10th-90th Normal
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (isFullscreen) {
    return (
      <Modal visible={isFullscreen} animationType="fade" transparent={false}>
        <ScrollView style={styles.fullscreenScroll} contentContainerStyle={{ padding: 16 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.fullscreenTitle}>
              Full Standardized SFH Midwifery Chart {motherName ? `• ${motherName}` : ''}
            </Text>
          </View>
          {renderContent()}
        </ScrollView>
      </Modal>
    );
  }

  return renderContent();
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
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  standardBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  standardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  chartSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expandBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  expandBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
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
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
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
  textWarning: {
    color: '#B45309',
  },
  textDanger: {
    color: '#B91C1C',
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
  tableWrapper: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
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
  fullscreenScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  fullscreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
});
