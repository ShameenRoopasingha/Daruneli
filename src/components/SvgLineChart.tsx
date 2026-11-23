import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS } from '../theme';
import { ChartZoomModal } from './charts/ChartZoomModal';

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface SvgLineChartProps {
  data: DataPoint[];
  title: string;
  unit?: string;
  height?: number;
  width?: number;
  primaryColor?: string;
  secondaryColor?: string;
  primaryLegend?: string;
  secondaryLegend?: string;
  referenceLine?: { value: number; label: string; color: string };
  allowZoom?: boolean;
}

export const SvgLineChart: React.FC<SvgLineChartProps> = ({
  data,
  title,
  unit = '',
  height = 180,
  width: customWidth,
  primaryColor = COLORS.primary,
  secondaryColor = COLORS.risk.red.accent,
  primaryLegend,
  secondaryLegend,
  referenceLine,
  allowZoom = true,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = customWidth || Math.max(300, screenWidth - 32);

  if (!data || data.length < 2) {
    return (
      <View style={[styles.container, { height, width: chartWidth }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>
            {data && data.length === 1
              ? 'Only 1 record found (2+ required for trend)'
              : 'No recordings yet (2+ required for trend)'}
          </Text>
        </View>
      </View>
    );
  }

  // Calculate range
  const allValues = data.flatMap((d) => [d.value, ...(d.secondaryValue !== undefined ? [d.secondaryValue] : [])]);
  if (referenceLine) allValues.push(referenceLine.value);

  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const margin = (rawMax - rawMin) * 0.18 || 6;
  const minY = Math.floor(rawMin - margin);
  const maxY = Math.ceil(rawMax + margin);

  const renderSvgCanvas = (w: number, h: number, interactive = false) => {
    const paddingLeft = 38;
    const paddingRight = 20;
    const paddingTop = 22;
    const paddingBottom = 30;

    const plotWidth = w - paddingLeft - paddingRight;
    const plotHeight = h - paddingTop - paddingBottom;

    const getX = (index: number) => {
      if (data.length === 1) return paddingLeft + plotWidth / 2;
      return paddingLeft + (index / (data.length - 1)) * plotWidth;
    };

    const getY = (val: number) => {
      if (maxY === minY) return paddingTop + plotHeight / 2;
      return paddingTop + plotHeight - ((val - minY) / (maxY - minY)) * plotHeight;
    };

    // Build SVG Paths
    let primaryPath = '';
    let secondaryPath = '';

    data.forEach((pt, i) => {
      const x = getX(i);
      const yPrimary = getY(pt.value);
      if (i === 0) {
        primaryPath += `M ${x} ${yPrimary}`;
      } else {
        primaryPath += ` L ${x} ${yPrimary}`;
      }

      if (pt.secondaryValue !== undefined) {
        const ySecondary = getY(pt.secondaryValue);
        if (i === 0) {
          secondaryPath += `M ${x} ${ySecondary}`;
        } else {
          secondaryPath += ` L ${x} ${ySecondary}`;
        }
      }
    });

    return (
      <Svg width={w} height={h}>
        {/* Subtle background container */}
        <Rect
          x={paddingLeft}
          y={paddingTop}
          width={plotWidth}
          height={plotHeight}
          fill="#FAFAFA"
          rx={8}
        />

        {/* Horizontal grid lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + plotHeight * (1 - ratio);
          const val = Math.round(minY + ratio * (maxY - minY));
          return (
            <G key={`grid-${ratio}`}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={paddingLeft + plotWidth}
                y2={y}
                stroke="#F1F5F9"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <SvgText
                x={paddingLeft - 8}
                y={y + 3.5}
                fontSize={9}
                fill="#94A3B8"
                fontWeight="600"
                textAnchor="end"
              >
                {`${val}${unit ? ' ' + unit : ''}`}
              </SvgText>
            </G>
          );
        })}

        {/* Reference Line */}
        {referenceLine && (
          <G>
            <Line
              x1={paddingLeft}
              y1={getY(referenceLine.value)}
              x2={paddingLeft + plotWidth}
              y2={getY(referenceLine.value)}
              stroke={referenceLine.color}
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
            <SvgText
              x={paddingLeft + plotWidth - 6}
              y={getY(referenceLine.value) - 4}
              fontSize={9}
              fill={referenceLine.color}
              textAnchor="end"
              fontWeight="bold"
            >
              {referenceLine.label}
            </SvgText>
          </G>
        )}

        {/* Secondary Line */}
        {secondaryPath.length > 0 && (
          <Path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Primary Line */}
        {primaryPath.length > 0 && (
          <Path
            d={primaryPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {data.map((pt, i) => {
          const x = getX(i);
          const yPrimary = getY(pt.value);
          const isSelected = selectedPointIndex === i;

          return (
            <G
              key={`pt-${i}`}
              onPress={() => interactive && setSelectedPointIndex(i)}
            >
              {isSelected && (
                <Circle
                  cx={x}
                  cy={yPrimary}
                  r={12}
                  fill="rgba(13, 148, 136, 0.25)"
                />
              )}
              <Circle
                cx={x}
                cy={yPrimary}
                r={isSelected ? 6.5 : 4.5}
                fill={primaryColor}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
              <SvgText
                x={x}
                y={yPrimary - 8}
                fontSize={isSelected ? 11 : 10}
                fill={COLORS.textPrimary}
                fontWeight="800"
                textAnchor="middle"
              >
                {pt.value}
              </SvgText>

              {pt.secondaryValue !== undefined && (
                <G>
                  {isSelected && (
                    <Circle
                      cx={x}
                      cy={getY(pt.secondaryValue)}
                      r={12}
                      fill="rgba(220, 38, 38, 0.25)"
                    />
                  )}
                  <Circle
                    cx={x}
                    cy={getY(pt.secondaryValue)}
                    r={isSelected ? 6.5 : 4.5}
                    fill={secondaryColor}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                  <SvgText
                    x={x}
                    y={getY(pt.secondaryValue) + 14}
                    fontSize={isSelected ? 11 : 10}
                    fill={COLORS.textPrimary}
                    fontWeight="800"
                    textAnchor="middle"
                  >
                    {pt.secondaryValue}
                  </SvgText>
                </G>
              )}

              {/* X-axis label */}
              <SvgText
                x={x}
                y={h - 8}
                fontSize={10}
                fill="#64748B"
                fontWeight="600"
                textAnchor="middle"
              >
                {pt.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    );
  };

  const renderLegend = () => (
    <View style={styles.legendRow}>
      {primaryLegend && (
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: primaryColor }]} />
          <Text style={styles.legendText}>{primaryLegend}</Text>
        </View>
      )}
      {secondaryLegend && (
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: secondaryColor }]} />
          <Text style={styles.legendText}>{secondaryLegend}</Text>
        </View>
      )}
    </View>
  );

  const selectedPt = selectedPointIndex !== null ? data[selectedPointIndex] : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.title}>{title}</Text>
          {renderLegend()}
        </View>

        {allowZoom && data.length >= 2 && (
          <TouchableOpacity
            style={styles.expandBtn}
            onPress={() => setIsFullscreen(true)}
            accessibilityLabel="Expand chart"
          >
            <Text style={styles.expandBtnText}>🔍 Zoom</Text>
          </TouchableOpacity>
        )}
      </View>

      {renderSvgCanvas(chartWidth, height, false)}

      {isFullscreen && (
        <ChartZoomModal
          visible={isFullscreen}
          onClose={() => {
            setIsFullscreen(false);
            setSelectedPointIndex(null);
          }}
          title={title}
          subtitle={`Clinical Trend Records (${data.length} measurements)`}
          badgeText={unit || 'Trend'}
          baseWidth={screenWidth - 24}
          baseHeight={260}
          initialScale={1.5}
          renderChart={(_scale, w, h) => renderSvgCanvas(w, h, true)}
          legend={renderLegend()}
          extraContent={
            selectedPt && (
              <View style={styles.selectedPointCard}>
                <Text style={styles.selectedPointTitle}>📍 තෝරාගත් මිනුම (Selected Point)</Text>
                <Text style={styles.selectedPointDetails}>
                  දිනය/ලේබලය: <Text style={{ fontWeight: '700' }}>{selectedPt.label}</Text> • 
                  {primaryLegend || 'අගය'}: <Text style={{ fontWeight: '800', color: primaryColor }}>{selectedPt.value} {unit}</Text>
                  {selectedPt.secondaryValue !== undefined && (
                    <>
                      {' • '}{secondaryLegend || 'ද්විතීයික'}: <Text style={{ fontWeight: '800', color: secondaryColor }}>{selectedPt.secondaryValue} {unit}</Text>
                    </>
                  )}
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  expandBtn: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#99F6E4',
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  expandBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontWeight: '500',
  },
  selectedPointCard: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
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
