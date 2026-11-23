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
  FENTON_PRETERM_BOYS,
  FENTON_PRETERM_GIRLS,
  FentonPretermPoint,
} from '../../engine/referenceCurves';
import { ChartZoomModal } from './ChartZoomModal';
import { RADIUS, SHADOWS } from '../../theme';
import { formatDMY } from './GestationalWheelTool';

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

interface PatientPmaPoint {
  pmaWeeks: number;
  value: number;
  label: string;
  date: string;
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
  const [selectedPoint, setSelectedPoint] = useState<PatientPmaPoint | null>(null);

  const isBoy = gender === 'M';
  const table = isBoy ? FENTON_PRETERM_BOYS : FENTON_PRETERM_GIRLS;

  const screenWidth = Dimensions.get('window').width;
  const defaultWidth = Math.max(300, screenWidth - 32);
  const defaultHeight = 220;

  const minX = 24;
  const maxX = 50;

  // Calculate current PMA
  const dobDate = new Date(dob);
  const now = new Date();
  const daysSinceBirth = Math.max(0, Math.floor((now.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24)));
  const currentPmaWeeks = +(birthGestationalWeeks + daysSinceBirth / 7).toFixed(1);
  const isTransitioned = currentPmaWeeks >= 50;

  const getYConfig = (h: number) => {
    const padTop = 18;
    const padBottom = 26;
    const plotH = h - padTop - padBottom;

    let minY = 0.4;
    let maxY = 7.5;
    let unit = 'kg';
    let ticks = [1, 2, 3, 4, 5, 6, 7];

    if (activeTab === 'LENGTH') {
      minY = 25;
      maxY = 65;
      unit = 'cm';
      ticks = [30, 40, 50, 60];
    } else if (activeTab === 'HC') {
      minY = 18;
      maxY = 44;
      unit = 'cm';
      ticks = [20, 26, 32, 38, 42];
    }

    const getY = (val: number) => padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;

    return { minY, maxY, padTop, padBottom, plotH, unit, ticks, getY };
  };

  // Fixed Left Y-Axis for Zoomed View
  const renderFixedYAxis = (h: number) => {
    const { ticks, unit, getY } = getYConfig(h);
    const yAxisWidth = 44;

    return (
      <Svg width={yAxisWidth} height={h}>
        <Rect x={0} y={0} width={yAxisWidth} height={h} fill="#F8FAFC" />
        <Line x1={yAxisWidth - 1} y1={0} x2={yAxisWidth - 1} y2={h} stroke="#CBD5E1" strokeWidth={1.5} />
        {ticks.map((val) => {
          const y = getY(val);
          return (
            <G key={`fenton-fix-y-${val}`}>
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
                {val}{unit}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  // Build Centile Curves for Active Tab
  const getP10 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP10 : activeTab === 'LENGTH' ? p.lengthP10 : p.hcP10;
  const getP50 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP50 : activeTab === 'LENGTH' ? p.lengthP50 : p.hcP50;
  const getP90 = (p: FentonPretermPoint) =>
    activeTab === 'WEIGHT' ? p.weightP90 : activeTab === 'LENGTH' ? p.lengthP90 : p.hcP90;

  // Patient Preterm Measurements plotted by Post-Menstrual Age (PMA)
  const patientPoints: PatientPmaPoint[] = [];
  growthRecords.forEach((r) => {
    const recDate = new Date(r.recorded_date);
    const daysOld = Math.max(0, Math.floor((recDate.getTime() - dobDate.getTime()) / (1000 * 60 * 60 * 24)));
    const pma = +(birthGestationalWeeks + daysOld / 7).toFixed(1);

    let val: number | null = null;
    let unitStr = 'kg';
    if (activeTab === 'WEIGHT' && r.weight_kg) { val = r.weight_kg; unitStr = 'kg'; }
    if (activeTab === 'LENGTH' && r.height_cm) { val = r.height_cm; unitStr = 'cm'; }
    if (activeTab === 'HC' && r.head_circumference_cm) { val = r.head_circumference_cm; unitStr = 'cm'; }

    if (val !== null && pma >= 24 && pma <= 52) {
      patientPoints.push({
        pmaWeeks: pma,
        value: val,
        label: `${val}${unitStr}`,
        date: r.recorded_date,
      });
    }
  });

  patientPoints.sort((a, b) => a.pmaWeeks - b.pmaWeeks);

  const renderPlotArea = (
    width: number,
    height: number,
    interactive = false,
    useOffsetLeft = false
  ) => {
    const padLeft = useOffsetLeft ? 38 : 6;
    const padRight = 18;
    const { padTop, padBottom, unit, ticks, getY } = getYConfig(height);
    const plotW = width - padLeft - padRight;

    const getX = (w: number) => padLeft + ((w - minX) / (maxX - minX)) * plotW;

    const pts10 = table.map((p) => `${getX(p.week)},${getY(getP10(p))}`);
    const pts90Rev = [...table].reverse().map((p) => `${getX(p.week)},${getY(getP90(p))}`);
    const corridorPath = `M ${pts10.join(' L ')} L ${pts90Rev.join(' L ')} Z`;

    const p50LinePath = table
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP50(p))}`)
      .join(' ');

    const patientLinePath = patientPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.pmaWeeks)} ${getY(p.value)}`)
      .join(' ');

    const weeksToShow = width > 500
      ? [24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]
      : [24, 28, 32, 36, 40, 44, 48, 50];

    return (
      <Svg width={width} height={height}>
        {/* Shaded 10th to 90th Centile Corridor */}
        <Path d={corridorPath} fill="rgba(99, 102, 241, 0.16)" />

        {/* Horizontal Grid lines */}
        {ticks.map((val) => {
          const y = getY(val);
          return (
            <G key={`fenton-grid-y-${val}`}>
              <Line
                x1={0}
                y1={y}
                x2={width}
                y2={y}
                stroke="#E2E8F0"
                strokeWidth={1}
                strokeDasharray="4 4"
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
                  {val}{unit}
                </SvgText>
              )}
            </G>
          );
        })}

        {/* X-axis Grid & Labels */}
        {weeksToShow.map((w) => {
          const x = getX(w);
          return (
            <G key={`fenton-grid-x-${w}`}>
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

        {/* 10th & 90th Centile Lines */}
        <Path
          d={table.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP10(p))}`).join(' ')}
          stroke="#6366F1"
          strokeWidth={1.5}
          strokeDasharray="4, 3"
          fill="none"
        />
        <Path
          d={table.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(getP90(p))}`).join(' ')}
          stroke="#6366F1"
          strokeWidth={1.5}
          strokeDasharray="4, 3"
          fill="none"
        />

        {/* 50th Centile Median */}
        <Path d={p50LinePath} stroke="#4F46E5" strokeWidth={2.2} fill="none" />

        {/* Patient Line */}
        {patientPoints.length > 1 && (
          <Path
            d={patientLinePath}
            stroke="#0D9488"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Patient Dots & Readable Pills */}
        {patientPoints.map((pt, i) => {
          const cx = getX(pt.pmaWeeks);
          const cy = getY(pt.value);
          const isLatest = i === patientPoints.length - 1;
          const isSelected = selectedPoint?.date === pt.date && selectedPoint?.pmaWeeks === pt.pmaWeeks;

          const prevPt = i > 0 ? patientPoints[i - 1] : null;
          const prevCx = prevPt ? getX(prevPt.pmaWeeks) : -999;
          const isTooClose = Math.abs(cx - prevCx) < 36;
          const shouldShowLabel = !isTooClose || isSelected || isLatest;

          return (
            <G
              key={`fenton-pt-${i}`}
              onPress={() => interactive && setSelectedPoint(pt)}
            >
              {isSelected && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={14}
                  fill="rgba(13, 148, 136, 0.25)"
                />
              )}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7.5 : isLatest ? 6.5 : 5}
                fill={isSelected ? '#0F172A' : '#0D9488'}
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
                    stroke={isSelected ? '#0D9488' : '#CBD5E1'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <SvgText
                    x={cx}
                    y={cy - 11}
                    fontSize={9.5}
                    fontWeight="800"
                    fill={isSelected ? '#0F766E' : '#0F172A'}
                    textAnchor="middle"
                  >
                    {pt.label}
                  </SvgText>
                </G>
              )}
            </G>
          );
        })}
      </Svg>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'WEIGHT' && styles.tabBtnActive]}
        onPress={() => setActiveTab('WEIGHT')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'WEIGHT' && styles.tabBtnTextActive]}>
          බර (Weight)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'LENGTH' && styles.tabBtnActive]}
        onPress={() => setActiveTab('LENGTH')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'LENGTH' && styles.tabBtnTextActive]}>
          දිග (Length)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'HC' && styles.tabBtnActive]}
        onPress={() => setActiveTab('HC')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'HC' && styles.tabBtnTextActive]}>
          හිස වට (HC)
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLegend = () => (
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: '#0D9488' }]} />
        <Text style={styles.legendText}>Infant Growth</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: '#4F46E5' }]} />
        <Text style={styles.legendText}>50th Centile</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: 'rgba(99, 102, 241, 0.3)' }]} />
        <Text style={styles.legendText}>10th - 90th Centiles</Text>
      </View>
    </View>
  );

  const renderTransitionBanner = () => (
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
  );

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
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
          onPress={() => setIsFullscreen(true)}
          accessibilityLabel="Expand and zoom Fenton preterm chart"
        >
          <Text style={styles.expandBtnText}>🔍 විශාල කරන්න</Text>
        </TouchableOpacity>
      </View>

      {/* 50-Week WHO Transition Banner */}
      {renderTransitionBanner()}

      {/* Metric Selector Tabs */}
      {renderTabs()}

      {/* Standard SVG Canvas */}
      <View style={styles.svgWrapper}>
        {renderPlotArea(defaultWidth, defaultHeight, false, true)}
      </View>

      {/* Legend */}
      {renderLegend()}

      {/* Zoom Modal with Sticky Y-Axis */}
      {isFullscreen && (
        <ChartZoomModal
          visible={isFullscreen}
          onClose={() => {
            setIsFullscreen(false);
            setSelectedPoint(null);
          }}
          title={`Fenton Preterm (${activeTab})`}
          subtitle={childName ? `දරුවා: ${childName} (උපත: සති ${birthGestationalWeeks})` : 'නොමේරූ දරු වර්ධන ප්‍රස්තාරය'}
          badgeText={`PMA ${currentPmaWeeks}w`}
          baseWidth={screenWidth - 24}
          baseHeight={340}
          initialScale={1.5}
          yAxisWidth={44}
          renderYAxis={(h) => renderFixedYAxis(h)}
          renderPlot={(_scale, w, h) => renderPlotArea(w, h, true, false)}
          legend={
            <View>
              {renderTabs()}
              {renderLegend()}
            </View>
          }
          extraContent={
            <View>
              {selectedPoint && (
                <View style={styles.selectedPointCard}>
                  <Text style={styles.selectedPointTitle}>📍 තෝරාගත් මිනුම (Selected Measurement)</Text>
                  <Text style={styles.selectedPointDetails}>
                    දිනය: <Text style={{ fontWeight: '700' }}>{formatDMY(selectedPoint.date)}</Text> • 
                    PMA: <Text style={{ fontWeight: '700' }}>{selectedPoint.pmaWeeks} සති</Text> • 
                    අගය: <Text style={{ fontWeight: '800', color: '#0D9488' }}>{selectedPoint.label}</Text>
                  </Text>
                </View>
              )}
              {renderTransitionBanner()}
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
    color: '#4F46E5',
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
  transitionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
  },
  transActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  transComplete: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
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
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    ...SHADOWS.card,
  },
  tabBtnText: {
    fontSize: 11,
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
  selectedPointCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  selectedPointTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 2,
  },
  selectedPointDetails: {
    fontSize: 12,
    color: '#1E293B',
  },
});
