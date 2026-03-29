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
import { parseRecordDate, startOfLocalDay } from '../utils/recordDate';

const PERIOD_TABS = ['Gün', 'Hafta', 'Ay'];
const MONTH_NAMES = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export default function AnalysisScreen({ navigation }) {
  const [activePeriod, setActivePeriod] = useState('Ay');
  const [records, setRecords]           = useState([]);
  const [loading, setLoading]           = useState(true);

  const color = '#EF4444';

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

  const now        = new Date();
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo    = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const filtered = records.filter(k => {
    if (k.type !== 'expense') return false;
    const t = startOfLocalDay(parseRecordDate(k.date));
    if (activePeriod === 'Gün')   return t >= today;
    if (activePeriod === 'Hafta') return t >= weekAgo;
    if (activePeriod === 'Ay')    return t >= monthStart;
    return true;
  });

  const totalAmount = filtered.reduce((s, k) => s + k.amount, 0);

  const categoryMap = {};
  filtered.forEach(k => {
    if (!categoryMap[k.category]) categoryMap[k.category] = { amount: 0, transactionCount: 0 };
    categoryMap[k.category].amount         += k.amount;
    categoryMap[k.category].transactionCount += 1;
  });

  const categories = Object.entries(categoryMap)
    .map(([cat, { amount, transactionCount }]) => {
      const style = getCategoryStyle(cat);
      return {
        key:              cat,
        label:            cat,
        dbCategory:       cat,
        amount,
        transactionCount,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0,
        icon:  style.icon,
        bg:    style.bg,
        color: style.color,
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
      return t >= monthStartDate && t < monthEndDate;
    });
    return {
      label:      MONTH_NAMES[monthStartDate.getMonth()],
      expense:    monthRecords.filter(k => k.type === 'expense').reduce((s, k) => s + k.amount, 0),
      investment: monthRecords.filter(k => k.type === 'investment').reduce((s, k) => s + k.amount, 0),
      active:     offset === 0,
    };
  });

  const maxTrend = Math.max(...monthlyTrend.map(b => b.expense), 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8F8" />

      <View style={styles.header}>
        <View style={styles.headerBtn} />
        <Text style={styles.headerTitle}>Gider Analizi</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

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
          <ActivityIndicator color={color} style={{ marginVertical: 40 }} />
        ) : categories.length === 0 ? (
          <>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Toplam Gider</Text>
              <Text style={styles.totalAmount}>₺0,00</Text>
              <Text style={styles.totalSub}>
                {activePeriod === 'Ay' ? 'bu ay' : activePeriod === 'Hafta' ? 'bu hafta' : 'bugün'}
              </Text>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color="#E2E8F0" />
              <Text style={styles.emptyText}>Bu dönemde kayıt bulunamadı</Text>
              <Text style={styles.emptySubText}>+ butonuna basarak kayıt ekleyin</Text>
            </View>
          </>
        ) : (
          <>
            {/* Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Toplam Gider</Text>
              <Text style={[styles.totalAmount, { color: '#0F172A' }]}>
                ₺{totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
              <Text style={styles.totalSub}>
                {activePeriod === 'Ay' ? 'bu ay' : activePeriod === 'Hafta' ? 'bu hafta' : 'bugün'}
              </Text>
            </View>

            {/* Bar chart */}
            <Text style={styles.sectionTitle}>Kategoriye Göre Harcama</Text>
            <View style={styles.barChart}>
              {categories.slice(0, 5).map(cat => (
                <View key={cat.key} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[
                      styles.barFill,
                      { height: `${Math.max((cat.amount / maxAmount) * 100, 5)}%`, backgroundColor: color },
                    ]} />
                  </View>
                  <Text style={styles.barLabel} numberOfLines={1}>
                    {cat.label.toUpperCase().slice(0, 6)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Category list */}
            <View style={styles.categoryList}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.catItem}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('RecordDetail', {
                    category: cat.dbCategory,
                    type:     'expense',
                    title:    cat.label,
                    icon:     cat.icon,
                    bg:       cat.bg,
                    color:    cat.color,
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
                      ₺{cat.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.catPercentage, { color }]}>%{cat.percentage}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#CBD5E1" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Monthly trend */}
            <View style={[styles.trendCard, { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' }]}>
              <View style={styles.trendHeader}>
                <Ionicons name="trending-up" size={18} color={color} />
                <Text style={styles.trendTitle}>Aylık Trend</Text>
              </View>
              <View style={styles.monthBars}>
                {monthlyTrend.map(b => {
                  const barHeight = Math.max((b.expense / maxTrend) * 80, b.expense > 0 ? 6 : 0);
                  return (
                    <View key={b.label} style={styles.monthBarCol}>
                      <View style={[
                        styles.monthBarFill,
                        { height: barHeight, backgroundColor: b.active ? color : '#CBD5E1' },
                      ]} />
                      <Text style={[styles.monthLabel, b.active && { color, fontWeight: '700' }]}>
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

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F6F8F8', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerBtn:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#0F172A' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  periodContainer:     { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 14, padding: 4, marginVertical: 16 },
  periodBtn:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  periodBtnActive:     { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText:       { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  periodBtnTextActive: { color: '#0F172A' },

  totalSection: { marginBottom: 24 },
  totalLabel:   { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginBottom: 4 },
  totalAmount:  { fontSize: 32, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  totalSub:     { fontSize: 12, color: '#94A3B8' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },

  barChart: { flexDirection: 'row', height: 160, alignItems: 'flex-end', gap: 8, marginBottom: 24, paddingHorizontal: 8 },
  barCol:   { flex: 1, alignItems: 'center', gap: 8, height: '100%' },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill:  { width: '100%', borderRadius: 6 },
  barLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },

  categoryList: { gap: 12, marginBottom: 24 },
  catItem:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  catIcon:      { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  catInfo:      { flex: 1 },
  catLabel:     { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 3 },
  catTx:        { fontSize: 12, color: '#94A3B8' },
  catRight:     { alignItems: 'flex-end' },
  catAmount:    { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  catPercentage:{ fontSize: 12, fontWeight: '600', marginTop: 2 },

  trendCard:    { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 8 },
  trendHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  trendTitle:   { fontSize: 14, fontWeight: 'bold', color: '#0F172A' },
  monthBars:    { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 8 },
  monthBarCol:  { flex: 1, alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  monthBarFill: { width: '100%', borderRadius: 6 },
  monthLabel:   { fontSize: 10, fontWeight: '500', color: '#94A3B8' },

  emptyState:   { alignItems: 'center', paddingVertical: 40 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 14, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});
