import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  getAllMothers,
  getAllChildren,
  type MotherWithPregnancy,
  type Child,
} from '@/src/db';
import { RiskBadge } from '@/src/components/RiskBadge';
import { calculatePOA, formatPOA } from '@/src/engine/pregnancyCalc';
import { COLORS, RADIUS, SHADOWS } from '@/src/theme/tokens';

type TabMode = 'MOTHERS' | 'CHILDREN';
type FilterOption = 'ALL' | 'RED' | 'YELLOW' | 'FALTERING';

export default function DirectoryScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  const [mode, setMode] = useState<TabMode>('MOTHERS');
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [mothers, setMothers] = useState<MotherWithPregnancy[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [allMothers, allChildren] = await Promise.all([
        getAllMothers(),
        getAllChildren(),
      ]);
      setMothers(allMothers);
      setChildren(allChildren);
    } catch (e) {
      console.error('Error loading directory:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Filter Mothers
  const filteredMothers = mothers.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.full_name.toLowerCase().includes(q) ||
      (m.nic && m.nic.toLowerCase().includes(q)) ||
      (m.eligible_family_no && m.eligible_family_no.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === 'RED') return m.risk_level === 'RED';
    if (filter === 'YELLOW') return m.risk_level === 'YELLOW';
    return true;
  });

  // Filter Children
  const filteredChildren = children.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.full_name.toLowerCase().includes(q) ||
      (c.mother_name && c.mother_name.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filter === 'FALTERING') return c.growth_faltering_flag === 1;
    return true;
  });

  return (
    <View style={styles.container}>
      {/* 1. SEARCH BAR */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('directory.searchPlaceholder', 'Search by Name, NIC, or Family No...')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textTertiary}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* 2. SEGMENTED TOGGLE (Mothers | Children) */}
      <View style={styles.segmentedContainer}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.segmentBtn, mode === 'MOTHERS' && styles.segmentBtnActive]}
            onPress={() => {
              setMode('MOTHERS');
              setFilter('ALL');
            }}
          >
            <Text style={[styles.segmentText, mode === 'MOTHERS' && styles.segmentTextActive]}>
              {t('directory.mothers', 'Mothers')} ({filteredMothers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.segmentBtn, mode === 'CHILDREN' && styles.segmentBtnActive]}
            onPress={() => {
              setMode('CHILDREN');
              setFilter('ALL');
            }}
          >
            <Text style={[styles.segmentText, mode === 'CHILDREN' && styles.segmentTextActive]}>
              {t('directory.children', 'Children')} ({filteredChildren.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. FILTER CHIPS */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.filterChip, filter === 'ALL' && styles.filterChipActive]}
          onPress={() => setFilter('ALL')}
        >
          <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>
            {t('directory.all', 'All')}
          </Text>
        </TouchableOpacity>

        {mode === 'MOTHERS' ? (
          <>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.filterChip,
                styles.filterRed,
                filter === 'RED' && styles.filterRedActive,
              ]}
              onPress={() => setFilter(filter === 'RED' ? 'ALL' : 'RED')}
            >
              <View style={[styles.chipDot, { backgroundColor: filter === 'RED' ? '#FFFFFF' : COLORS.risk.red.dot }]} />
              <Text
                style={[
                  styles.filterText,
                  { color: COLORS.risk.red.text },
                  filter === 'RED' && styles.filterTextActiveWhite,
                ]}
              >
                {t('directory.redRisk', 'RED Risk')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.filterChip,
                styles.filterYellow,
                filter === 'YELLOW' && styles.filterYellowActive,
              ]}
              onPress={() => setFilter(filter === 'YELLOW' ? 'ALL' : 'YELLOW')}
            >
              <View style={[styles.chipDot, { backgroundColor: filter === 'YELLOW' ? '#FFFFFF' : COLORS.risk.yellow.dot }]} />
              <Text
                style={[
                  styles.filterText,
                  { color: COLORS.risk.yellow.text },
                  filter === 'YELLOW' && styles.filterTextActiveWhite,
                ]}
              >
                {t('directory.yellowRisk', 'YELLOW Risk')}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.filterChip,
              styles.filterOrange,
              filter === 'FALTERING' && styles.filterOrangeActive,
            ]}
            onPress={() => setFilter(filter === 'FALTERING' ? 'ALL' : 'FALTERING')}
          >
            <View style={[styles.chipDot, { backgroundColor: filter === 'FALTERING' ? '#FFFFFF' : '#EA580C' }]} />
            <Text
              style={[
                styles.filterText,
                { color: '#C2410C' },
                filter === 'FALTERING' && styles.filterTextActiveWhite,
              ]}
            >
              {t('directory.growthFaltering', 'Growth Faltering')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 4. LIST CONTENT */}
      {mode === 'MOTHERS' ? (
        <FlatList
          data={filteredMothers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('directory.noResults', 'No mothers found')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const poaStr = item.lrmp_date
              ? formatPOA(calculatePOA(new Date(item.lrmp_date)))
              : 'Pre-conception';

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.card}
                onPress={() => router.push(`/mother/${item.id}` as any)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardName}>{item.full_name}</Text>
                    <Text style={styles.cardSub}>
                      NIC: {item.nic || 'N/A'} • Family: {item.eligible_family_no || 'N/A'}
                    </Text>
                  </View>
                  <RiskBadge level={item.risk_level || 'GREEN'} score={item.risk_score} />
                </View>

                <View style={styles.cardDetailsRow}>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>POA</Text>
                    <Text style={styles.detailVal}>{poaStr}</Text>
                  </View>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>GN Division</Text>
                    <Text style={styles.detailVal}>{item.gn_division || 'General'}</Text>
                  </View>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailVal}>{item.phone || 'N/A'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : (
        <FlatList
          data={filteredChildren}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('directory.noResults', 'No children found')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const dob = new Date(item.dob);
            const now = new Date();
            const ageMonths = Math.max(
              0,
              (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
            );

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.card,
                  item.growth_faltering_flag === 1 && styles.cardFaltering,
                ]}
                onPress={() => router.push(`/child/${item.id}` as any)}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardName}>
                      {item.gender === 'M' ? '👦' : '👧'} {item.full_name}
                    </Text>
                    <Text style={styles.cardSub}>Mother: {item.mother_name || 'N/A'}</Text>
                  </View>

                  <View
                    style={[
                      styles.nutritionBadge,
                      item.nutrition_status === 'SAM'
                        ? styles.badgeSAM
                        : item.nutrition_status === 'MAM'
                        ? styles.badgeMAM
                        : styles.badgeNormal,
                    ]}
                  >
                    <Text
                      style={[
                        styles.nutritionText,
                        item.nutrition_status === 'SAM'
                          ? styles.textSAM
                          : item.nutrition_status === 'MAM'
                          ? styles.textMAM
                          : styles.textNormal,
                      ]}
                    >
                      {item.nutrition_status}
                    </Text>
                  </View>
                </View>

                {item.growth_faltering_flag === 1 && (
                  <View style={styles.falteringBanner}>
                    <View style={styles.falteringDot} />
                    <Text style={styles.falteringBannerText}>
                      GROWTH FALTERING ALERT — Weight not gaining
                    </Text>
                  </View>
                )}

                <View style={styles.cardDetailsRow}>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>Age</Text>
                    <Text style={styles.detailVal}>
                      {ageMonths}m ({Math.floor(ageMonths / 12)}y {ageMonths % 12}m)
                    </Text>
                  </View>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>Birth Wt</Text>
                    <Text style={styles.detailVal}>{item.birth_weight_kg ?? '-'} kg</Text>
                  </View>
                  <View style={styles.cardDetailItem}>
                    <Text style={styles.detailLabel}>DOB</Text>
                    <Text style={styles.detailVal}>{item.dob}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* 5. FLOATING ACTION BUTTON (+ Register Mother) */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={() => router.push('/mother/register' as any)}
      >
        <Text style={styles.fabText}>{t('directory.registerMother', '+ Register Mother')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  segmentedContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.md,
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    ...SHADOWS.card,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    gap: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.textWhite,
  },
  filterTextActiveWhite: {
    color: COLORS.textWhite,
  },
  filterRed: {
    borderColor: COLORS.risk.red.border,
    backgroundColor: COLORS.risk.red.bg,
  },
  filterRedActive: {
    backgroundColor: COLORS.risk.red.accent,
    borderColor: COLORS.risk.red.accent,
  },
  filterYellow: {
    borderColor: COLORS.risk.yellow.border,
    backgroundColor: COLORS.risk.yellow.bg,
  },
  filterYellowActive: {
    backgroundColor: COLORS.risk.yellow.accent,
    borderColor: COLORS.risk.yellow.accent,
  },
  filterOrange: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  filterOrangeActive: {
    backgroundColor: '#EA580C',
    borderColor: '#EA580C',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.borderHairline,
    ...SHADOWS.card,
  },
  cardFaltering: {
    borderColor: '#FDBA74',
    borderWidth: 1.5,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceSubtle,
    borderRadius: RADIUS.sm,
    padding: 8,
    marginTop: 8,
  },
  cardDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailVal: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '700',
    marginTop: 2,
  },
  nutritionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  badgeNormal: {
    backgroundColor: COLORS.nutrition.normal.bg,
    borderColor: COLORS.nutrition.normal.border,
  },
  badgeMAM: {
    backgroundColor: COLORS.nutrition.mam.bg,
    borderColor: COLORS.nutrition.mam.border,
  },
  badgeSAM: {
    backgroundColor: COLORS.nutrition.sam.bg,
    borderColor: COLORS.nutrition.sam.border,
  },
  nutritionText: {
    fontSize: 11,
    fontWeight: '800',
  },
  textNormal: {
    color: COLORS.nutrition.normal.text,
  },
  textMAM: {
    color: COLORS.nutrition.mam.text,
  },
  textSAM: {
    color: COLORS.nutrition.sam.text,
  },
  falteringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginVertical: 6,
    gap: 6,
  },
  falteringDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EA580C',
  },
  falteringBannerText: {
    color: '#C2410C',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: RADIUS.full,
    ...SHADOWS.floating,
  },
  fabText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: 14,
  },
});
