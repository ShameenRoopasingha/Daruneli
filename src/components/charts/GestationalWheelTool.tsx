import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Path } from 'react-native-svg';
import { calculatePOA, calculateEDD } from '../../engine/pregnancyCalc';

interface GestationalWheelToolProps {
  initialLrmp?: string | null;
  visible?: boolean;
  onClose?: () => void;
  isModal?: boolean;
}

export function formatDMY(dateInput?: string | Date | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export const GestationalWheelTool: React.FC<GestationalWheelToolProps> = ({
  initialLrmp,
  visible = true,
  onClose,
  isModal = false,
}) => {
  // Default LRMP: 20 weeks ago if not provided
  const defaultDate = initialLrmp
    ? new Date(initialLrmp)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() - 140);
        return d;
      })();

  const [lrmpDate, setLrmpDate] = useState<Date>(defaultDate);

  const poaInfo = calculatePOA(lrmpDate);
  const eddDate = calculateEDD(lrmpDate);

  // Wheel dimensions
  const wheelSize = Math.min(Dimensions.get('window').width - 48, 290);
  const center = wheelSize / 2;
  const radius = center - 22;
  const innerRadius = radius - 26;

  // Milestone points on the 40-week circle (0 to 40 weeks maps to 0 to 360 degrees)
  // 0 deg = top (12 o'clock), rotating clockwise
  const getAngle = (weeks: number) => {
    const fraction = Math.min(1, Math.max(0, weeks / 40));
    return fraction * 360 - 90; // start at top (-90deg)
  };

  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const arcSweep = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, arcSweep, 0, end.x, end.y].join(' ');
  };

  // Adjust LRMP helper
  const adjustWeeks = (deltaWeeks: number) => {
    const next = new Date(lrmpDate);
    next.setDate(next.getDate() + deltaWeeks * 7);
    setLrmpDate(next);
  };

  const currentAngle = getAngle(poaInfo.poaWeeks + poaInfo.poaDays / 7);
  const needlePoint = polarToCartesian(center, center, radius + 2, currentAngle + 90);

  // Clinical Milestones
  const milestones = [
    { week: 12, title: 'Booking Clinic Visit', titleSi: 'පළමු ලියාපදිංචිය', desc: 'FHB registration, initial blood tests & BMI' },
    { week: 20, title: 'Anomaly Scan', titleSi: 'ව්‍යුහාත්මක ස්කෑන් පරීක්ෂණය', desc: 'Fetal anomaly ultrasound review' },
    { week: 26, title: 'OGTT Screening', titleSi: 'දියවැඩියා පරීක්ෂාව (OGTT)', desc: 'Oral Glucose Tolerance Test (24-28w)' },
    { week: 28, title: 'Cardiff Kick Count', titleSi: 'දරු චලන ගණන් කිරීම', desc: 'Commence daily Count-to-10 tracking' },
    { week: 37, title: 'Full Term', titleSi: 'පූර්ණ ගර්භ කාලය', desc: 'Infant lung maturity reached' },
    { week: 40, title: 'EDD Delivery Due', titleSi: 'ප්‍රසව දිනය (EDD)', desc: 'Expected delivery date' },
  ];

  const content = (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Gestational Age Wheel</Text>
          <Text style={styles.subtitle}>ගර්භ කාල ගණක චක්‍රය • Sri Lanka FHB</Text>
        </View>
        {isModal && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Adjustment Bar */}
      <View style={styles.dateBar}>
        <View style={styles.dateInfoCol}>
          <Text style={styles.dateLabel}>LRMP (අවසන් ඔසප් දිනය)</Text>
          <Text style={styles.dateValue}>{formatDMY(lrmpDate)}</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustWeeks(1)}
            accessibilityLabel="Minus one week of pregnancy"
          >
            <Text style={styles.stepBtnText}>-1w</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => adjustWeeks(-1)}
            accessibilityLabel="Plus one week of pregnancy"
          >
            <Text style={styles.stepBtnText}>+1w</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnReset]}
            onPress={() => setLrmpDate(defaultDate)}
          >
            <Text style={styles.stepBtnResetText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Circular SVG Wheel */}
      <View style={styles.wheelWrapper}>
        <Svg width={wheelSize} height={wheelSize}>
          {/* Base Background Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={16}
            fill="#FFFFFF"
          />

          {/* 1st Trimester Arc (0 - 12 weeks = 0 to 108 deg) */}
          <Path
            d={describeArc(center, center, radius, 0, 108)}
            stroke="#0284C7"
            strokeWidth={14}
            fill="none"
          />

          {/* 2nd Trimester Arc (12 - 27 weeks = 108 to 243 deg) */}
          <Path
            d={describeArc(center, center, radius, 108, 243)}
            stroke="#059669"
            strokeWidth={14}
            fill="none"
          />

          {/* 3rd Trimester Arc (27 - 40 weeks = 243 to 360 deg) */}
          <Path
            d={describeArc(center, center, radius, 243, 359.9)}
            stroke="#D97706"
            strokeWidth={14}
            fill="none"
          />

          {/* Inner Border */}
          <Circle
            cx={center}
            cy={center}
            r={innerRadius}
            stroke="#CBD5E1"
            strokeWidth={1}
            strokeDasharray="2, 4"
            fill="none"
          />

          {/* Week Tick Marks & Labels around the circumference */}
          {[0, 10, 20, 30, 40].map((w) => {
            const angle = (w / 40) * 360;
            const pOuter = polarToCartesian(center, center, radius + 11, angle);
            const pInner = polarToCartesian(center, center, radius - 11, angle);
            const pText = polarToCartesian(center, center, radius + 17, angle);
            return (
              <G key={`tick-${w}`}>
                <Line
                  x1={pInner.x}
                  y1={pInner.y}
                  x2={pOuter.x}
                  y2={pOuter.y}
                  stroke="#475569"
                  strokeWidth={2}
                />
                <SvgText
                  x={pText.x}
                  y={pText.y + 3}
                  fontSize={10}
                  fontWeight="bold"
                  fill="#1E293B"
                  textAnchor="middle"
                >
                  {w}w
                </SvgText>
              </G>
            );
          })}

          {/* Current POA Needle */}
          <Line
            x1={center}
            y1={center}
            x2={needlePoint.x}
            y2={needlePoint.y}
            stroke="#EF4444"
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Circle cx={needlePoint.x} cy={needlePoint.y} r={5} fill="#EF4444" />
          <Circle cx={center} cy={center} r={6} fill="#0F172A" />
        </Svg>

        {/* Center Readout Overlay */}
        <View style={styles.centerReadout}>
          <Text style={styles.centerPoaLabel}>Gestational Age</Text>
          <Text style={styles.centerPoaValue}>
            {poaInfo.poaWeeks}w {poaInfo.poaDays}d
          </Text>
          <View
            style={[
              styles.trimesterBadge,
              poaInfo.trimester === 1 && { backgroundColor: '#E0F2FE' },
              poaInfo.trimester === 2 && { backgroundColor: '#DCFCE7' },
              poaInfo.trimester === 3 && { backgroundColor: '#FEF3C7' },
            ]}
          >
            <Text
              style={[
                styles.trimesterText,
                poaInfo.trimester === 1 && { color: '#0369A1' },
                poaInfo.trimester === 2 && { color: '#15803D' },
                poaInfo.trimester === 3 && { color: '#B45309' },
              ]}
            >
              Trimester {poaInfo.trimester}
            </Text>
          </View>
        </View>
      </View>

      {/* Summary Stat Grid */}
      <View style={styles.statGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>EDD (ප්‍රසව දිනය)</Text>
          <Text style={styles.statValue}>{formatDMY(eddDate)}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Progress (ප්‍රගතිය)</Text>
          <Text style={styles.statValue}>{poaInfo.progressPercent.toFixed(0)}%</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Days to Delivery</Text>
          <Text style={styles.statValue}>
            {Math.max(0, 280 - poaInfo.poaTotalDays)}d
          </Text>
        </View>
      </View>

      {/* FHB Standard Clinical Milestones */}
      <View style={styles.milestonesSection}>
        <Text style={styles.milestoneHeading}>Key FHB Clinical Milestones (සායනික ඉලක්ක)</Text>
        {milestones.map((m) => {
          const isPast = poaInfo.poaWeeks >= m.week;
          const isCurrent = Math.abs(poaInfo.poaWeeks - m.week) <= 1;
          return (
            <View
              key={m.week}
              style={[
                styles.milestoneRow,
                isCurrent && styles.milestoneRowCurrent,
              ]}
            >
              <View
                style={[
                  styles.milestoneBadge,
                  isPast && styles.milestoneBadgePast,
                  isCurrent && styles.milestoneBadgeCurrent,
                ]}
              >
                <Text
                  style={[
                    styles.milestoneBadgeText,
                    (isPast || isCurrent) && styles.milestoneBadgeTextPast,
                  ]}
                >
                  {m.week}w
                </Text>
              </View>
              <View style={styles.milestoneContent}>
                <View style={styles.milestoneTitleRow}>
                  <Text style={styles.milestoneTitle}>{m.title}</Text>
                  {isCurrent && <Text style={styles.activeTag}>DUE NOW</Text>}
                  {isPast && !isCurrent && <Text style={styles.doneTag}>✓</Text>}
                </View>
                <Text style={styles.milestoneTitleSi}>{m.titleSi}</Text>
                <Text style={styles.milestoneDesc}>{m.desc}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (isModal) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
              {content}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 12,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
  },
  dateBar: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateInfoCol: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 6,
  },
  stepBtn: {
    backgroundColor: '#E2E8F0',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 36,
    minWidth: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  stepBtnReset: {
    backgroundColor: '#EEF2FF',
  },
  stepBtnResetText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4F46E5',
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  centerReadout: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
  },
  centerPoaLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerPoaValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  trimesterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 2,
  },
  trimesterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  milestonesSection: {
    marginTop: 8,
  },
  milestoneHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  milestoneRowCurrent: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  milestoneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  milestoneBadgePast: {
    backgroundColor: '#059669',
  },
  milestoneBadgeCurrent: {
    backgroundColor: '#2563EB',
  },
  milestoneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  milestoneBadgeTextPast: {
    color: '#FFFFFF',
  },
  milestoneContent: {
    flex: 1,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  milestoneTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  milestoneTitleSi: {
    fontSize: 11,
    color: '#475569',
  },
  milestoneDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  activeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  doneTag: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#059669',
  },
});
