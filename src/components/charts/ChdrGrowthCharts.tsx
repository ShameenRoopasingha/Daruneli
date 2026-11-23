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
  WHO_WFA_BOYS,
  WHO_WFA_GIRLS,
  WHO_HFA_BOYS,
  WHO_HFA_GIRLS,
  WHO_WFH_BOYS,
  WHO_WFH_GIRLS,
  WhoGrowthPoint,
  WhoWfhPoint,
} from '../../engine/referenceCurves';
import { classifyWhoZScore } from '../../engine/chartAnalyzers';
import { formatDMY } from './GestationalWheelTool';

export type ChdrChartType = 'WFA' | 'HFA' | 'WFH';

interface GrowthRecordItem {
  id?: string;
  recorded_date: string;
  age_months: number;
  weight_kg: number | null;
  height_cm: number | null;
  head_circumference_cm?: number | null;
}

interface ChdrGrowthChartsProps {
  gender: 'M' | 'F';
  childName?: string;
  dob?: string;
  growthRecords: GrowthRecordItem[];
}

export const ChdrGrowthCharts: React.FC<ChdrGrowthChartsProps> = ({
  gender,
  childName,
  growthRecords,
}) => {
  const [activeTab, setActiveTab] = useState<ChdrChartType>('WFA');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const chartHeight = isFullscreen ? 320 : 220;

  const padLeft = 38;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  // Latest measurement for status evaluation
  const sortedRecords = [...growthRecords].sort((a, b) =>
    a.recorded_date.localeCompare(b.recorded_date)
  );
  const latestRec = sortedRecords[sortedRecords.length - 1];

  const zScoreEval = latestRec && latestRec.weight_kg
    ? classifyWhoZScore(gender, latestRec.age_months, latestRec.weight_kg, latestRec.height_cm)
    : null;

  const isBoy = gender === 'M';
  const themeColor = isBoy ? '#2563EB' : '#E11D48';

  // 1. Setup Scales depending on Active Tab
  let minX = 0;
  let maxX = 60;
  let minY = 0;
  let maxY = 25;

  if (activeTab === 'WFA') {
    minX = 0;
    maxX = 60;
    minY = 0;
    maxY = isBoy ? 28 : 28;
  } else if (activeTab === 'HFA') {
    minX = 0;
    maxX = 60;
    minY = 40;
    maxY = 125;
  } else if (activeTab === 'WFH') {
    minX = 45;
    maxX = 110;
    minY = 0;
    maxY = 28;
  }

  const getX = (val: number) => padLeft + ((val - minX) / (maxX - minX)) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;

  // Reference Table selection
  const wfaTable = isBoy ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  const hfaTable = isBoy ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
  const wfhTable = isBoy ? WHO_WFH_BOYS : WHO_WFH_GIRLS;

  // Build Zone Paths
  let greenZonePath = '';
  let yellowZonePath = '';
  let redZonePath = '';
  let medianPath = '';

  if (activeTab === 'WFA' || activeTab === 'HFA') {
    const table: WhoGrowthPoint[] = activeTab === 'WFA' ? wfaTable : hfaTable;
    // Green normal zone: -2SD to +2SD
    const ptsSd2Neg = table.map((p) => `${getX(p.month)},${getY(p.sd2Neg)}`);
    const ptsSd2PosRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd2Pos)}`);
    greenZonePath = `M ${ptsSd2Neg.join(' L ')} L ${ptsSd2PosRev.join(' L ')} Z`;

    // Yellow MAM zone: -3SD to -2SD
    const ptsSd3Neg = table.map((p) => `${getX(p.month)},${getY(p.sd3Neg)}`);
    const ptsSd2NegRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd2Neg)}`);
    yellowZonePath = `M ${ptsSd3Neg.join(' L ')} L ${ptsSd2NegRev.join(' L ')} Z`;

    // Red SAM zone: bottom baseline to -3SD
    const bottomBase = table.map((p) => `${getX(p.month)},${getY(minY)}`);
    const ptsSd3NegRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd3Neg)}`);
    redZonePath = `M ${bottomBase.join(' L ')} L ${ptsSd3NegRev.join(' L ')} Z`;

    // Median
    medianPath = table
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.month)} ${getY(p.median)}`)
      .join(' ');
  } else {
    // WFH (Weight for Height)
    const table: WhoWfhPoint[] = wfhTable;
    const ptsSd2Neg = table.map((p) => `${getX(p.lengthCm)},${getY(p.sd2Neg)}`);
    const ptsSd2PosRev = [...table].reverse().map((p) => `${getX(p.lengthCm)},${getY(p.sd2Pos)}`);
    greenZonePath = `M ${ptsSd2Neg.join(' L ')} L ${ptsSd2PosRev.join(' L ')} Z`;

    const ptsSd3Neg = table.map((p) => `${getX(p.lengthCm)},${getY(p.sd3Neg)}`);
    const ptsSd2NegRev = [...table].reverse().map((p) => `${getX(p.lengthCm)},${getY(p.sd2Neg)}`);
    yellowZonePath = `M ${ptsSd3Neg.join(' L ')} L ${ptsSd2NegRev.join(' L ')} Z`;

    const bottomBase = table.map((p) => `${getX(p.lengthCm)},${getY(minY)}`);
    const ptsSd3NegRev = [...table].reverse().map((p) => `${getX(p.lengthCm)},${getY(p.sd3Neg)}`);
    redZonePath = `M ${bottomBase.join(' L ')} L ${ptsSd3NegRev.join(' L ')} Z`;

    medianPath = table
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.lengthCm)} ${getY(p.median)}`)
      .join(' ');
  }

  // Patient Points according to active tab
  interface PatientPoint {
    x: number;
    y: number;
    label: string;
    date: string;
  }
  const patientPoints: PatientPoint[] = [];
  sortedRecords.forEach((r) => {
    if (activeTab === 'WFA' && r.weight_kg) {
      patientPoints.push({
        x: r.age_months,
        y: r.weight_kg,
        label: `${r.weight_kg}kg`,
        date: r.recorded_date,
      });
    } else if (activeTab === 'HFA' && r.height_cm) {
      patientPoints.push({
        x: r.age_months,
        y: r.height_cm,
        label: `${r.height_cm}cm`,
        date: r.recorded_date,
      });
    } else if (activeTab === 'WFH' && r.weight_kg && r.height_cm) {
      patientPoints.push({
        x: r.height_cm,
        y: r.weight_kg,
        label: `${r.weight_kg}kg`,
        date: r.recorded_date,
      });
    }
  });

  const patientLinePath = patientPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.x)} ${getY(p.y)}`)
    .join(' ');

  const getStatusBadgeStyle = () => {
    if (!zScoreEval) return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    switch (zScoreEval.nutritionStatus) {
      case 'SAM':
        return { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA' };
      case 'MAM':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      case 'OVERWEIGHT':
        return { bg: '#F3E8FF', text: '#7E22CE', border: '#E9D5FF' };
      case 'NORMAL':
      default:
        return { bg: '#DCFCE7', text: '#15803D', border: '#BBF7D0' };
    }
  };

  const statusStyle = getStatusBadgeStyle();

  const renderContent = () => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>WHO CHDR Growth Chart</Text>
            <View
              style={[
                styles.genderPill,
                { backgroundColor: isBoy ? '#EFF6FF' : '#FFF1F2', borderColor: themeColor },
              ]}
            >
              <Text style={[styles.genderPillText, { color: themeColor }]}>
                {isBoy ? '👦 Boy (පිරිමි)' : '👧 Girl (ගැහැණු)'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            ළමා සෞඛ්‍ය සංවර්ධන වාර්තාව (CHDR) • WHO Child Standards
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(!isFullscreen)}
        >
          <Text style={styles.expandBtnText}>{isFullscreen ? '✕ Close' : '⛶ Zoom'}</Text>
        </TouchableOpacity>
      </View>

      {/* Z-Score Classification Banner */}
      {zScoreEval && (
        <View
          style={[
            styles.banner,
            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
          ]}
        >
          <Text style={styles.bannerIcon}>
            {zScoreEval.nutritionStatus === 'NORMAL' ? '✓' : '⚠️'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTextEn, { color: statusStyle.text }]}>
              {zScoreEval.statusLabelEn} (Z: {zScoreEval.wfaZScore > 0 ? `+${zScoreEval.wfaZScore}` : zScoreEval.wfaZScore})
            </Text>
            <Text style={styles.bannerTextSi}>{zScoreEval.statusLabelSi}</Text>
          </View>
        </View>
      )}

      {/* Segmented Control Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'WFA' && styles.tabBtnActive]}
          onPress={() => setActiveTab('WFA')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'WFA' && styles.tabBtnTextActive]}>
            Weight-for-Age (WFA)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HFA' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HFA')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HFA' && styles.tabBtnTextActive]}>
            Height-for-Age (HFA)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'WFH' && styles.tabBtnActive]}
          onPress={() => setActiveTab('WFH')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'WFH' && styles.tabBtnTextActive]}>
            Weight-for-Height
          </Text>
        </TouchableOpacity>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Shaded WHO Zones */}
          {/* Red Zone (SAM) */}
          <Path d={redZonePath} fill="rgba(239, 68, 68, 0.12)" />

          {/* Yellow Zone (MAM) */}
          <Path d={yellowZonePath} fill="rgba(245, 158, 11, 0.18)" />

          {/* Green Zone (Normal Healthy) */}
          <Path d={greenZonePath} fill="rgba(16, 185, 129, 0.18)" />

          {/* Median Line */}
          <Path d={medianPath} stroke="#059669" strokeWidth={2} fill="none" />

          {/* Grid lines and tick marks */}
          {activeTab === 'WFA' &&
            [0, 5, 10, 15, 20, 25].map((val) => {
              const y = getY(val);
              return (
                <G key={`wfa-y-${val}`}>
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
                    {val}kg
                  </SvgText>
                </G>
              );
            })}

          {activeTab === 'HFA' &&
            [50, 65, 80, 95, 110, 120].map((val) => {
              const y = getY(val);
              return (
                <G key={`hfa-y-${val}`}>
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
                    {val}cm
                  </SvgText>
                </G>
              );
            })}

          {activeTab === 'WFH' &&
            [5, 10, 15, 20, 25].map((val) => {
              const y = getY(val);
              return (
                <G key={`wfh-y-${val}`}>
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
                    {val}kg
                  </SvgText>
                </G>
              );
            })}

          {/* X-axis Ticks */}
          {(activeTab === 'WFA' || activeTab === 'HFA') &&
            [0, 12, 24, 36, 48, 60].map((m) => {
              const x = getX(m);
              return (
                <G key={`x-m-${m}`}>
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
                    {m}m
                  </SvgText>
                </G>
              );
            })}

          {activeTab === 'WFH' &&
            [50, 60, 70, 80, 90, 100, 110].map((l) => {
              const x = getX(l);
              return (
                <G key={`x-l-${l}`}>
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
                    {l}cm
                  </SvgText>
                </G>
              );
            })}

          {/* Patient Growth Curve Line */}
          {patientPoints.length > 1 && (
            <Path
              d={patientLinePath}
              stroke={themeColor}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Patient Data Dots */}
          {patientPoints.map((pt, i) => {
            const cx = getX(pt.x);
            const cy = getY(pt.y);
            const isLatest = i === patientPoints.length - 1;
            return (
              <G key={`patient-dot-${i}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? 6 : 4.5}
                  fill={themeColor}
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
                  {pt.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* WHO Zone Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(16, 185, 129, 0.4)' }]} />
          <Text style={styles.legendText}>Normal (කොළ කලාපය)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(245, 158, 11, 0.4)' }]} />
          <Text style={styles.legendText}>MAM (කහ කලාපය)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(239, 68, 68, 0.35)' }]} />
          <Text style={styles.legendText}>SAM (රතු කලාපය)</Text>
        </View>
      </View>

      {/* History Table */}
      {growthRecords.length > 0 && (
        <View style={styles.tableWrapper}>
          <Text style={styles.tableHeading}>CHDR Measurement Records</Text>
          <View style={styles.thRow}>
            <Text style={[styles.th, { flex: 1.2 }]}>Date</Text>
            <Text style={[styles.th, { flex: 0.8 }]}>Age</Text>
            <Text style={[styles.th, { flex: 1 }]}>Weight</Text>
            <Text style={[styles.th, { flex: 1 }]}>Height</Text>
            <Text style={[styles.th, { flex: 1 }]}>Head Circ.</Text>
          </View>
          {sortedRecords.map((r, i) => (
            <View key={`hist-${i}`} style={styles.tr}>
              <Text style={[styles.td, { flex: 1.2 }]}>{formatDMY(r.recorded_date)}</Text>
              <Text style={[styles.td, { flex: 0.8, fontWeight: '700' }]}>{r.age_months}m</Text>
              <Text style={[styles.td, { flex: 1, color: themeColor, fontWeight: '700' }]}>
                {r.weight_kg ? `${r.weight_kg} kg` : '-'}
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>
                {r.height_cm ? `${r.height_cm} cm` : '-'}
              </Text>
              <Text style={[styles.td, { flex: 1 }]}>
                {r.head_circumference_cm ? `${r.head_circumference_cm} cm` : '-'}
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
              Full WHO CHDR Growth Record {childName ? `• ${childName}` : ''}
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
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  genderPill: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  genderPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  subtitle: {
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  bannerIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerTextEn: {
    fontSize: 12,
    fontWeight: '700',
  },
  bannerTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0F172A',
    fontWeight: '800',
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
    fontSize: 10,
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
  thRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    paddingBottom: 4,
    marginBottom: 4,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  td: {
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
