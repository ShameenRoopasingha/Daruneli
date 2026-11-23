import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../theme';

export interface ChipOption {
  value: string;
  label: string;
  sublabel?: string;
  isDanger?: boolean;
}

interface TapChipSelectorProps {
  options: ChipOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
}

export const TapChipSelector: React.FC<TapChipSelectorProps> = ({
  options,
  selectedValues,
  onChange,
  multiSelect = true,
}) => {
  const handleToggle = (value: string) => {
    if (multiSelect) {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    } else {
      if (selectedValues.includes(value)) {
        onChange([]);
      } else {
        onChange([value]);
      }
    }
  };

  return (
    <View style={styles.grid}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        const isDanger = opt.isDanger;

        let bg = COLORS.surface;
        let border = COLORS.borderSubtle;
        let text = COLORS.textSecondary;

        if (isSelected) {
          if (isDanger) {
            bg = COLORS.risk.red.bg;
            border = COLORS.risk.red.accent;
            text = COLORS.risk.red.text;
          } else {
            bg = COLORS.primaryLight;
            border = COLORS.primary;
            text = COLORS.primaryDeep;
          }
        }

        return (
          <TouchableOpacity
            key={opt.value}
            activeOpacity={0.75}
            onPress={() => handleToggle(opt.value)}
            style={[
              styles.chip,
              {
                backgroundColor: bg,
                borderColor: border,
              },
            ]}
          >
            <View style={styles.contentRow}>
              {isSelected && (
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: isDanger ? COLORS.risk.red.accent : COLORS.primary },
                  ]}
                >
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              )}
              <Text
                style={[
                  styles.chipText,
                  {
                    color: text,
                    fontWeight: isSelected ? '700' : '600',
                  },
                ]}
              >
                {opt.label}
              </Text>
            </View>
            {opt.sublabel ? (
              <Text style={[styles.subText, { color: isSelected ? text : COLORS.textTertiary }]}>
                {opt.sublabel}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    minHeight: 46,
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  chipText: {
    fontSize: 13,
  },
  subText: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
});
