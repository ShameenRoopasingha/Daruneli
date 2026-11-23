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
import { ChartZoomModal } from './ChartZoomModal';
import { RADIUS, SHADOWS } from '../../theme';

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
  const [selectedRecord, setSelectedRecord] = useState<GrowthRecordItem | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const defaultWidth = Math.max(300, screenWidth - 32);
  const defaultHeight = 220;

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

  // Scales & Tables
  const wfaTable = isBoy ? WHO_WFA_BOYS : WHO_WFA_GIRLS;
  const hfaTable = isBoy ? WHO_HFA_BOYS : WHO_HFA_GIRLS;
  const wfhTable = isBoy ? WHO_WFH_BOYS : WHO_WFH_GIRLS;

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

  // Helper to compute Y parameters for any given canvas height
  const getYConfig = (h: number) => {
    const padTop = 18;
    const padBottom = 26;
    const plotH = h - padTop - padBottom;

    let minY = 0;
    let maxY = 28;
    let ticks = [0, 5, 10, 15, 20, 25];
    let unit = 'kg';

    if (activeTab === 'WFA') {
      minY = 0;
      maxY = 28;
      ticks = [0, 5, 10, 15, 20, 25];
      unit = 'kg';
    } else if (activeTab === 'HFA') {
      minY = 40;
      maxY = 125;
      ticks = [50, 65, 80, 95, 110, 120];
      unit = 'cm';
    } else if (activeTab === 'WFH') {
      minY = 0;
      maxY = 28;
      ticks = [5, 10, 15, 20, 25];
      unit = 'kg';
    }

    const getY = (val: number) => padTop + plotH - ((val - minY) / (maxY - minY)) * plotH;

    return { minY, maxY, padTop, padBottom, plotH, ticks, unit, getY };
  };

  // Fixed Left Y-Axis SVG for Zoomed Fullscreen View
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
            <G key={`fixed-y-${val}`}>
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

  // Horizontally scrollable Plot Area SVG
  const renderPlotArea = (
    w: number,
    h: number,
    interactive = false,
    useOffsetLeft = false
  ) => {
    const padLeft = useOffsetLeft ? 38 : 6;
    const padRight = 18;
    const { minY, padTop, padBottom, ticks, unit, getY } = getYConfig(h);
    const plotW = w - padLeft - padRight;

    let minX = 0;
    let maxX = 60;

    if (activeTab === 'WFH') {
      minX = 45;
      maxX = 110;
    }

    const getX = (val: number) => padLeft + ((val - minX) / (maxX - minX)) * plotW;

    let greenZonePath = '';
    let yellowZonePath = '';
    let redZonePath = '';
    let medianPath = '';

    if (activeTab === 'WFA' || activeTab === 'HFA') {
      const table: WhoGrowthPoint[] = activeTab === 'WFA' ? wfaTable : hfaTable;
      const ptsSd2Neg = table.map((p) => `${getX(p.month)},${getY(p.sd2Neg)}`);
      const ptsSd2PosRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd2Pos)}`);
      greenZonePath = `M ${ptsSd2Neg.join(' L ')} L ${ptsSd2PosRev.join(' L ')} Z`;

      const ptsSd3Neg = table.map((p) => `${getX(p.month)},${getY(p.sd3Neg)}`);
      const ptsSd2NegRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd2Neg)}`);
      yellowZonePath = `M ${ptsSd3Neg.join(' L ')} L ${ptsSd2NegRev.join(' L ')} Z`;

      const bottomBase = table.map((p) => `${getX(p.month)},${getY(minY)}`);
      const ptsSd3NegRev = [...table].reverse().map((p) => `${getX(p.month)},${getY(p.sd3Neg)}`);
      redZonePath = `M ${bottomBase.join(' L ')} L ${ptsSd3NegRev.join(' L ')} Z`;

      medianPath = table
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.month)} ${getY(p.median)}`)
        .join(' ');
    } else {
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

    interface PatientPoint {
      x: number;
      y: number;
      label: string;
      record: GrowthRecordItem;
    }
    const patientPoints: PatientPoint[] = [];
    sortedRecords.forEach((r) => {
      if (activeTab === 'WFA' && r.weight_kg) {
        patientPoints.push({
          x: r.age_months,
          y: r.weight_kg,
          label: `${r.weight_kg}kg`,
          record: r,
        });
      } else if (activeTab === 'HFA' && r.height_cm) {
        patientPoints.push({
          x: r.age_months,
          y: r.height_cm,
          label: `${r.height_cm}cm`,
          record: r,
        });
      } else if (activeTab === 'WFH' && r.weight_kg && r.height_cm) {
        patientPoints.push({
          x: r.height_cm,
          y: r.weight_kg,
          label: `${r.weight_kg}kg`,
          record: r,
        });
      }
    });

    patientPoints.sort((a, b) => a.x - b.x);

    const patientLinePath = patientPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.x)} ${getY(p.y)}`)
      .join(' ');

    const xMonths = w > 1000
      ? [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48, 51, 54, 57, 60]
      : w > 500
      ? [0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]
      : [0, 12, 24, 36, 48, 60];

    const xLengths = w > 500
      ? [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110]
      : [50, 60, 70, 80, 90, 100, 110];

    return (
      <Svg width={w} height={h}>
        {/* Shaded WHO Zones */}
        <Path d={redZonePath} fill="rgba(239, 68, 68, 0.12)" />
        <Path d={yellowZonePath} fill="rgba(245, 158, 11, 0.18)" />
        <Path d={greenZonePath} fill="rgba(16, 185, 129, 0.18)" />
        <Path d={medianPath} stroke="#059669" strokeWidth={2.2} fill="none" />

        {/* Horizontal Grid lines */}
        {ticks.map((val) => {
          const y = getY(val);
          return (
            <G key={`grid-h-${val}`}>
              <Line
                x1={0}
                y1={y}
                x2={w}
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

        {/* X Axis Grid & Labels */}
        {(activeTab === 'WFA' || activeTab === 'HFA') &&
          xMonths.map((m) => {
            const x = getX(m);
            return (
              <G key={`x-m-${m}`}>
                <Line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={h - padBottom}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={h - padBottom + 16}
                  fontSize={10.5}
                  fontWeight="700"
                  fill="#475569"
                  textAnchor="middle"
                >
                  {m}m
                </SvgText>
              </G>
            );
          })}

        {activeTab === 'WFH' &&
          xLengths.map((l) => {
            const x = getX(l);
            return (
              <G key={`x-l-${l}`}>
                <Line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={h - padBottom}
                  stroke="#E2E8F0"
                  strokeWidth={1}
                />
                <SvgText
                  x={x}
                  y={h - padBottom + 16}
                  fontSize={10.5}
                  fontWeight="700"
                  fill="#475569"
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
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Patient Data Dots & Anti-Collision Value Pills */}
        {patientPoints.map((pt, i) => {
          const cx = getX(pt.x);
          const cy = getY(pt.y);
          const isLatest = i === patientPoints.length - 1;
          const isSelected = selectedRecord?.recorded_date === pt.record.recorded_date;

          // Collision Detection: don't render overlapping text labels if points are < 36px apart
          const prevPt = i > 0 ? patientPoints[i - 1] : null;
          const prevCx = prevPt ? getX(prevPt.x) : -999;
          const isTooClose = Math.abs(cx - prevCx) < 36;
          const shouldShowLabel = !isTooClose || isSelected || isLatest;

          return (
            <G
              key={`patient-dot-${i}`}
              onPress={() => interactive && setSelectedRecord(pt.record)}
            >
              {/* Highlight Halo for Selected Point */}
              {isSelected && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={14}
                  fill={isBoy ? 'rgba(37, 99, 235, 0.25)' : 'rgba(225, 29, 72, 0.25)'}
                />
              )}

              {/* Point Circle */}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7.5 : isLatest ? 6.5 : 5}
                fill={isSelected ? '#0F172A' : themeColor}
                stroke="#FFFFFF"
                strokeWidth={2.5}
              />

              {/* Readable Pill Background & Text Label */}
              {shouldShowLabel && (
                <G>
                  <Rect
                    x={cx - 18}
                    y={cy - 22}
                    width={36}
                    height={15}
                    rx={4}
                    fill="#FFFFFF"
                    stroke={isSelected ? themeColor : '#CBD5E1'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <SvgText
                    x={cx}
                    y={cy - 11}
                    fontSize={9.5}
                    fontWeight="800"
                    fill={isSelected ? themeColor : '#0F172A'}
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
        style={[styles.tabBtn, activeTab === 'WFA' && styles.tabBtnActive]}
        onPress={() => setActiveTab('WFA')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'WFA' && styles.tabBtnTextActive]}>
          WFA (බර/වයස)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'HFA' && styles.tabBtnActive]}
        onPress={() => setActiveTab('HFA')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'HFA' && styles.tabBtnTextActive]}>
          HFA (උස/වයස)
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabBtn, activeTab === 'WFH' && styles.tabBtnActive]}
        onPress={() => setActiveTab('WFH')}
      >
        <Text style={[styles.tabBtnText, activeTab === 'WFH' && styles.tabBtnTextActive]}>
          WFH (බර/උස)
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderLegend = () => (
    <View style={styles.legendRow}>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: 'rgba(16, 185, 129, 0.4)' }]} />
        <Text style={styles.legendText}>Normal (-2SD සිට +2SD)</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: 'rgba(245, 158, 11, 0.4)' }]} />
        <Text style={styles.legendText}>MAM (-3SD සිට -2SD)</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendBox, { backgroundColor: 'rgba(239, 68, 68, 0.35)' }]} />
        <Text style={styles.legendText}>SAM (&lt; -3SD)</Text>
      </View>
    </View>
  );

  const renderTable = () => {
    if (growthRecords.length === 0) return null;
    return (
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
          <TouchableOpacity
            key={`hist-${i}`}
            style={[
              styles.tr,
              selectedRecord?.recorded_date === r.recorded_date && { backgroundColor: '#EFF6FF' },
            ]}
            onPress={() => setSelectedRecord(r)}
          >
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
            <Text style={styles.title}>WHO CHDR Growth Chart</Text>
            <View
              style={[
                styles.genderPill,
                { backgroundColor: isBoy ? '#EFF6FF' : '#FFF1F2', borderColor: themeColor },
              ]}
            >
              <Text style={[styles.genderPillText, { color: themeColor }]}>
                {isBoy ? '👦 Boy' : '👧 Girl'}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            ළමා සෞඛ්‍ය සංවර්ධන වාර්තාව (CHDR) • WHO Child Standards
          </Text>
        </View>
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setIsFullscreen(true)}
          accessibilityLabel="Expand and zoom growth chart"
        >
          <Text style={styles.expandBtnText}>🔍 විශාල කරන්න</Text>
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
      {renderTabs()}

      {/* Standard SVG Canvas */}
      <View style={styles.svgWrapper}>
        {renderPlotArea(defaultWidth, defaultHeight, false, true)}
      </View>

      {/* WHO Zone Legend */}
      {renderLegend()}

      {/* History Table */}
      {renderTable()}

      {/* Zoom Modal with Sticky Fixed Y-Axis */}
      {isFullscreen && (
        <ChartZoomModal
          visible={isFullscreen}
          onClose={() => {
            setIsFullscreen(false);
            setSelectedRecord(null);
          }}
          title={`WHO CHDR Growth (${activeTab})`}
          subtitle={childName ? `දරුවා: ${childName} • ${isBoy ? 'පිරිමි' : 'ගැහැණු'}` : 'ළමා සෞඛ්‍ය සංවර්ධන ප්‍රස්තාරය'}
          badgeText={isBoy ? '👦 Boy' : '👧 Girl'}
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
              {selectedRecord && (
                <View style={styles.selectedPointCard}>
                  <Text style={styles.selectedPointTitle}>📍 තෝරාගත් මිනුම (Selected Measurement)</Text>
                  <Text style={styles.selectedPointDetails}>
                    දිනය: <Text style={{ fontWeight: '700' }}>{formatDMY(selectedRecord.recorded_date)}</Text> • 
                    වයස: <Text style={{ fontWeight: '700' }}>{selectedRecord.age_months} මාස</Text> • 
                    බර: <Text style={{ fontWeight: '800', color: themeColor }}>{selectedRecord.weight_kg ?? '-'} kg</Text> • 
                    උස: <Text style={{ fontWeight: '700' }}>{selectedRecord.height_cm ?? '-'} cm</Text>
                  </Text>
                </View>
              )}
              {zScoreEval && (
                <View
                  style={[
                    styles.banner,
                    { backgroundColor: statusStyle.bg, borderColor: statusStyle.border, marginBottom: 10 },
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
    paddingVertical: 4,
    paddingHorizontal: 2,
    borderRadius: 4,
  },
  td: {
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
