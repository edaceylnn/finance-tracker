import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, getMetalSpot } from '../services/api';
import { getCategoryStyle } from '../constants/categories';
import { parseRecordDate, startOfLocalDay } from '../utils/recordDate';
import { useTheme } from '../context/ThemeContext';
import { formatMoney, formatMixedTotal } from '../utils/money';
import type { AppNavigation } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';

const PERIOD_TABS = ['Gün', 'Hafta', 'Ay', 'Tümü'];
type MetalSpot = Awaited<ReturnType<typeof getMetalSpot>>;
const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function WalletScreen({ navigation }: { navigation: AppNavigation }) {
  const theme = useTheme();
  const [records, setRecords]           = useState<FinanceRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [metals, setMetals]             = useState<MetalSpot | null>(null);
  const [metalsLoading, setMetalsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState('Ay');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch { /* backend unavailable */ }
    finally { setLoading(false); }
  }, []);

  const fetchMetals = useCallback(async () => {
    setMetalsLoading(true);
    try {
      const data = await getMetalSpot();
      setMetals(data);
    } catch {
      setMetals(null);
    } finally {
      setMetalsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    fetchData();
    fetchMetals();
  }, [fetchData, fetchMetals]));

  const allInvestments = records.filter(k => k.type === 'investment');
  const totalPortfolio = allInvestments.reduce((s, k) => s + k.amount, 0);

  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo    = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredInvestments = allInvestments.filter(k => {
    if (activePeriod === 'Tümü') return true;
    const t = startOfLocalDay(parseRecordDate(k.date));
    if (activePeriod === 'Gün')   return t >= today;
    if (activePeriod === 'Hafta') return t >= weekAgo;
    if (activePeriod === 'Ay')    return t >= monthStart;
    return true;
  });

  const periodTotal  = filteredInvestments.reduce((s, k) => s + k.amount, 0);
  const categoryMap: Record<string, { amount: number; transactionCount: number }> = {};
  filteredInvestments.forEach(k => {
    const cat = k.category ?? '';
    if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, transactionCount: 0 };
    categoryMap[cat].amount           += k.amount;
    categoryMap[cat].transactionCount += 1;
  });

  const categories = Object.entries(categoryMap)
    .map(([cat, { amount, transactionCount }]) => {
      const style = getCategoryStyle(cat);
      return { category: cat, amount, transactionCount,
        percentage: periodTotal > 0 ? (amount / periodTotal) * 100 : 0,
        icon: style.icon, bg: style.bg, color: style.color };
    })
    .sort((a, b) => b.amount - a.amount);

  const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
    const offset         = 3 - i;
    const monthStartDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthEndDate   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const recordsInMonth = allInvestments.filter(k => {
      const t = parseRecordDate(k.date);
      return t >= monthStartDate && t < monthEndDate;
    });
    const amount = recordsInMonth.reduce((s, k) => s + k.amount, 0);
    return {
      label: MONTH_NAMES[monthStartDate.getMonth()],
      amount,
      active: offset === 0,
      records: recordsInMonth,
    };
  });
  const maxTrend = Math.max(...monthlyTrend.map(b => b.amount), 1);
  const monthInvestmentsThisMonth = allInvestments.filter(k => parseRecordDate(k.date) >= monthStart);
  const monthInvestmentsSum       = monthInvestmentsThisMonth.reduce((s, k) => s + k.amount, 0);
  const styles   = makeStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yatırım Analizi</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <View style={styles.portfolioCard}>
          <View style={styles.portfolioTop}>
            <View>
              <Text style={styles.portfolioLabel}>Toplam Portföy Değeri</Text>
              <Text style={styles.portfolioAmount}>
                {formatMixedTotal(totalPortfolio, allInvestments)}
              </Text>
              <Text style={styles.portfolioFootnote}>
                Özetler kayıtların kendi para biriminde toplanır; kur çevrimi yapılmaz.
              </Text>
            </View>
            <View style={styles.portfolioIconBox}>
              <Ionicons name="trending-up" size={28} color="#fff" />
            </View>
          </View>
          <View style={styles.portfolioBottomRow}>
            <View style={styles.portfolioSmallCard}>
              <Text style={styles.portfolioSmallLabel}>Toplam İşlem</Text>
              <Text style={styles.portfolioSmallValue}>{allInvestments.length}</Text>
            </View>
            <View style={styles.portfolioDivider} />
            <View style={styles.portfolioSmallCard}>
              <Text style={styles.portfolioSmallLabel}>Kategori</Text>
              <Text style={styles.portfolioSmallValue}>{Object.keys(categoryMap).length || '—'}</Text>
            </View>
            <View style={styles.portfolioDivider} />
            <View style={styles.portfolioSmallCard}>
              <Text style={styles.portfolioSmallLabel}>Bu Ay</Text>
              <Text style={styles.portfolioSmallValue}>
                {formatMixedTotal(monthInvestmentsSum, monthInvestmentsThisMonth)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Altın ve gümüş (referans)</Text>
        <Text style={styles.metalsDisclaimer}>
          Ücretsiz veri gecikmelidir; yatırım tavsiyesi değildir. Kaynak: MetalpriceAPI.
        </Text>
        {metalsLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginBottom: 16 }} />
        ) : metals?.goldTryPerGram != null || metals?.silverTryPerGram != null ? (
          <View style={styles.metalsRow}>
            {metals.goldTryPerGram != null && (
              <View style={[styles.metalCard, theme.shadow]}>
                <View style={[styles.metalIconBox, { backgroundColor: '#F9A82522' }]}>
                  <Ionicons name="star" size={20} color="#F9A825" />
                </View>
                <Text style={styles.metalLabel}>Altın / gr</Text>
                <Text style={styles.metalValue}>
                  {formatMoney(metals.goldTryPerGram, 'TRY')}
                </Text>
              </View>
            )}
            {metals.silverTryPerGram != null && (
              <View style={[styles.metalCard, theme.shadow]}>
                <View style={[styles.metalIconBox, { backgroundColor: '#90A4AE22' }]}>
                  <Ionicons name="disc-outline" size={20} color="#607D8B" />
                </View>
                <Text style={styles.metalLabel}>Gümüş / gr</Text>
                <Text style={styles.metalValue}>
                  {formatMoney(metals.silverTryPerGram, 'TRY')}
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.metalsError}>Referans fiyatlar yüklenemedi</Text>
        )}
        {metals?.fetchedAt && (
          <Text style={styles.metalsUpdated}>
            Güncellendi: {new Date(metals.fetchedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
            {metals.cached ? ' (önbellek)' : ''}{metals.stale ? ' (önbellek, bağlantı hatası)' : ''}
          </Text>
        )}

        <View style={styles.periodContainer}>
          {PERIOD_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.periodBtn, activePeriod === tab && styles.periodBtnActive]}
              onPress={() => setActivePeriod(tab)}
            >
              <Text style={[styles.periodBtnText, activePeriod === tab && styles.periodBtnTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginVertical: 40 }} />
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={64} color={theme.surfaceAlt2} />
            <Text style={styles.emptyText}>Bu dönemde yatırım kaydı yok</Text>
          </View>
        ) : (
          <>
            <View style={styles.periodSummary}>
              <Text style={styles.periodSummaryLabel}>
                {activePeriod === 'Tümü' ? 'Tüm Zamanlar' :
                 activePeriod === 'Ay'   ? 'Bu Ay' :
                 activePeriod === 'Hafta'? 'Bu Hafta' : 'Bugün'} Yatırım
              </Text>
              <Text style={styles.periodSummaryAmount}>
                {formatMixedTotal(periodTotal, filteredInvestments)}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Portföy Dağılımı</Text>
            <View style={[styles.distributionCard, theme.shadow]}>
              {categories.map(cat => (
                <View key={cat.category} style={styles.distributionRow}>
                  <View style={[styles.distributionIcon, { backgroundColor: cat.bg }]}>
                    <Ionicons name={cat.icon} size={16} color={cat.color} />
                  </View>
                  <View style={styles.distributionCenter}>
                    <View style={styles.distributionTopRow}>
                      <Text style={styles.distributionLabel}>{cat.category}</Text>
                      <Text style={styles.distributionPercentage}>%{Math.round(cat.percentage)}</Text>
                    </View>
                    <View style={styles.distributionBarBg}>
                      <View style={[styles.distributionBarFill, { width: `${cat.percentage}%`, backgroundColor: cat.color }]} />
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Yatırım Kalemleri</Text>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.category}
                style={[styles.catCard, theme.shadow]}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('RecordDetail', {
                  category: cat.category, type: 'investment', title: cat.category,
                  icon: cat.icon, bg: cat.bg, color: cat.color,
                })}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon} size={24} color={cat.color} />
                </View>
                <View style={styles.catInfo}>
                  <Text style={styles.catName}>{cat.category}</Text>
                  <Text style={styles.catTransaction}>{cat.transactionCount} işlem</Text>
                </View>
                <View style={styles.catRight}>
                  <Text style={styles.catAmount}>
                    {formatMixedTotal(cat.amount, filteredInvestments.filter(k => k.category === cat.category))}
                  </Text>
                  <Text style={[styles.catPercentage, { color: cat.color }]}>%{Math.round(cat.percentage)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textFaint} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Aylık Trend</Text>
            <View style={styles.trendCard}>
              <View style={styles.monthBars}>
                {monthlyTrend.map(b => {
                  const barHeight = Math.max((b.amount / maxTrend) * 80, b.amount > 0 ? 6 : 0);
                  return (
                    <View key={b.label} style={styles.monthBarCol}>
                      <Text style={[styles.monthAmount, b.active && { color: theme.primary }]}>
                        {b.amount > 0 ? formatMixedTotal(b.amount, b.records) : ''}
                      </Text>
                      <View style={[styles.monthBarFill, { height: barHeight, backgroundColor: b.active ? theme.primary : theme.surfaceAlt2 }]} />
                      <Text style={[styles.monthLabel, b.active && { color: theme.primary, fontWeight: '700' }]}>{b.label}</Text>
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
    header:      { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bg },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text },
    content:     { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },

    portfolioCard:        { backgroundColor: theme.primary, borderRadius: 22, padding: 22, marginBottom: 20, shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    portfolioTop:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    portfolioLabel:       { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 6 },
    portfolioAmount:      { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    portfolioFootnote:    { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '500', marginTop: 8, lineHeight: 14, maxWidth: 260 },
    portfolioIconBox:     { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    portfolioBottomRow:   { flexDirection: 'row', alignItems: 'center' },
    portfolioSmallCard:   { flex: 1, alignItems: 'center' },
    portfolioSmallLabel:  { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', marginBottom: 4 },
    portfolioSmallValue:  { color: '#fff', fontSize: 14, fontWeight: 'bold' },
    portfolioDivider:     { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

    metalsDisclaimer: { fontSize: 11, color: theme.textMuted, marginBottom: 10, lineHeight: 15 },
    metalsRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    metalCard:        { flex: 1, minWidth: '45%', backgroundColor: theme.surface, borderRadius: 16, padding: 14, alignItems: 'center', gap: 6 },
    metalIconBox:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    metalLabel:       { fontSize: 11, fontWeight: '600', color: theme.textMuted },
    metalValue:       { fontSize: 16, fontWeight: '800', color: theme.text },
    metalsError:      { fontSize: 13, color: theme.textFaint, marginBottom: 12 },
    metalsUpdated:    { fontSize: 10, color: theme.textFaint, marginBottom: 16 },

    periodContainer:     { flexDirection: 'row', backgroundColor: theme.surfaceAlt, borderRadius: 14, padding: 4, marginBottom: 20 },
    periodBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    periodBtnActive:     { backgroundColor: theme.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    periodBtnText:       { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    periodBtnTextActive: { color: theme.text },

    periodSummary:       { marginBottom: 20 },
    periodSummaryLabel:  { fontSize: 12, color: theme.textMuted, fontWeight: '500', marginBottom: 4 },
    periodSummaryAmount: { fontSize: 26, fontWeight: 'bold', color: theme.text },

    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: theme.text, marginBottom: 12 },

    distributionCard:       { backgroundColor: theme.surface, borderRadius: 18, padding: 16, marginBottom: 24, gap: 14 },
    distributionRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
    distributionIcon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    distributionCenter:     { flex: 1 },
    distributionTopRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    distributionLabel:      { fontSize: 13, fontWeight: '600', color: theme.text },
    distributionPercentage: { fontSize: 12, fontWeight: '700', color: theme.textSub },
    distributionBarBg:      { height: 6, backgroundColor: theme.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
    distributionBarFill:    { height: '100%', borderRadius: 4 },

    catCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 10 },
    catIcon:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    catInfo:        { flex: 1 },
    catName:        { fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 3 },
    catTransaction: { fontSize: 12, color: theme.textMuted },
    catRight:       { alignItems: 'flex-end' },
    catAmount:      { fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 3 },
    catPercentage:  { fontSize: 12, fontWeight: '600' },

    trendCard:    { backgroundColor: theme.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 8 },
    monthBars:    { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 8 },
    monthBarCol:  { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
    monthAmount:  { fontSize: 9, fontWeight: '600', color: theme.textMuted, marginBottom: 2 },
    monthBarFill: { width: '100%', borderRadius: 6 },
    monthLabel:   { fontSize: 10, fontWeight: '500', color: theme.textMuted, marginTop: 4 },

    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText:  { fontSize: 15, fontWeight: '600', color: theme.textMuted, marginTop: 16 },
  });
}
