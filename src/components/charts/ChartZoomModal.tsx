import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RADIUS, SHADOWS } from '../../theme';

export interface ChartZoomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badgeText?: string;
  baseWidth?: number;
  baseHeight?: number;
  initialScale?: number;
  renderChart?: (scale: number, chartWidth: number, chartHeight: number) => React.ReactNode;
  renderPlot?: (scale: number, plotWidth: number, chartHeight: number) => React.ReactNode;
  renderYAxis?: (chartHeight: number) => React.ReactNode;
  yAxisWidth?: number;
  legend?: React.ReactNode;
  extraContent?: React.ReactNode;
}

const ZOOM_STEPS = [1.0, 1.5, 2.0, 3.0];

export const ChartZoomModal: React.FC<ChartZoomModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  badgeText = 'FHB Standard',
  baseWidth: customBaseWidth,
  baseHeight = 340,
  initialScale = 1.5,
  renderChart,
  renderPlot,
  renderYAxis,
  yAxisWidth = 44,
  legend,
  extraContent,
}) => {
  const [scale, setScale] = useState<number>(initialScale);
  const horizontalScrollRef = useRef<any>(null);
  const verticalScrollRef = useRef<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const baseWidth = customBaseWidth || Math.max(320, screenWidth - 28);

  const chartHeight = Math.round(baseHeight * (1 + (scale - 1) * 0.35));
  const hasStickyAxis = typeof renderYAxis === 'function' && typeof renderPlot === 'function';

  // If sticky Y-axis is active, plot width expands from (baseWidth - yAxisWidth)
  const plotWidth = hasStickyAxis
    ? Math.round((baseWidth - yAxisWidth) * scale)
    : Math.round(baseWidth * scale);

  const handleZoomIn = () => {
    const nextIdx = ZOOM_STEPS.findIndex((s) => s > scale);
    if (nextIdx !== -1) {
      setScale(ZOOM_STEPS[nextIdx]);
    }
  };

  const handleZoomOut = () => {
    const prevSteps = ZOOM_STEPS.filter((s) => s < scale);
    if (prevSteps.length > 0) {
      setScale(prevSteps[prevSteps.length - 1]);
    }
  };

  const handleReset = () => {
    setScale(1.0);
    horizontalScrollRef.current?.scrollTo({ x: 0, animated: true });
    verticalScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar barStyle="dark-content" />

        {/* Modal Header */}
        <View style={styles.header}>
          <View style={styles.titleArea}>
            <View style={styles.badgeRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {badgeText ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {badgeText}
                  </Text>
                </View>
              ) : null}
            </View>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close expanded chart"
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Compact, Non-clipping Zoom Controls Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.zoomGroup}>
            <TouchableOpacity
              style={[styles.stepBtn, scale <= ZOOM_STEPS[0] && styles.stepBtnDisabled]}
              onPress={handleZoomOut}
              disabled={scale <= ZOOM_STEPS[0]}
              accessibilityLabel="Zoom Out"
            >
              <Text style={[styles.stepBtnText, scale <= ZOOM_STEPS[0] && styles.stepBtnTextDisabled]}>
                −
              </Text>
            </TouchableOpacity>

            <View style={styles.presetChips}>
              {ZOOM_STEPS.map((step) => {
                const isActive = Math.abs(step - scale) < 0.05;
                return (
                  <TouchableOpacity
                    key={`step-${step}`}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => setScale(step)}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {step}x
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[
                styles.stepBtn,
                scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] && styles.stepBtnDisabled,
              ]}
              onPress={handleZoomIn}
              disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              accessibilityLabel="Zoom In"
            >
              <Text
                style={[
                  styles.stepBtnText,
                  scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] && styles.stepBtnTextDisabled,
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>

        {/* User Navigation Hint */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            💡 විශාලනය: <Text style={{ fontWeight: '800' }}>{scale}x</Text> • ප්‍රස්ථාරය හරහා බැලීමට වමට/දකුණට අනුචලනය කරන්න (Pan) • ලකුණු මත තට්ටු කර විස්තර බලන්න
          </Text>
        </View>

        {/* Scrollable Container (Vertical outer, Horizontal inner) */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.verticalScroll}
          contentContainerStyle={styles.verticalContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Chart Canvas Card with Sticky Y-Axis or Standard Horizontal Pan */}
          <View style={styles.chartCard}>
            {hasStickyAxis ? (
              <View style={styles.stickyChartRow}>
                {/* Fixed Sticky Y-Axis Column (never scrolls off screen!) */}
                <View style={[styles.stickyYAxisCol, { width: yAxisWidth, height: chartHeight }]}>
                  {renderYAxis!(chartHeight)}
                </View>

                {/* Horizontally Scrollable Plot Area */}
                <ScrollView
                  ref={horizontalScrollRef}
                  horizontal={true}
                  showsHorizontalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  contentContainerStyle={{
                    minWidth: plotWidth,
                    paddingRight: 16,
                  }}
                >
                  {renderPlot!(scale, plotWidth, chartHeight)}
                </ScrollView>
              </View>
            ) : (
              <ScrollView
                ref={horizontalScrollRef}
                horizontal={true}
                showsHorizontalScrollIndicator={true}
                nestedScrollEnabled={true}
                contentContainerStyle={{
                  minWidth: plotWidth,
                  paddingHorizontal: 8,
                  paddingVertical: 10,
                }}
              >
                {renderChart ? renderChart(scale, plotWidth, chartHeight) : null}
              </ScrollView>
            )}
          </View>

          {/* Legend Section */}
          {legend ? <View style={styles.legendContainer}>{legend}</View> : null}

          {/* Extra Content (Tables, Clinical Alerts, Analyzers) */}
          {extraContent ? <View style={styles.extraContainer}>{extraContent}</View> : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#99F6E4',
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#334155',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  stepBtnTextDisabled: {
    color: '#94A3B8',
  },
  presetChips: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.sm,
    padding: 2,
    gap: 2,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
  },
  chipActive: {
    backgroundColor: '#0D9488',
    ...SHADOWS.card,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  hintBar: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  hintText: {
    fontSize: 10.5,
    color: '#0F766E',
    fontWeight: '500',
  },
  verticalScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  verticalContent: {
    padding: 12,
    paddingBottom: 40,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.card,
    overflow: 'hidden',
  },
  stickyChartRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stickyYAxisCol: {
    backgroundColor: '#FAFAFA',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    zIndex: 10,
  },
  legendContainer: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  extraContainer: {
    marginTop: 10,
  },
});
