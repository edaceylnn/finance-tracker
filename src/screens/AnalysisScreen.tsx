import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords } from '../services/api';
import { getCategoryStyle } from '../constants/categories';
import { parseRecordDate, startOfLocalDay } from '../utils/recordDate';
import { useTheme } from '../context/ThemeContext';
import { formatMoney, formatMixedTotal } from '../utils/money';
import type { AppNavigation } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';

const PERIOD_TABS  = ['Gün', 'Hafta', 'Ay'];
const TYPE_TABS    = ['Gider', 'Gelir'];
const MONTH_NAMES  = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function AnalysisScreen({ navigation }: { navigation: AppNavigation }) {
  const theme = useTheme();
  const [activePeriod, setActivePeriod] = useState('Ay');
  const [activeType, setActiveType]     = useState('Gider');
  const [records, setRecords]           = useState<FinanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);

  const recordType = activeType === 'Gelir' ? 'income' : 'expense';
  const color      = activeType === 'Gelir' ? theme.income : theme.expense;
  const cardBg     = activeType === 'Gelir' ? theme.incomeBg : theme.expenseBg;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* backend unavailable */ }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo    = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = records.filter(k => {
    if (k.type !== recordType) return false;
    const t = startOfLocalDay(parseRecordDate(k.date));
    if (activePeriod === 'Gün')   return t >= today;
    if (activePeriod === 'Hafta') return t >= weekAgo;
    if (activePeriod === 'Ay')    return t >= monthStart;
    return true;
  });

  const totalAmount = filtered.reduce((s, k) => s + k.amount, 0);

  const categoryMap: Record<string, { amount: number; transactionCount: number }> = {};
  filtered.forEach(k => {
    const cat = k.category ?? '';
    if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, transactionCount: 0 };
    categoryMap[cat].amount          += k.amount;
    categoryMap[cat].transactionCount += 1;
  });

  const categories = Object.entries(categoryMap)
    .map(([cat, { amount, transactionCount }]) => {
      const style = getCategoryStyle(cat);
      return {
        key: cat, label: cat, dbCategory: cat, amount, transactionCount,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        icon: style.icon, bg: style.bg, color: style.color,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const maxAmount = categories.length > 0 ? categories[0].amount : 1;

  const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
    const offset         = 3 - i;
    const monthStartDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthEndDate   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const monthRecords   = records.filter(k => {
      const t = parseRecordDate(k.date);
      return t >= monthStartDate && t < monthEndDate && k.type === recordType;
    });
    return {
      label:  MONTH_NAMES[monthStartDate.getMonth()],
      amount: monthRecords.reduce((s, k) => s + k.amount, 0),
      active: offset === 0,
    };
  });

  const maxTrend = Math.max(...monthlyTrend.map(b => b.amount), 1);
  const styles   = makeStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Harcama Analizi</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Tip Seçici */}
        <View style={styles.typeContainer}>
          {TYPE_TABS.map(tab => {
            const tabColor = tab === 'Gelir' ? theme.income : theme.expense;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.typeBtn, activeType === tab && { backgroundColor: tabColor }]}
                onPress={() => setActiveType(tab)}
              >
                <Text style={[styles.typeBtnText, activeType === tab && styles.typeBtnTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dönem Seçici */}
        <View style={styles.periodContainer}>
          {PERIOD_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.periodBtn, activePeriod === tab && styles.periodBtnActive]}
              onPress={() => setActivePeriod(tab)}
            >
              <Text style={[styles.periodBtnText, activePeriod === tab && styles.periodBtnTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={color} style={{ marginVertical: 40 }} />
        ) : categories.length === 0 ? (
          <>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Toplam {activeType}</Text>
              <Text style={styles.totalAmount}>{formatMoney(0, 'TRY')}</Text>
              <Text style={styles.totalSub}>
                {activePeriod === 'Ay' ? 'bu ay' : activePeriod === 'Hafta' ? 'bu hafta' : 'bugün'}
              </Text>
              <Text style={styles.totalFootnote}>
                Özetler kayıtların kendi para biriminde toplanır; kur çevrimi yapılmaz.
              </Text>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color={theme.surfaceAlt2} />
              <Text style={styles.emptyText}>Bu dönemde kayıt bulunamadı</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Toplam {activeType}</Text>
              <Text style={[styles.totalAmount, { color: theme.text }]}>
                {formatMixedTotal(totalAmount, filtered)}
              </Text>
              <Text style={styles.totalSub}>
                {activePeriod === 'Ay' ? 'bu ay' : activePeriod === 'Hafta' ? 'bu hafta' : 'bugün'}
              </Text>
              <Text style={styles.totalFootnote}>
                Özetler kayıtların kendi para biriminde toplanır; kur çevrimi yapılmaz.
              </Text>
            </View>

            {/* Bar chart */}
            <Text style={styles.sectionTitle}>Kategoriye Göre</Text>
            <View style={styles.barChart}>
              {categories.slice(0, 5).map(cat => (
                <View key={cat.key} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${Math.max((cat.amount / maxAmount) * 100, 5)}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>{cat.label.toUpperCase().slice(0, 6)}</Text>
                </View>
              ))}
            </View>

            {/* Kategori listesi */}
            <View style={styles.categoryList}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catItem, theme.shadow]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RecordDetail', {
                    category: cat.dbCategory, type: recordType, title: cat.label,
                    icon: cat.icon, bg: cat.bg, color: cat.color,
                  })}
                >
                  <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color} />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catLabel}>{cat.label}</Text>
                    <Text style={styles.catTx}>{cat.transactionCount} İşlem</Text>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catAmount}>
                      {formatMixedTotal(cat.amount, filtered.filter(k => k.category === cat.dbCategory))}
                    </Text>
                    <Text style={[styles.catPercentage, { color }]}>%{cat.percentage}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textFaint} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Aylık trend */}
            <View style={[styles.trendCard, { borderColor: color, backgroundColor: cardBg }]}>
              <View style={styles.trendHeader}>
                <Ionicons name="trending-up" size={18} color={color} />
                <Text style={styles.trendTitle}>Aylık Trend</Text>
              </View>
              <View style={styles.monthBars}>
                {monthlyTrend.map(b => {
                  const barHeight = Math.max((b.amount / maxTrend) * 80, b.amount > 0 ? 6 : 0);
                  return (
                    <View key={b.label} style={styles.monthBarCol}>
                      <View style={[styles.monthBarFill, { height: barHeight, backgroundColor: b.active ? color : theme.surfaceAlt2 }]} />
                      <Text style={[styles.monthLabel, b.active && { color, fontWeight: '700' }]}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    safeArea:    { flex: 1, backgroundColor: theme.bg },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: theme.bg, borderBottomWidth: 1, borderBottomColor: theme.border },
    headerBtn:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    content:     { paddingHorizontal: 16, paddingBottom: 32 },

    typeContainer:     { flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: 14, padding: 4, marginTop: 16, marginBottom: 8 },
    typeBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    typeBtnText:       { fontSize: 14, fontWeight: '600', color: theme.textMuted },
    typeBtnTextActive: { color: '#fff', fontWeight: '700' },

    periodContainer:     { flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 16 },
    periodBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    periodBtnActive:     { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    periodBtnText:       { fontSize: 14, fontWeight: '600', color: theme.textMuted },
    periodBtnTextActive: { color: theme.text },

    totalSection: { marginBottom: 24 },
    totalLabel:   { fontSize: 13, color: theme.textMuted, fontWeight: '500', marginBottom: 4 },
    totalAmount:   { fontSize: 32, fontWeight: 'bold', color: theme.text, marginBottom: 4 },
    totalSub:      { fontSize: 12, color: theme.textMuted },
    totalFootnote: { fontSize: 10, fontWeight: '500', color: theme.textMuted, marginTop: 10, lineHeight: 14 },

    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: theme.text, marginBottom: 16 },

    barChart: { flexDirection: 'row', height: 160, alignItems: 'flex-end', gap: 8, marginBottom: 24, paddingHorizontal: 8 },
    barCol:   { flex: 1, alignItems: 'center', gap: 8, height: '100%' },
    barTrack: { flex: 1, width: '100%', backgroundColor: theme.surfaceAlt, borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
    barFill:  { width: '100%', borderRadius: 6 },
    barLabel: { fontSize: 9, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 },

    categoryList: { gap: 12, marginBottom: 24 },
    catItem:      { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16 },
    catIcon:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    catInfo:      { flex: 1 },
    catLabel:     { fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 3 },
    catTx:        { fontSize: 12, color: theme.textMuted },
    catRight:     { alignItems: 'flex-end' },
    catAmount:    { fontSize: 14, fontWeight: 'bold', color: theme.text },
    catPercentage:{ fontSize: 12, fontWeight: '600', marginTop: 2 },

    trendCard:   { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 8 },
    trendHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    trendTitle:  { fontSize: 14, fontWeight: 'bold', color: theme.text },
    monthBars:   { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 8 },
    monthBarCol: { flex: 1, alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
    monthBarFill:{ width: '100%', borderRadius: 6 },
    monthLabel:  { fontSize: 10, fontWeight: '500', color: theme.textMuted },

    emptyState:   { alignItems: 'center', paddingVertical: 40 },
    emptyText:    { fontSize: 15, fontWeight: '600', color: theme.textMuted, marginTop: 14 },
  });
}
