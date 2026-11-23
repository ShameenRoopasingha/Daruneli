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
  renderChart: (scale: number, chartWidth: number, chartHeight: number) => React.ReactNode;
  legend?: React.ReactNode;
  extraContent?: React.ReactNode;
}

const ZOOM_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0];

export const ChartZoomModal: React.FC<ChartZoomModalProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  badgeText = 'FHB Standard',
  baseWidth: customBaseWidth,
  baseHeight = 280,
  initialScale = 1.5,
  renderChart,
  legend,
  extraContent,
}) => {
  const [scale, setScale] = useState<number>(initialScale);
  const horizontalScrollRef = useRef<any>(null);
  const verticalScrollRef = useRef<any>(null);

  const screenWidth = Dimensions.get('window').width;
  const baseWidth = customBaseWidth || Math.max(320, screenWidth - 32);

  const chartWidth = Math.round(baseWidth * scale);
  const chartHeight = Math.round(baseHeight * (1 + (scale - 1) * 0.45));

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
                  <Text style={styles.badgeText}>{badgeText}</Text>
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close expanded chart"
          >
            <Text style={styles.closeBtnText}>✕ වසන්න</Text>
          </TouchableOpacity>
        </View>

        {/* Zoom Controls Toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.scaleSteppers}>
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
            💡 විශාලනය: <Text style={{ fontWeight: '800' }}>{scale}x</Text> • ප්‍රස්ථාරය හරහා බැලීමට වමට/දකුණට සහ ඉහළ/පහළට අනුචලනය කරන්න (Pan & Scroll)
          </Text>
        </View>

        {/* Scrollable Container (Vertical outer, Horizontal inner) */}
        <ScrollView
          ref={verticalScrollRef}
          style={styles.verticalScroll}
          contentContainerStyle={styles.verticalContent}
          showsVerticalScrollIndicator={true}
        >
          {/* Chart Canvas Card with Horizontal Pan */}
          <View style={styles.chartCard}>
            <ScrollView
              ref={horizontalScrollRef}
              horizontal={true}
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
              contentContainerStyle={{
                minWidth: chartWidth,
                paddingHorizontal: 8,
                paddingVertical: 12,
              }}
            >
              {renderChart(scale, chartWidth, chartHeight)}
            </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOWS.card,
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  badge: {
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0F766E',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  scaleSteppers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: '#E2E8F0',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  stepBtnTextDisabled: {
    color: '#94A3B8',
  },
  presetChips: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: RADIUS.md,
    padding: 3,
    gap: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  chipActive: {
    backgroundColor: '#0D9488',
    ...SHADOWS.card,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  hintBar: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  hintText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '500',
  },
  verticalScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  verticalContent: {
    padding: 14,
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
  legendContainer: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  extraContainer: {
    marginTop: 12,
  },
});
