import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, deleteRecord } from '../services/api';
import { CATEGORY_ICONS, getCategoryStyle } from '../constants/categories';
import { formatRecordDateDisplay, parseUserDateInput, toIsoDateForApi } from '../utils/recordDate';
import { useTheme } from '../context/ThemeContext';
import { formatMoney, formatMixedTotal } from '../utils/money';
import type { AppNavigation, RecordDetailRouteParams } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';
import type { GetRecordsOpts } from '../services/api';

const PERIOD_TABS = ['Tümü', 'Bu Ay', 'Bu Hafta', 'Bugün'];
const TYPE_TABS   = ['Tümü', 'Gider', 'Gelir', 'Yatırım'];
const CATEGORY_KEYS = Object.keys(CATEGORY_ICONS).sort((a, b) => a.localeCompare(b, 'tr'));

function periodToIsoRange(periodLabel: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  if (periodLabel === 'Tümü') return {};
  if (periodLabel === 'Bugün') {
    return { dateFrom: today.toISOString(), dateTo: endOfToday.toISOString() };
  }
  if (periodLabel === 'Bu Hafta') {
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    return { dateFrom: weekAgo.toISOString(), dateTo: endOfToday.toISOString() };
  }
  if (periodLabel === 'Bu Ay') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: monthStart.toISOString(), dateTo: endOfToday.toISOString() };
  }
  return {};
}

export default function RecordDetailScreen({
  navigation,
  route,
}: {
  navigation: AppNavigation;
  route: { params?: RecordDetailRouteParams };
}) {
  const { category, type, title, icon, bg, color } = route.params || {};
  const theme = useTheme();

  const [allRecords, setAllRecords]         = useState<FinanceRecord[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activePeriod, setActivePeriod]     = useState('Tümü');
  const [activeType, setActiveType]         = useState('Tümü');
  const [searchText, setSearchText]         = useState('');
  const [debouncedQ, setDebouncedQ]         = useState('');
  const [amountMin, setAmountMin]           = useState('');
  const [amountMax, setAmountMax]           = useState('');
  const [customFrom, setCustomFrom]         = useState('');
  const [customTo, setCustomTo]             = useState('');
  const [advancedOpen, setAdvancedOpen]     = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText]);

  const queryParams = useMemo((): GetRecordsOpts => {
    const params: GetRecordsOpts = {};
    if (type) {
      params.type = type;
    } else if (activeType === 'Gider') params.type = 'expense';
    else if (activeType === 'Gelir') params.type = 'income';
    else if (activeType === 'Yatırım') params.type = 'investment';

    const c0 = parseUserDateInput(customFrom);
    const c1 = parseUserDateInput(customTo);
    if (c0 && c1) {
      params.dateFrom = toIsoDateForApi(c0);
      const end = new Date(c1);
      end.setHours(23, 59, 59, 999);
      params.dateTo = end.toISOString();
    } else {
      const pr = periodToIsoRange(activePeriod);
      if (pr.dateFrom) params.dateFrom = pr.dateFrom;
      if (pr.dateTo) params.dateTo = pr.dateTo;
    }

    if (debouncedQ.trim()) params.q = debouncedQ.trim();
    if (amountMin.trim()) params.amountMin = amountMin.replace(',', '.');
    if (amountMax.trim()) params.amountMax = amountMax.replace(',', '.');

    if (category) params.categories = [category];
    else if (selectedCategories.length > 0) params.categories = selectedCategories;

    return params;
  }, [
    type, activeType, activePeriod, debouncedQ, amountMin, amountMax,
    customFrom, customTo, category, selectedCategories,
  ]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords(queryParams);
      setAllRecords(Array.isArray(data) ? data : []);
    } catch { /* backend unavailable */ }
    finally { setLoading(false); }
  }, [queryParams]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const hasActiveFilters = useMemo(() => (
    debouncedQ.trim().length > 0 ||
    amountMin.trim().length > 0 ||
    amountMax.trim().length > 0 ||
    (customFrom.trim() && customTo.trim()) ||
    (!category && selectedCategories.length > 0) ||
    activePeriod !== 'Tümü' ||
    (!type && activeType !== 'Tümü')
  ), [debouncedQ, amountMin, amountMax, customFrom, customTo, category, selectedCategories, activePeriod, activeType, type]);

  const totalAmount      = allRecords.reduce((s, k) => s + Number(k.amount), 0);
  const transactionCount = allRecords.length;

  const handleDelete = (id: string, itemTitle: string) => {
    Alert.alert('Kaydı Sil', `"${itemTitle}" kaydını silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await deleteRecord(id);
          setAllRecords(prev => prev.filter(k => k._id !== id));
        } catch {
          Alert.alert('Hata', 'Kayıt silinemedi.');
        }
      }},
    ]);
  };

  const clearFilters = () => {
    setSearchText('');
    setDebouncedQ('');
    setAmountMin('');
    setAmountMax('');
    setCustomFrom('');
    setCustomTo('');
    setSelectedCategories([]);
    setActivePeriod('Tümü');
    if (!type) setActiveType('Tümü');
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  };

  const bannerColor      = color || (type === 'income' ? theme.income : type === 'investment' ? theme.investment : theme.expense);
  const bannerBackground = bg    || (type === 'income' ? theme.incomeBg : type === 'investment' ? theme.investmentBg : theme.expenseBg);
  const styles           = makeStyles(theme);

  const renderRecord = ({ item }: { item: FinanceRecord }) => {
    const categoryStyle = getCategoryStyle(item.category);
    const isIncome      = item.type === 'income';
    const isInvestment  = item.type === 'investment';
    const amountColor   = isIncome ? theme.income : isInvestment ? theme.investment : theme.expense;
    const badgeBg       = isIncome ? theme.incomeBg : isInvestment ? theme.investmentBg : theme.expenseBg;
    const badgeColor    = amountColor;
    const typeLabel     = isIncome ? 'Gelir' : isInvestment ? 'Yatırım' : 'Gider';
    const prefix        = isIncome ? '+' : isInvestment ? '' : '-';

    return (
      <View style={[styles.recordItem, theme.shadow]}>
        <View style={[styles.recordIcon, { backgroundColor: categoryStyle.bg }]}>
          <Ionicons name={categoryStyle.icon} size={22} color={categoryStyle.color} />
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle} numberOfLines={1}>{item.title}</Text>
          <View style={styles.recordSubRow}>
            <View style={[styles.typeBadge, { backgroundColor: badgeBg }]}>
              <Text style={[styles.typeBadgeText, { color: badgeColor }]}>{typeLabel}</Text>
            </View>
            <Text style={styles.recordSubText}>
              {item.category} • {formatRecordDateDisplay(item.date)}
            </Text>
          </View>
        </View>
        <View style={styles.recordRight}>
          <Text style={[styles.recordAmount, { color: amountColor }]}>
            {prefix}{formatMoney(item.amount, item.currency)}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('AddExpense', { record: item })}>
              <Ionicons name="pencil-outline" size={15} color={theme.textSub} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(String(item._id), String(item.title))}>
              <Ionicons name="trash-outline" size={15} color={theme.textFaint} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.textSub} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {icon && (
            <View style={[styles.headerIconBox, { backgroundColor: bannerBackground }]}>
              <Ionicons name={icon} size={16} color={bannerColor} />
            </View>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>{title || 'Tüm Kayıtlar'}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <View style={[styles.statsBanner, { backgroundColor: bannerColor }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatMixedTotal(totalAmount, allRecords)}</Text>
            <Text style={styles.statLabel}>Toplam</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{transactionCount}</Text>
            <Text style={styles.statLabel}>İşlem</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {transactionCount > 0
                ? formatMixedTotal(totalAmount / transactionCount, allRecords)
                : formatMoney(0, 'TRY')}
            </Text>
            <Text style={styles.statLabel}>Ortalama</Text>
          </View>
        </View>
        <Text style={styles.statsFootnote}>
          Özetler kayıtların kendi para biriminde toplanır; kur çevrimi yapılmaz.
        </Text>
      </View>

      <FlatList
        data={allRecords}
        keyExtractor={item => String(item._id || item.id)}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={20} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Not veya kategoride ara…"
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={20} color={theme.textFaint} />
                </TouchableOpacity>
              )}
            </View>

            {!category && !type && (
              <View style={styles.typeContainer}>
                {TYPE_TABS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, activeType === t && styles.typeBtnActive]}
                    onPress={() => setActiveType(t)}
                  >
                    <Text style={[styles.typeBtnText, activeType === t && styles.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.periodContainer}>
              {PERIOD_TABS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, activePeriod === p && { backgroundColor: bannerColor }]}
                  onPress={() => { setActivePeriod(p); setCustomFrom(''); setCustomTo(''); }}
                >
                  <Text style={[styles.periodBtnText, activePeriod === p && { color: '#fff', fontWeight: '700' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setAdvancedOpen(o => !o)}
              activeOpacity={0.7}
            >
              <Ionicons name={advancedOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
              <Text style={[styles.advancedToggleText, { color: theme.primary }]}>Gelişmiş filtreler</Text>
            </TouchableOpacity>

            {advancedOpen && (
              <View style={styles.advancedBlock}>
                <Text style={styles.advancedLabel}>Tutar</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={styles.smallInput}
                    value={amountMin}
                    onChangeText={setAmountMin}
                    placeholder="Min"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.amountDash}>—</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={amountMax}
                    onChangeText={setAmountMax}
                    placeholder="Max"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={[styles.advancedLabel, { marginTop: 12 }]}>Özel tarih (GG.AA.YYYY)</Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={styles.smallInput}
                    value={customFrom}
                    onChangeText={setCustomFrom}
                    placeholder="Başlangıç"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Text style={styles.amountDash}>—</Text>
                  <TextInput
                    style={styles.smallInput}
                    value={customTo}
                    onChangeText={setCustomTo}
                    placeholder="Bitiş"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                {!category && (
                  <>
                    <Text style={[styles.advancedLabel, { marginTop: 12 }]}>Kategoriler</Text>
                    <View style={styles.chipWrap}>
                      {CATEGORY_KEYS.map(key => {
                        const on = selectedCategories.includes(key);
                        return (
                          <TouchableOpacity
                            key={key}
                            style={[styles.chip, { backgroundColor: on ? bannerColor : theme.surfaceAlt }]}
                            onPress={() => toggleCategory(key)}
                          >
                            <Text style={[styles.chipText, { color: on ? '#fff' : theme.textSub }]} numberOfLines={1}>
                              {key}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>
            )}

            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                <Text style={[styles.clearBtnText, { color: theme.primary }]}>Filtreleri temizle</Text>
              </TouchableOpacity>
            )}

            {loading && <ActivityIndicator color={bannerColor} style={{ marginVertical: 24 }} />}
            {!loading && allRecords.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="file-tray-outline" size={72} color={theme.surfaceAlt2} />
                <Text style={styles.emptyText}>
                  {hasActiveFilters ? 'Eşleşen kayıt yok' : 'Bu dönemde kayıt bulunamadı'}
                </Text>
                {hasActiveFilters && (
                  <Text style={styles.emptyHint}>Aralığı veya filtreyi genişletmeyi dene</Text>
                )}
              </View>
            )}
          </>
        }
      />
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea:     { flex: 1, backgroundColor: theme.bg },
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.bg, borderBottomWidth: 1, borderBottomColor: theme.border },
    backBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    headerIconBox:{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    headerTitle:  { fontSize: 17, fontWeight: 'bold', color: theme.text },

    statsBanner:   { paddingVertical: 16, paddingHorizontal: 16 },
    statsRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    statsFootnote: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginTop: 12, textAlign: 'center', lineHeight: 14 },
    statItem:      { alignItems: 'center', flex: 1 },
    statValue:   { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    statLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.3)' },

    searchRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 8, gap: 8 },
    searchIcon:   {},
    searchInput:  { flex: 1, fontSize: 15, color: theme.text, padding: 0 },

    typeContainer:     { flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: 14, padding: 4, marginHorizontal: 16, marginBottom: 8 },
    typeBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    typeBtnActive:     { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    typeBtnText:       { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    typeBtnTextActive: { color: theme.text, fontWeight: '700' },

    periodContainer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 4, marginBottom: 8 },
    periodBtn:       { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: theme.surfaceAlt },
    periodBtnText:   { fontSize: 12, fontWeight: '600', color: theme.textSub },

    advancedToggle:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8 },
    advancedToggleText: { fontSize: 13, fontWeight: '600' },
    advancedBlock:      { paddingHorizontal: 16, paddingBottom: 8 },
    advancedLabel:      { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5, marginBottom: 8 },
    amountRow:          { flexDirection: 'row', alignItems: 'center', gap: 8 },
    smallInput:         { flex: 1, backgroundColor: theme.surfaceAlt, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: theme.text },
    amountDash:         { color: theme.textMuted, fontWeight: '600' },
    chipWrap:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
    chip:               { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, maxWidth: 160 },
    chipText:           { fontSize: 12, fontWeight: '600' },

    clearBtn:     { alignSelf: 'center', paddingVertical: 8, marginBottom: 4 },
    clearBtnText: { fontSize: 14, fontWeight: '600' },

    list:        { paddingHorizontal: 16, paddingBottom: 32 },
    recordItem:  { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 10 },
    recordIcon:  { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    recordInfo:  { flex: 1, gap: 4 },
    recordTitle: { fontSize: 14, fontWeight: 'bold', color: theme.text },
    recordSubRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    typeBadge:   { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    typeBadgeText:{ fontSize: 10, fontWeight: '700' },
    recordSubText:{ fontSize: 11, color: theme.textMuted },
    recordRight: { alignItems: 'flex-end', gap: 6 },
    recordAmount:{ fontSize: 15, fontWeight: 'bold' },
    actionRow:   { flexDirection: 'row', gap: 4 },
    editBtn:     { padding: 4 },
    deleteBtn:   { padding: 4 },

    emptyState:  { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
    emptyText:   { fontSize: 16, fontWeight: '600', color: theme.textMuted, marginTop: 16 },
    emptyHint:   { fontSize: 13, color: theme.textFaint, marginTop: 8, textAlign: 'center' },
  });
}
