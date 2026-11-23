import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  PanResponder,
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

const ZOOM_STEPS = [1.0, 2.0, 3.0, 4.5, 6.0];

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

  const chartHeight = Math.round(baseHeight * (1 + (scale - 1) * 0.3));
  const hasStickyAxis = typeof renderYAxis === 'function' && typeof renderPlot === 'function';

  // If sticky Y-axis is active, plot width expands from (baseWidth - yAxisWidth)
  const plotWidth = hasStickyAxis
    ? Math.round((baseWidth - yAxisWidth) * scale)
    : Math.round(baseWidth * scale);

  // Gesture handler with closure state for pinch-to-zoom
  const [gestureHandler] = useState(() => {
    let initialDistance = 0;
    let initialScaleVal = initialScale;
    let lastTapTimestamp = 0;
    let currentScaleVal = initialScale;

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Double-tap with 1 finger to quick toggle zoom
        if (evt.nativeEvent.touches.length === 1) {
          const now = evt.nativeEvent.timestamp || 0;
          if (lastTapTimestamp > 0 && now - lastTapTimestamp < 280) {
            setScale((prev) => (prev < 2.5 ? 3.5 : 1.0));
            lastTapTimestamp = 0;
          } else {
            lastTapTimestamp = now;
          }
        }
        return false;
      },
      onMoveShouldSetPanResponderCapture: (evt) => {
        // Capture ONLY when 2 or more touches are present (two fingertips pinching)
        return evt.nativeEvent.touches.length >= 2;
      },
      onMoveShouldSetPanResponder: (evt) => {
        return evt.nativeEvent.touches.length >= 2;
      },
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length >= 2) {
          const t0 = evt.nativeEvent.touches[0];
          const t1 = evt.nativeEvent.touches[1];
          const dx = t0.pageX - t1.pageX;
          const dy = t0.pageY - t1.pageY;
          initialDistance = Math.hypot(dx, dy);
          initialScaleVal = currentScaleVal;
        }
      },
      onPanResponderMove: (evt) => {
        if (evt.nativeEvent.touches.length >= 2 && initialDistance > 0) {
          const t0 = evt.nativeEvent.touches[0];
          const t1 = evt.nativeEvent.touches[1];
          const dx = t0.pageX - t1.pageX;
          const dy = t0.pageY - t1.pageY;
          const currentDistance = Math.hypot(dx, dy);
          const ratio = currentDistance / initialDistance;
          const targetScale = +(initialScaleVal * ratio).toFixed(1);
          const clamped = Math.min(6.0, Math.max(1.0, targetScale));
          setScale(clamped);
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: () => {
        initialDistance = 0;
      },
      onPanResponderTerminate: () => {
        initialDistance = 0;
      },
    });

    return {
      instance: responder,
      updateCurrentScale: (s: number) => {
        currentScaleVal = s;
      },
    };
  });

  useEffect(() => {
    gestureHandler.updateCurrentScale(scale);
  }, [scale, gestureHandler]);

  const handleZoomIn = () => {
    setScale((prev) => Math.min(6.0, +(prev + 0.5).toFixed(1)));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(1.0, +(prev - 0.5).toFixed(1)));
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
              style={[styles.stepBtn, scale <= 1.0 && styles.stepBtnDisabled]}
              onPress={handleZoomOut}
              disabled={scale <= 1.0}
              accessibilityLabel="Zoom Out"
            >
              <Text style={[styles.stepBtnText, scale <= 1.0 && styles.stepBtnTextDisabled]}>
                −
              </Text>
            </TouchableOpacity>

            <View style={styles.presetChips}>
              {ZOOM_STEPS.map((step) => {
                const isActive = Math.abs(step - scale) < 0.25;
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
              style={[styles.stepBtn, scale >= 6.0 && styles.stepBtnDisabled]}
              onPress={handleZoomIn}
              disabled={scale >= 6.0}
              accessibilityLabel="Zoom In"
            >
              <Text style={[styles.stepBtnText, scale >= 6.0 && styles.stepBtnTextDisabled]}>
                +
              </Text>
            </TouchableOpacity>

            {/* Live Scale Indicator */}
            <View style={styles.liveScalePill}>
              <Text style={styles.liveScaleText}>{scale.toFixed(1)}x</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Text style={styles.resetBtnText}>↺ Reset</Text>
          </TouchableOpacity>
        </View>

        {/* User Navigation Hint */}
        <View style={styles.hintBar}>
          <Text style={styles.hintText}>
            👆 <Text style={{ fontWeight: '800' }}>ඇඟිලි තුඩු දෙකකින් විශාලනය කරන්න (Pinch to Zoom)</Text> • 1 ඇඟිල්ලෙන් අනුචලනය කරන්න (Pan) • දෙවරක් තට්ටු කරන්න (Double-tap)
          </Text>
        </View>

        {/* Scrollable Container (Vertical outer, Horizontal inner) */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.verticalScroll}
          contentContainerStyle={styles.verticalContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Chart Canvas Card with PanResponder for Pinch-to-Zoom */}
          <View {...gestureHandler.instance.panHandlers} style={styles.chartCard}>
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
    width: 30,
    height: 30,
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
    paddingHorizontal: 6,
    paddingVertical: 4,
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
  liveScalePill: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    marginLeft: 2,
  },
  liveScaleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F766E',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintText: {
    fontSize: 10,
    color: '#0F766E',
    fontWeight: '500',
  },
  verticalScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  verticalContent: {
    padding: 10,
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
