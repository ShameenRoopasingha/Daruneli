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
  FENTON_PRETERM_BOYS,
  FENTON_PRETERM_GIRLS,
  FentonPretermPoint,
} from '../../engine/referenceCurves';

export type FentonTab = 'WEIGHT' | 'LENGTH' | 'HC';

interface FentonPretermChartProps {
  gender: 'M' | 'F';
  birthGestationalWeeks: number; // e.g. 34.0
  dob: string;
  childName?: string;
  growthRecords: {
    recorded_date: string;
    age_months: number;
    weight_kg: number | null;
    height_cm: number | null;
    head_circumference_cm?: number | null;
  }[];
}

export const FentonPretermChart: React.FC<FentonPretermChartProps> = ({
  gender,
  birthGestationalWeeks,
  dob,
  childName,
  growthRecords,
}) => {
  const [activeTab, setActiveTab] = useState<FentonTab>('WEIGHT');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isBoy = gender === 'M';
  const table = isBoy ? FENTON_PRETERM_BOYS : FENTON_PRETERM_GIRLS;

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32;
  const chartHeight = isFullscreen ? 320 : 210;

  const padLeft = 38;
  const padRight = 16;
  const padTop = 18;
  const padBottom = 26;

  const plotW = chartWidth - padLeft - padRight;
  const plotH = chartHeight - padTop - padBottom;

  const minX = 24;
  const maxX = 50;

  // Calculate current PMA
  const dobDate = new Date(dob);
  const now = new Date();
  const daysSinceBirth = Math.max(0, Math.floor((now.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24)));
  const currentPmaWeeks = +(birthGestationalWeeks + daysSinceBirth / 7).toFixed(1);
  const isTransitioned = currentPmaWeeks >= 50;

  // Y-axis scales per tab
  let minY = 0.4;
  let maxY = 7.5;
  let unit = 'kg';

  if (activeTab === 'LENGTH') {
    minY = 25;
    maxY = 65;
    unit = 'cm';
  } else if (activeTab === 'HC') {
    minY = 18;
    maxY = 44;
    unit = 'cm';
  }

  const getX = (w: number) => padLeft + ((w - minX) / (maxX - minX)) * plotW;
  const getY = (val: number) => padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;

  // Build Centile Curves for Active Tab
  const getP10 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP10 : activeTab === 'LENGTH' ? p.lengthP10 : p.hcP10;
  const getP50 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP50 : activeTab === 'LENGTH' ? p.lengthP50 : p.hcP50;
  const getP90 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP90 : activeTab === 'LENGTH' ? p.lengthP90 : p.hcP90;

  const pts10 = table.map((p) => `${getX(p.week)},${getY(getP10(p))}`);
  const pts90Rev = [...table].reverse().map((p) => `${getX(p.week)},${getY(getP90(p))}`);
  const corridorPath = `M ${pts10.join(' L ')} L ${pts90Rev.join(' L ')} Z`;

  const p50LinePath = table
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP50(p))}`)
    .join(' ');

  // Patient Preterm Measurements plotted by Post-Menstrual Age (PMA)
  interface PatientPmaPoint {
    pmaWeeks: number;
    value: number;
    label: string;
    date: string;
  }

  const patientPoints: PatientPmaPoint[] = [];
  growthRecords.forEach((r) => {
    const recDate = new Date(r.recorded_date);
    const daysOld = Math.max(0, Math.floor((recDate.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24)));
    const pma = +(birthGestationalWeeks + daysOld / 7).toFixed(1);

    let val: number | null = null;
    if (activeTab === 'WEIGHT' && r.weight_kg) val = r.weight_kg;
    if (activeTab === 'LENGTH' && r.height_cm) val = r.height_cm;
    if (activeTab === 'HC' && r.head_circumference_cm) val = r.head_circumference_cm;

    if (val !== null && pma >= 24 && pma <= 52) {
      patientPoints.push({
        pmaWeeks: pma,
        value: val,
        label: `${val}${unit}`,
        date: r.recorded_date,
      });
    }
  });

  patientPoints.sort((a, b) => a.pmaWeeks - b.pmaWeeks);

  const patientLinePath = patientPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.pmaWeeks)} ${getY(p.value)}`)
    .join(' ');

  const renderContent = () => (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.title}>Fenton Preterm Growth Chart</Text>
            <View style={styles.pretermBadge}>
              <Text style={styles.pretermBadgeText}>
                Born {birthGestationalWeeks}w Preterm
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            නොමේරූ දරු වර්ධන ප්‍රස්තාරය (24 - 50 Weeks PMA)
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(!isFullscreen)}
        >
          <Text style={styles.expandBtnText}>{isFullscreen ? '✕ Close' : '⛶ Zoom'}</Text>
        </TouchableOpacity>
      </View>

      {/* 50-Week WHO Transition Banner */}
      <View
        style={[
          styles.transitionBanner,
          isTransitioned ? styles.transComplete : styles.transActive,
        ]}
      >
        <Text style={styles.bannerIcon}>{isTransitioned ? '🎓' : '⏳'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTextBold}>
            {isTransitioned
              ? 'Preterm Follow-up Complete (50 Weeks PMA Reached)'
              : `Current Post-Menstrual Age: ${currentPmaWeeks} Weeks`}
          </Text>
          <Text style={styles.bannerTextDesc}>
            {isTransitioned
              ? 'Infant has successfully graduated to standard WHO Child Growth Standards (CHDR).'
              : `Transition to standard WHO CHDR chart occurs at 50 weeks PMA (${+(50 - currentPmaWeeks).toFixed(1)} weeks remaining).`}
          </Text>
        </View>
      </View>

      {/* Metric Selector Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'WEIGHT' && styles.tabBtnActive]}
          onPress={() => setActiveTab('WEIGHT')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'WEIGHT' && styles.tabBtnTextActive]}>
            Weight (බර)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'LENGTH' && styles.tabBtnActive]}
          onPress={() => setActiveTab('LENGTH')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'LENGTH' && styles.tabBtnTextActive]}>
            Length (දිග)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'HC' && styles.tabBtnActive]}
          onPress={() => setActiveTab('HC')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'HC' && styles.tabBtnTextActive]}>
            Head Circ. (හිස වටලීම)
          </Text>
        </TouchableOpacity>
      </View>

      {/* SVG Canvas */}
      <View style={styles.svgWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Shaded 10th to 90th Centile Corridor */}
          <Path d={corridorPath} fill="rgba(99, 102, 241, 0.15)" />

          {/* 10th Centile Line */}
          <Path
            d={table.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP10(p))}`).join(' ')}
            stroke="#6366F1"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />

          {/* 90th Centile Line */}
          <Path
            d={table.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP90(p))}`).join(' ')}
            stroke="#6366F1"
            strokeWidth={1.5}
            strokeDasharray="4, 3"
            fill="none"
          />

          {/* 50th Centile Median */}
          <Path d={p50LinePath} stroke="#4F46E5" strokeWidth={2} fill="none" />

          {/* Grid lines (X: 24, 28, 32, 36, 40, 44, 48, 50w) */}
          {[24, 28, 32, 36, 40, 44, 48, 50].map((w) => {
            const x = getX(w);
            return (
              <G key={`fenton-x-${w}`}>
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

          {/* Patient Line */}
          {patientPoints.length > 1 && (
            <Path
              d={patientLinePath}
              stroke="#0D9488"
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Patient Dots */}
          {patientPoints.map((pt, i) => {
            const cx = getX(pt.pmaWeeks);
            const cy = getY(pt.value);
            const isLatest = i === patientPoints.length - 1;
            return (
              <G key={`pt-${i}`}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isLatest ? 6 : 4.5}
                  fill="#0D9488"
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

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#0D9488' }]} />
          <Text style={styles.legendText}>Preterm Infant&apos;s Growth</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: '#4F46E5' }]} />
          <Text style={styles.legendText}>50th Centile Median</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: 'rgba(99, 102, 241, 0.3)' }]} />
          <Text style={styles.legendText}>10th - 90th Centiles</Text>
        </View>
      </View>
    </View>
  );

  if (isFullscreen) {
    return (
      <Modal visible={isFullscreen} animationType="fade" transparent={false}>
        <ScrollView style={styles.fullscreenScroll} contentContainerStyle={{ padding: 16 }}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.fullscreenTitle}>
              Fenton Preterm Curve {childName ? `• ${childName}` : ''}
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
  pretermBadge: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pretermBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338CA',
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
  transitionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  transActive: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  transComplete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerIcon: {
    fontSize: 18,
  },
  bannerTextBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerTextDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
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
