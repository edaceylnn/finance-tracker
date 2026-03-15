import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getRecords } from '../services/api';
import { getCategoryStyle } from '../constants/categories';
import { useAuth } from '../context/AuthContext';

const FALLBACK_TRANSACTIONS = [];


export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState(FALLBACK_TRANSACTIONS);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const data = await getRecords();
      setTransactions(Array.isArray(data) ? data : []);
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

  const expenseTotal   = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const investmentTotal = transactions.filter(t => t.type === 'investment').reduce((s, t) => s + t.amount, 0);
  const totalOutflow   = expenseTotal + investmentTotal;

  const maxVal = Math.max(expenseTotal, investmentTotal, 1);
  const expenseRatio   = expenseTotal   / maxVal;
  const investmentRatio = investmentTotal / maxVal;

  const renderTransaction = ({ item }) => {
    const categoryStyle = getCategoryStyle(item.category);
    const isInvestment  = item.type === 'investment';
    return (
      <TouchableOpacity
        style={styles.txItem}
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
        <View style={[styles.txIconBox, { backgroundColor: categoryStyle.bg }]}>
          <Ionicons name={categoryStyle.icon} size={24} color={categoryStyle.color} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{item.title}</Text>
          <Text style={styles.txDesc}>{item.category} • {item.date}</Text>
        </View>
        <View style={styles.txRight}>
          <Text style={isInvestment ? styles.amountInvestment : styles.amountExpense}>
            {isInvestment ? '' : '-'}₺{Number(item.amount).toFixed(2)}
          </Text>
          <View style={[styles.typeBadge, isInvestment ? styles.badgeInvestment : styles.badgeExpense]}>
            <Text style={[styles.typeBadgeText, isInvestment ? styles.badgeInvestmentText : styles.badgeExpenseText]}>
              {isInvestment ? 'Yatırım' : 'Gider'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F6F8F8" />
      <FlatList
        data={transactions}
        keyExtractor={item => (item._id || item.id || '').toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.scrollContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={56} color="#E2E8F0" />
              <Text style={styles.emptyText}>Henüz kayıt yok</Text>
              <Text style={styles.emptySubText}>+ butonuna basarak ilk kaydını ekle</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>
                    {user?.name ? user.name[0].toUpperCase() : '?'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.welcomeLabel}>Tekrar hoş geldin,</Text>
                  <Text style={styles.welcomeName}>{user?.name || 'Kullanıcı'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.notifBtn}>
                <Ionicons name="notifications" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Özet Kartı */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceTop}>
                <View>
                  <Text style={styles.balanceLabel}>Toplam Çıkış</Text>
                  <Text style={styles.balanceAmount}>
                    ₺{totalOutflow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <Ionicons name="stats-chart" size={28} color="rgba(255,255,255,0.75)" />
              </View>
              <View style={styles.balanceRow}>
                <View style={styles.balanceBox}>
                  <View style={styles.balanceBoxLabel}>
                    <Ionicons name="arrow-up" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.balanceBoxLabelText}>Gider</Text>
                  </View>
                  <Text style={styles.balanceBoxAmt}>
                    ₺{expenseTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.balanceBox}>
                  <View style={styles.balanceBoxLabel}>
                    <Ionicons name="trending-up" size={14} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.balanceBoxLabelText}>Yatırım</Text>
                  </View>
                  <Text style={styles.balanceBoxAmt}>
                    ₺{investmentTotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Aylık Genel Bakış */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Aylık Genel Bakış</Text>
              <Text style={styles.sectionAction}>Bu Ay</Text>
            </View>
            <View style={styles.chartCard}>
              <View style={styles.chartBars}>
                <View style={styles.chartBarCol}>
                  <View style={styles.chartBarTrack}>
                    <View style={[styles.chartBarFill, { height: `${Math.max(expenseRatio * 100, 5)}%`, backgroundColor: '#EF4444' }]} />
                  </View>
                  <Text style={styles.chartLabel}>Gider</Text>
                </View>
                <View style={styles.chartBarCol}>
                  <View style={styles.chartBarTrack}>
                    <View style={[styles.chartBarFill, { height: `${Math.max(investmentRatio * 100, 5)}%`, backgroundColor: '#11c4d4' }]} />
                  </View>
                  <Text style={styles.chartLabel}>Yatırım</Text>
                </View>
              </View>
            </View>

            {/* Son İşlemler */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionTitle}>Son İşlemler</Text>
              <TouchableOpacity onPress={() => navigation.navigate('RecordDetail', { title: 'Tüm Kayıtlar' })}>
                <Text style={styles.sectionAction}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>

            {loading && <ActivityIndicator color="#11c4d4" style={{ marginVertical: 16 }} />}
          </>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddExpense')}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:       { flex: 1, backgroundColor: '#F6F8F8' },
  scrollContent:  { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 20 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, backgroundColor: '#11c4d4', justifyContent: 'center', alignItems: 'center' },
  avatarLetter:  { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  welcomeLabel:{ fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  welcomeName: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  notifBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },

  // Özet Kartı
  balanceCard:         { backgroundColor: '#11c4d4', borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: '#11c4d4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  balanceTop:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  balanceLabel:        { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  balanceAmount:       { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  balanceRow:          { flexDirection: 'row', gap: 12 },
  balanceBox:          { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
  balanceBoxLabel:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  balanceBoxLabelText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
  balanceBoxAmt:       { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Bölümler
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:  { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  sectionAction: { fontSize: 13, fontWeight: '600', color: '#11c4d4' },

  // Grafik
  chartCard:     { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chartBars:     { flexDirection: 'row', height: 120, gap: 16, alignItems: 'flex-end', justifyContent: 'space-around' },
  chartBarCol:   { flex: 1, alignItems: 'center', gap: 8, height: '100%' },
  chartBarTrack: { flex: 1, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBarFill:  { width: '100%', borderRadius: 8 },
  chartLabel:    { fontSize: 11, fontWeight: '600', color: '#94A3B8' },

  // İşlemler
  txItem:               { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  txIconBox:            { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  txInfo:               { flex: 1 },
  txTitle:              { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 3 },
  txDesc:               { fontSize: 12, color: '#94A3B8' },
  txRight:              { alignItems: 'flex-end', gap: 4 },
  amountExpense:        { fontSize: 15, fontWeight: 'bold', color: '#DC2626' },
  amountInvestment:     { fontSize: 15, fontWeight: 'bold', color: '#11c4d4' },
  typeBadge:            { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeExpense:         { backgroundColor: '#FEE2E2' },
  badgeInvestment:      { backgroundColor: '#E0F7FA' },
  typeBadgeText:        { fontSize: 10, fontWeight: '700' },
  badgeExpenseText:     { color: '#DC2626' },
  badgeInvestmentText:  { color: '#0891B2' },

  // FAB
  fab: { position: 'absolute', right: 24, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: '#11c4d4', justifyContent: 'center', alignItems: 'center', shadowColor: '#11c4d4', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  // Empty state
  emptyState:   { alignItems: 'center', paddingVertical: 40 },
  emptyText:    { fontSize: 15, fontWeight: '600', color: '#94A3B8', marginTop: 14, marginBottom: 6 },
  emptySubText: { fontSize: 12, color: '#CBD5E1', textAlign: 'center' },
});
