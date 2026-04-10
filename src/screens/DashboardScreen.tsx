import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords, processRecurringRecords } from '../services/api';
import { refreshWidgetData } from '../services/widgetDataService';
import { getCategoryStyle } from '../constants/categories';
import { formatRecordDateDisplay } from '../utils/recordDate';
import { formatMoney, formatMixedTotal } from '../utils/money';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { AppNavigation } from '../types/navigation';
import type { FinanceRecord } from '../types/record';
import type { AppTheme } from '../theme';

export default function DashboardScreen({ navigation }: { navigation: AppNavigation }) {
  const { user } = useAuth();
  const theme = useTheme();
  const [transactions, setTransactions] = useState<FinanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [listSearch, setListSearch] = useState('');

  const fetchData = useCallback(async () => {
    try {
      // Process any due recurring records silently on each focus
      processRecurringRecords().catch(() => {});
      const data = await getRecords();
      const list = Array.isArray(data) ? data : [];
      setTransactions(list);
      refreshWidgetData(list).catch(() => {});
    } catch {
      // backend unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData]),
  );

  const expenseRows    = transactions.filter(t => t.type === 'expense');
  const investmentRows = transactions.filter(t => t.type === 'investment');
  const incomeRows     = transactions.filter(t => t.type === 'income');
  const expenseTotal    = expenseRows.reduce((s, t) => s + t.amount, 0);
  const investmentTotal = investmentRows.reduce((s, t) => s + t.amount, 0);
  const incomeTotal     = incomeRows.reduce((s, t) => s + t.amount, 0);
  const netBalance      = incomeTotal - expenseTotal - investmentTotal;

  const maxVal          = Math.max(expenseTotal, investmentTotal, incomeTotal, 1);

  const listFiltered = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(t => {
      const title = String(t.title || '').toLowerCase();
      const cat = String(t.category || '').toLowerCase();
      return title.includes(q) || cat.includes(q);
    });
  }, [transactions, listSearch]);

  const renderTransaction = ({ item }: { item: FinanceRecord }) => {
    const categoryStyle = getCategoryStyle(item.category);
    const isIncome      = item.type === 'income';
    const isInvestment  = item.type === 'investment';
    const amountColor   = isIncome ? theme.income : isInvestment ? theme.investment : theme.expense;
    const badgeBg       = isIncome ? theme.incomeBg : isInvestment ? theme.investmentBg : theme.expenseBg;
    const badgeText     = isIncome ? theme.income : isInvestment ? theme.investment : theme.expense;
    const typeLabel     = isIncome ? 'Gelir' : isInvestment ? 'Yatırım' : 'Gider';
    const prefix        = isIncome ? '+' : isInvestment ? '' : '-';

    return (
      <TouchableOpacity
        style={[s(theme).txItem, theme.shadow]}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('RecordDetail', {
          category: item.category,
          type:     item.type,
          title:    item.category,
          icon:     categoryStyle.icon,
          bg:       categoryStyle.bg,
          color:    categoryStyle.color,
        })}
      >
        <View style={[s(theme).txIconBox, { backgroundColor: categoryStyle.bg }]}>
          <Ionicons name={categoryStyle.icon} size={24} color={categoryStyle.color} />
        </View>
        <View style={s(theme).txInfo}>
          <Text style={s(theme).txTitle}>{item.title}</Text>
          <Text style={s(theme).txDesc}>{item.category} • {formatRecordDateDisplay(item.date)}</Text>
        </View>
        <View style={s(theme).txRight}>
          <Text style={[s(theme).txAmount, { color: amountColor }]}>
            {prefix}{formatMoney(item.amount, item.currency)}
          </Text>
          <View style={[s(theme).typeBadge, { backgroundColor: badgeBg }]}>
            <Text style={[s(theme).typeBadgeText, { color: badgeText }]}>{typeLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s(theme).safeArea}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <FlatList
        data={listFiltered}
        keyExtractor={item => (item._id || item.id || '').toString()}
        renderItem={renderTransaction}
        contentContainerStyle={s(theme).scrollContent}
        ListEmptyComponent={
          !loading ? (
            <View style={s(theme).emptyState}>
              <Ionicons name="receipt-outline" size={56} color={theme.surfaceAlt2} />
              <Text style={s(theme).emptyText}>
                {listSearch.trim() ? 'Aramaya uygun işlem yok' : 'Henüz kayıt yok'}
              </Text>
              <Text style={s(theme).emptySubText}>
                {listSearch.trim() ? 'Farklı bir kelime dene' : '+ butonuna basarak ilk kaydını ekle'}
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={s(theme).header}>
              <View style={s(theme).headerLeft}>
                <View style={s(theme).avatar}>
                  <Text style={s(theme).avatarLetter}>
                    {user?.name ? user.name[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <View>
                  <Text style={s(theme).welcomeLabel}>Tekrar hoş geldin,</Text>
                  <Text style={s(theme).welcomeName}>{user?.name || 'Kullanıcı'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[s(theme).notifBtn, theme.shadow]}
                onPress={() => Alert.alert('Bildirimler', 'Bu özellik henüz kullanılamıyor.')}
              >
                <Ionicons name="notifications" size={22} color={theme.textSub} />
              </TouchableOpacity>
            </View>

            {/* Özet Kartı */}
            <View style={s(theme).balanceCard}>
              <View style={s(theme).balanceTop}>
                <View>
                  <Text style={s(theme).balanceLabel}>Net Bakiye</Text>
                  <Text style={s(theme).balanceAmount}>
                    {netBalance >= 0 ? '+' : '-'}{formatMixedTotal(Math.abs(netBalance), transactions)}
                  </Text>
                </View>
                <Ionicons name="stats-chart" size={28} color="rgba(255,255,255,0.75)" />
              </View>
              <View style={s(theme).balanceRow}>
                <View style={s(theme).balanceBox}>
                  <View style={s(theme).balanceBoxLabel}>
                    <Ionicons name="arrow-down-circle" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={s(theme).balanceBoxLabelText}>Gelir</Text>
                  </View>
                  <Text style={s(theme).balanceBoxAmt}>
                    {formatMixedTotal(incomeTotal, incomeRows)}
                  </Text>
                </View>
                <View style={s(theme).balanceBox}>
                  <View style={s(theme).balanceBoxLabel}>
                    <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={s(theme).balanceBoxLabelText}>Gider</Text>
                  </View>
                  <Text style={s(theme).balanceBoxAmt}>
                    {formatMixedTotal(expenseTotal, expenseRows)}
                  </Text>
                </View>
                <View style={s(theme).balanceBox}>
                  <View style={s(theme).balanceBoxLabel}>
                    <Ionicons name="trending-up" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={s(theme).balanceBoxLabelText}>Yatırım</Text>
                  </View>
                  <Text style={s(theme).balanceBoxAmt}>
                    {formatMixedTotal(investmentTotal, investmentRows)}
                  </Text>
                </View>
              </View>
              <Text style={s(theme).summaryFootnote}>
                Özetler kayıtların kendi para biriminde toplanır; kur çevrimi yapılmaz.
              </Text>
            </View>

            {/* Aylık Genel Bakış */}
            <View style={s(theme).sectionRow}>
              <Text style={s(theme).sectionTitle}>Aylık Genel Bakış</Text>
              <Text style={s(theme).sectionAction}>Bu Ay</Text>
            </View>
            <View style={[s(theme).chartCard, theme.shadow]}>
              <View style={s(theme).chartBars}>
                {[
                  { label: 'Gelir',   ratio: incomeTotal / maxVal,     color: theme.income     },
                  { label: 'Gider',   ratio: expenseTotal / maxVal,    color: theme.expense    },
                  { label: 'Yatırım', ratio: investmentTotal / maxVal, color: theme.investment },
                ].map(bar => (
                  <View key={bar.label} style={s(theme).chartBarCol}>
                    <View style={s(theme).chartBarTrack}>
                      <View style={[s(theme).chartBarFill, { height: `${Math.max(bar.ratio * 100, 5)}%`, backgroundColor: bar.color }]} />
                    </View>
                    <Text style={s(theme).chartLabel}>{bar.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Son İşlemler */}
            <View style={s(theme).sectionRow}>
              <Text style={s(theme).sectionTitle}>Son İşlemler</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RecordDetail', { title: 'Tüm Kayıtlar' })}>
                <Text style={s(theme).sectionAction}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>

            <View style={s(theme).listSearchRow}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} />
              <TextInput
                style={s(theme).listSearchInput}
                value={listSearch}
                onChangeText={setListSearch}
                placeholder="Listede ara…"
                placeholderTextColor={theme.textMuted}
                returnKeyType="search"
              />
              {listSearch.length > 0 && (
                <TouchableOpacity onPress={() => setListSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={theme.textFaint} />
                </TouchableOpacity>
              )}
            </View>

            {loading && <ActivityIndicator color={theme.primary} style={{ marginVertical: 16 }} />}
          </>
        }
      />

      <TouchableOpacity style={s(theme).fab} onPress={() => navigation.navigate('AddExpense')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = (theme: AppTheme) => StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: theme.bg },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 20 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  avatarLetter:{ fontSize: 18, fontWeight: 'bold', color: '#fff' },
  welcomeLabel:{ fontSize: 12, color: theme.textMuted, marginBottom: 2 },
  welcomeName: { fontSize: 15, fontWeight: 'bold', color: theme.text },
  notifBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.surface, justifyContent: 'center', alignItems: 'center' },

  balanceCard:         { backgroundColor: theme.primary, borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  balanceTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  balanceLabel:        { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  balanceAmount:       { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  balanceRow:          { flexDirection: 'row', gap: 8 },
  balanceBox:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10 },
  balanceBoxLabel:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  balanceBoxLabelText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500' },
  balanceBoxAmt:       { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  summaryFootnote:     { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '500', marginTop: 12, lineHeight: 14 },

  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: theme.text },
  sectionAction: { fontSize: 13, fontWeight: '600', color: theme.primary },

  listSearchRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 },
  listSearchInput:{ flex: 1, fontSize: 14, color: theme.text, padding: 0 },

  chartCard:     { backgroundColor: theme.surface, borderRadius: 16, padding: 20, marginBottom: 24 },
  chartBars:     { flexDirection: 'row', height: 120, gap: 16, alignItems: 'flex-end', justifyContent: 'space-around' },
  chartBarCol:   { flex: 1, alignItems: 'center', gap: 8, height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', backgroundColor: theme.surfaceAlt, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill:  { width: '100%', borderRadius: 8 },
  chartLabel:    { fontSize: 11, fontWeight: '600', color: theme.textMuted },

  txItem:    { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  txIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txInfo:    { flex: 1 },
  txTitle:   { fontSize: 14, fontWeight: 'bold', color: theme.text, marginBottom: 3 },
  txDesc:    { fontSize: 12, color: theme.textMuted },
  txRight:   { alignItems: 'flex-end', gap: 4 },
  txAmount:  { fontSize: 15, fontWeight: 'bold' },
  typeBadge:     { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },

  fab: { position: 'absolute', right: 24, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  emptyState:   { alignItems: 'center', paddingVertical: 40 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: theme.textMuted, marginTop: 14, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: theme.textFaint, textAlign: 'center' },
});
