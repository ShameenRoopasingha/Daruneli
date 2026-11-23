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
  SFH_REFERENCE_TABLE,
} from '../../engine/referenceCurves';
import { analyzeSfh, SfhVisitInput } from '../../engine/chartAnalyzers';
import { formatDMY } from './GestationalWheelTool';
import { ChartZoomModal } from './ChartZoomModal';
import { RADIUS, SHADOWS } from '../../theme';

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
  const [selectedVisit, setSelectedVisit] = useState<SfhVisitInput | null>(null);

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
  const defaultWidth = Math.max(300, screenWidth - 32);
  const defaultHeight = 220;

  const minX = 16;
  const maxX = 40;
  const minY = 10;
  const maxY = 45;
  const yTicks = [15, 20, 25, 30, 35, 40];

  const getYConfig = (h: number) => {
    const padTop = 18;
    const padBottom = 26;
    const plotH = h - padTop - padBottom;
    const getY = (cm: number) => padTop + plotH - ((cm - minY) / (maxY - minY)) * plotH;
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
        {yTicks.map((val) => {
          const y = getY(val);
          return (
            <G key={`sfh-fix-y-${val}`}>
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
                {val}cm
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

    const getX = (week: number) => padLeft + ((week - minX) / (maxX - minX)) * plotW;

    const p10Points = SFH_REFERENCE_TABLE.map((p) => `${getX(p.week)},${getY(p.p10)}`);
    const p90PointsReversed = [...SFH_REFERENCE_TABLE].reverse().map((p) => `${getX(p.week)},${getY(p.p90)}`);
    const corridorPath = `M ${p10Points.join(' L ')} L ${p90PointsReversed.join(' L ')} Z`;

    const p50Path = SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p50)}`).join(' ');

    const patientPath = validVisits
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${getX(v.poaWeeks!)} ${getY(v.sfhCm!)}`)
      .join(' ');

    const weeksToShow = width > 1000
      ? [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]
      : width > 500
      ? [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]
      : [16, 20, 24, 28, 32, 36, 40];

    return (
      <Svg width={width} height={height}>
        {/* Shaded Corridor */}
        <Path d={corridorPath} fill="rgba(16, 185, 129, 0.16)" />

        {/* Horizontal Grid lines */}
        {yTicks.map((val) => {
          const y = getY(val);
          return (
            <G key={`sfh-grid-y-${val}`}>
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
                  {val}cm
                </SvgText>
              )}
            </G>
          );
        })}

        {/* X-axis Grid & Labels */}
        {weeksToShow.map((w) => {
          const x = getX(w);
          return (
            <G key={`sfh-grid-x-${w}`}>
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

        {/* 10th and 90th Centile Boundary Lines */}
        <Path
          d={SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p10)}`).join(' ')}
          stroke="#10B981"
          strokeWidth={1.5}
          strokeDasharray="4, 3"
          fill="none"
        />
        <Path
          d={SFH_REFERENCE_TABLE.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.week)} ${getY(p.p90)}`).join(' ')}
          stroke="#10B981"
          strokeWidth={1.5}
          strokeDasharray="4, 3"
          fill="none"
        />

        {/* 50th Centile Median Line */}
        <Path d={p50Path} stroke="#059669" strokeWidth={2.2} fill="none" />

        {/* Patient SFH Curve */}
        {validVisits.length > 1 && (
          <Path
            d={patientPath}
            stroke="#2563EB"
            strokeWidth={3.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Patient SFH Data Points & Readable Pills */}
        {validVisits.map((v, idx) => {
          const cx = getX(v.poaWeeks!);
          const cy = getY(v.sfhCm!);
          const isLatest = idx === validVisits.length - 1;
          const isSelected =
            selectedVisit &&
            selectedVisit.poaWeeks === v.poaWeeks &&
            selectedVisit.sfhCm === v.sfhCm;

          const prevV = idx > 0 ? validVisits[idx - 1] : null;
          const prevCx = prevV ? getX(prevV.poaWeeks!) : -999;
          const isTooClose = Math.abs(cx - prevCx) < 36;
          const shouldShowLabel = !isTooClose || isSelected || isLatest;

          return (
            <G
              key={`sfh-pt-${idx}`}
              onPress={() => interactive && setSelectedVisit(v)}
            >
              {isSelected && (
                <Circle
                  cx={cx}
                  cy={cy}
                  r={14}
                  fill="rgba(37, 99, 235, 0.25)"
                />
              )}
              <Circle
                cx={cx}
                cy={cy}
                r={isSelected ? 7.5 : isLatest ? 6.5 : 5}
                fill={isSelected ? '#0F172A' : isLatest ? '#1D4ED8' : '#2563EB'}
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
                    stroke={isSelected ? '#2563EB' : '#CBD5E1'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <SvgText
                    x={cx}
                    y={cy - 11}
                    fontSize={9.5}
                    fontWeight="800"
                    fill={isSelected ? '#1D4ED8' : '#0F172A'}
                    textAnchor="middle"
                  >
                    {v.sfhCm}
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
  );

  const renderClinicalBanner = () => (
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
  );

  const renderTable = () => {
    if (validVisits.length === 0) return null;
    return (
      <View style={styles.tableWrapper}>
        <Text style={styles.tableHeading}>Recorded Visits History</Text>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.thText, { flex: 1.2 }]}>Date</Text>
          <Text style={[styles.thText, { flex: 1 }]}>POA</Text>
          <Text style={[styles.thText, { flex: 1 }]}>SFH (cm)</Text>
          <Text style={[styles.thText, { flex: 1.5 }]}>Centile Range</Text>
        </View>
        {validVisits.map((v, i) => (
          <TouchableOpacity
            key={`hist-${i}`}
            style={[
              styles.tableDataRow,
              selectedVisit?.visitDate === v.visitDate && { backgroundColor: '#EFF6FF' },
            ]}
            onPress={() => setSelectedVisit(v)}
          >
            <Text style={[styles.tdText, { flex: 1.2 }]}>{formatDMY(v.visitDate)}</Text>
            <Text style={[styles.tdText, { flex: 1, fontWeight: '700' }]}>{v.poaWeeks}w</Text>
            <Text style={[styles.tdText, { flex: 1, color: '#2563EB', fontWeight: '800' }]}>
              {v.sfhCm} cm
            </Text>
            <Text style={[styles.tdText, { flex: 1.5, color: '#059669' }]}>
              10th-90th Normal
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.card}>
      {/* Chart Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
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
          onPress={() => setIsFullscreen(true)}
          accessibilityLabel="Expand and zoom chart"
        >
          <Text style={styles.expandBtnText}>🔍 විශාල කරන්න</Text>
        </TouchableOpacity>
      </View>

      {/* Clinical Alert Banner */}
      {renderClinicalBanner()}

      {/* Standard SVG Canvas */}
      <View style={styles.svgWrapper}>
        {renderPlotArea(defaultWidth, defaultHeight, false, true)}
      </View>

      {/* Chart Legend */}
      {renderLegend()}

      {/* Measurement Table Snippet */}
      {renderTable()}

      {/* Zoom Modal with Sticky Y-Axis */}
      {isFullscreen && (
        <ChartZoomModal
          visible={isFullscreen}
          onClose={() => {
            setIsFullscreen(false);
            setSelectedVisit(null);
          }}
          title="Symphysis-Fundal Height (SFH)"
          subtitle={motherName ? `මව: ${motherName} (සති 16 - 40)` : 'ගර්භාෂ උස ප්‍රස්තාරය (සති 16 - 40)'}
          badgeText="FHB Standard"
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
                  <Text style={styles.selectedPointTitle}>📍 තෝරාගත් වාර්තාව (Selected Point)</Text>
                  <Text style={styles.selectedPointDetails}>
                    දිනය: <Text style={{ fontWeight: '700' }}>{formatDMY(selectedVisit.visitDate)}</Text> • 
                    ගර්භ සති: <Text style={{ fontWeight: '700' }}>{selectedVisit.poaWeeks} සති</Text> • 
                    SFH: <Text style={{ fontWeight: '800', color: '#2563EB' }}>{selectedVisit.sfhCm} cm</Text>
                  </Text>
                </View>
              )}
              {renderClinicalBanner()}
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
  chartTitle: {
    fontSize: 15,
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  alertNormal: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  alertWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
  },
  alertDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertTextEn: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertTextSi: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
  },
  textNormal: {
    color: '#065F46',
  },
  textWarning: {
    color: '#92400E',
  },
  textDanger: {
    color: '#991B1B',
  },
  svgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
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
