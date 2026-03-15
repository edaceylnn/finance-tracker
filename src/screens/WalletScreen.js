import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords } from '../services/api';
import { getCategoryStyle } from '../constants/categories';

const PERIOD_TABS = ['Gün', 'Hafta', 'Ay', 'Tümü'];
const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
  }
  return new Date(dateStr);
}

export default function WalletScreen({ navigation }) {
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activePeriod, setActivePeriod] = useState('Ay');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      // backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // All-time investments (for portfolio card)
  const allInvestments = records.filter(k => k.type === 'investment');
  const totalPortfolio = allInvestments.reduce((s, k) => s + k.amount, 0);

  // Period filter
  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo    = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filteredInvestments = allInvestments.filter(k => {
    if (activePeriod === 'Tümü') return true;
    const t = parseDate(k.date);
    if (activePeriod === 'Gün')   return t >= today;
    if (activePeriod === 'Hafta') return t >= weekAgo;
    if (activePeriod === 'Ay')    return t >= monthStart;
    return true;
  });

  const periodTotal = filteredInvestments.reduce((s, k) => s + k.amount, 0);

  // Group by category (period-filtered)
  const categoryMap = {};
  filteredInvestments.forEach(k => {
    if (!categoryMap[k.category]) categoryMap[k.category] = { amount: 0, transactionCount: 0 };
    categoryMap[k.category].amount           += k.amount;
    categoryMap[k.category].transactionCount += 1;
  });

  const categories = Object.entries(categoryMap)
    .map(([cat, { amount, transactionCount }]) => {
      const style = getCategoryStyle(cat);
      return {
        category: cat, amount, transactionCount,
        percentage: periodTotal > 0 ? (amount / periodTotal) * 100 : 0,
        icon: style.icon, bg: style.bg, color: style.color,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Monthly trend (last 4 months, all-time)
  const monthlyTrend = Array.from({ length: 4 }, (_, i) => {
    const offset         = 3 - i;
    const monthStartDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const monthEndDate   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const amount = allInvestments
      .filter(k => { const t = parseDate(k.date); return t >= monthStartDate && t < monthEndDate; })
      .reduce((s, k) => s + k.amount, 0);
    return { label: MONTH_NAMES[monthStartDate.getMonth()], amount, active: offset === 0 };
  });
  const maxTrend = Math.max(...monthlyTrend.map(b => b.amount), 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8F8" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Yatırım Analizi</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Total portfolio card (all-time) */}
        <View style={styles.portfolioCard}>
          <View style={styles.portfolioTop}>
            <View>
              <Text style={styles.portfolioLabel}>Toplam Portföy Değeri</Text>
              <Text style={styles.portfolioAmount}>
                ₺{totalPortfolio.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
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
                ₺{allInvestments
                    .filter(k => parseDate(k.date) >= monthStart)
                    .reduce((s, k) => s + k.amount, 0)
                    .toLocaleString('tr-TR', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* Period selector */}
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
          <ActivityIndicator color="#11c4d4" style={{ marginVertical: 40 }} />
        ) : categories.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={64} color="#E2E8F0" />
            <Text style={styles.emptyText}>Bu dönemde yatırım kaydı yok</Text>
            <Text style={styles.emptySubText}>+ butonu ile yatırım ekleyebilirsin</Text>
          </View>
        ) : (
          <>
            {/* Period total */}
            <View style={styles.periodSummary}>
              <Text style={styles.periodSummaryLabel}>
                {activePeriod === 'Tümü' ? 'Tüm Zamanlar' :
                 activePeriod === 'Ay'   ? 'Bu Ay' :
                 activePeriod === 'Hafta'? 'Bu Hafta' : 'Bugün'} Yatırım
              </Text>
              <Text style={styles.periodSummaryAmount}>
                ₺{periodTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Distribution */}
            <Text style={styles.sectionTitle}>Portföy Dağılımı</Text>
            <View style={styles.distributionCard}>
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

            {/* Category cards */}
            <Text style={styles.sectionTitle}>Yatırım Kalemleri</Text>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.category}
                style={styles.catCard}
                activeOpacity={0.75}
                onPress={() => navigation.navigate('RecordDetail', {
                  category: cat.category,
                  type:     'investment',
                  title:    cat.category,
                  icon:     cat.icon,
                  bg:       cat.bg,
                  color:    cat.color,
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
                    ₺{cat.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.catPercentage, { color: cat.color }]}>%{Math.round(cat.percentage)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            ))}

            {/* Monthly trend */}
            <Text style={styles.sectionTitle}>Aylık Trend</Text>
            <View style={styles.trendCard}>
              <View style={styles.monthBars}>
                {monthlyTrend.map(b => {
                  const barHeight = Math.max((b.amount / maxTrend) * 80, b.amount > 0 ? 6 : 0);
                  return (
                    <View key={b.label} style={styles.monthBarCol}>
                      <Text style={[styles.monthAmount, b.active && { color: '#11c4d4' }]}>
                        {b.amount > 0
                          ? `₺${Math.round(b.amount / 1000) > 0
                              ? Math.round(b.amount / 1000) + 'K'
                              : Math.round(b.amount)}`
                          : ''}
                      </Text>
                      <View style={[styles.monthBarFill, { height: barHeight, backgroundColor: b.active ? '#11c4d4' : '#CBD5E1' }]} />
                      <Text style={[styles.monthLabel, b.active && { color: '#11c4d4', fontWeight: '700' }]}>
                        {b.label}
                      </Text>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F6F8F8' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#F6F8F8',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },

  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 16 },

  portfolioCard: {
    backgroundColor: '#11c4d4',
    borderRadius: 22,
    padding: 22,
    marginBottom: 20,
    shadowColor: '#11c4d4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  portfolioTop:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  portfolioLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 6 },
  portfolioAmount:     { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  portfolioIconBox:    { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  portfolioBottomRow:  { flexDirection: 'row', alignItems: 'center' },
  portfolioSmallCard:  { flex: 1, alignItems: 'center' },
  portfolioSmallLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', marginBottom: 4 },
  portfolioSmallValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  portfolioDivider:    { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.25)' },

  periodContainer:     { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4, marginBottom: 20 },
  periodBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive:     { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText:       { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  periodBtnTextActive: { color: '#0F172A' },

  periodSummary:       { marginBottom: 20 },
  periodSummaryLabel:  { fontSize: 12, color: '#94A3B8', fontWeight: '500', marginBottom: 4 },
  periodSummaryAmount: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 12 },

  distributionCard:       { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 24, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  distributionRow:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  distributionIcon:       { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  distributionCenter:     { flex: 1 },
  distributionTopRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  distributionLabel:      { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  distributionPercentage: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  distributionBarBg:      { height: 6, backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden' },
  distributionBarFill:    { height: '100%', borderRadius: 4 },

  catCard:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  catIcon:        { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  catInfo:        { flex: 1 },
  catName:        { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 3 },
  catTransaction: { fontSize: 12, color: '#94A3B8' },
  catRight:       { alignItems: 'flex-end' },
  catAmount:      { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 3 },
  catPercentage:  { fontSize: 12, fontWeight: '600' },

  trendCard:    { backgroundColor: '#EFF9FA', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#BAF3F9', marginBottom: 8 },
  monthBars:    { flexDirection: 'row', height: 100, alignItems: 'flex-end', gap: 8 },
  monthBarCol:  { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  monthAmount:  { fontSize: 9, fontWeight: '600', color: '#94A3B8', marginBottom: 2 },
  monthBarFill: { width: '100%', borderRadius: 6 },
  monthLabel:   { fontSize: 10, fontWeight: '500', color: '#94A3B8', marginTop: 4 },

  emptyState:   { alignItems: 'center', paddingVertical: 60 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 16, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});
